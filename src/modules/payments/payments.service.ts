import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
} from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import {
  Order,
  OrderPaymentStatus,
  PaymentType,
} from '../orders/entities/order.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaymentMethod as TransactionPaymentMethod,
} from '../finance/entities/transaction.entity';
import { PaymentGatewayService } from './gateways/payment-gateway.interface';
import { TenantsService } from '../tenants/tenants.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { getTenantId, tenantStorage } from '../tenants/tenant.context';
import { decryptSecret } from '../../common/crypto.util';
import { NotificationsService } from '../notifications/services/notifications.service';
import { NotificationEvent } from '../notifications/entities/notification-template.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly gateway: PaymentGatewayService,
    private readonly tenantsService: TenantsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private gatewayCredentials(tenant: Tenant) {
    if (!tenant.sslcommerzStoreId || !tenant.sslcommerzStorePassword) {
      throw new BadRequestException(
        'Online payments are not configured for this store',
      );
    }
    return {
      storeId: tenant.sslcommerzStoreId,
      storePassword: decryptSecret(tenant.sslcommerzStorePassword),
    };
  }

  // Creates a pending Payment and an SSLCommerz session; returns the
  // hosted-checkout URL the storefront should redirect the customer to.
  async initiateOnlinePayment(
    userId: string,
    orderId: string,
    customer: { name?: string; email?: string; phone?: string },
  ): Promise<{ redirectUrl: string; paymentId: string }> {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context not resolved');
    }
    const tenant = await this.tenantsService.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    const credentials = this.gatewayCredentials(tenant);

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new BadRequestException('Order does not belong to user');
    }
    if (order.isPaid) {
      throw new BadRequestException('Order is already paid');
    }
    if (order.paymentType === PaymentType.COD) {
      throw new BadRequestException(
        'This order is cash-on-delivery; no online payment is required',
      );
    }

    const payment = this.paymentRepository.create({
      userId,
      orderId: order.id,
      amount: order.totalAmount,
      status: PaymentStatus.PENDING,
      method: PaymentMethod.SSLCOMMERZ,
    });
    const saved = await this.paymentRepository.save(payment);

    const transactionId = `TXN-${saved.id}`;
    saved.transactionId = transactionId;
    await this.paymentRepository.save(saved);

    const apiBase =
      process.env.API_PUBLIC_URL ||
      `http://localhost:${process.env.PORT || 3000}/api/v1`;
    const callbackBase = `${apiBase}/payments/callback`;
    const qs = `tenant=${encodeURIComponent(tenant.slug)}&tran_id=${encodeURIComponent(transactionId)}`;

    const result = await this.gateway.initiatePayment(credentials, {
      amount: Number(order.totalAmount),
      currency: 'BDT',
      transactionId,
      orderId: order.id,
      productName: `Order ${order.id.slice(0, 8)}`,
      customer: {
        name: customer.name || 'Customer',
        email: customer.email || 'customer@example.com',
        phone: customer.phone || 'N/A',
        address: order.shippingAddress || 'N/A',
      },
      urls: {
        success: `${callbackBase}/success?${qs}`,
        fail: `${callbackBase}/fail?${qs}`,
        cancel: `${callbackBase}/cancel?${qs}`,
        ipn: `${apiBase}/payments/ipn?tenant=${encodeURIComponent(tenant.slug)}`,
      },
    });

    return { redirectUrl: result.redirectUrl, paymentId: saved.id };
  }

  // IPN/callback processing. Gateways post here without tenant headers, so
  // the tenant is carried in the callback URL and we re-enter its context
  // explicitly. Validation always uses that tenant's own credentials, so a
  // payload for tenant A can never be confirmed with tenant B's keys.
  async processGatewayNotification(
    tenantSlug: string,
    payload: Record<string, string>,
  ): Promise<{ status: string }> {
    const tenant = await this.tenantsService.findBySlug(tenantSlug);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenantStorage.run(
      { tenantId: tenant.id, slug: tenant.slug },
      async () => {
        const tranId = payload.tran_id;
        if (!tranId) {
          throw new BadRequestException('Missing tran_id');
        }

        const payment = await this.paymentRepository.findOne({
          where: { transactionId: tranId, tenantId: tenant.id },
        });
        if (!payment) {
          throw new NotFoundException('Payment not found');
        }
        if (payment.status === PaymentStatus.COMPLETED) {
          return { status: 'already-processed' };
        }

        const credentials = this.gatewayCredentials(tenant);
        const validation = await this.gateway.validatePayment(
          credentials,
          payload,
        );

        if (validation.valid && validation.status === 'paid') {
          if (
            validation.amount !== undefined &&
            Math.abs(validation.amount - Number(payment.amount)) > 0.01
          ) {
            payment.status = PaymentStatus.FAILED;
            payment.errorMessage = 'Amount mismatch on gateway validation';
            await this.paymentRepository.save(payment);
            return { status: 'amount-mismatch' };
          }

          payment.status = PaymentStatus.COMPLETED;
          payment.completedAt = new Date();
          payment.paymentDetails = validation.raw ?? {};
          if (validation.gatewayTransactionId) {
            payment.metadata = {
              ...payment.metadata,
              gatewayTransactionId: validation.gatewayTransactionId,
            };
          }
          await this.paymentRepository.save(payment);

          const order = await this.orderRepository.findOne({
            where: { id: payment.orderId },
          });
          if (order) {
            order.isPaid = true;
            order.paymentStatus = OrderPaymentStatus.PAID;
            order.paymentId = payment.id;
            order.paymentMethod = 'sslcommerz';
            await this.orderRepository.save(order);

            await this.notificationsService.sendWhatsAppEvent(
              order.tenantId,
              NotificationEvent.PAYMENT_CONFIRMED,
              order.metadata?.recipientPhone,
              {
                orderId: order.id.slice(0, 8),
                storeName: tenant.name,
                amount: Number(order.totalAmount),
                trackingCode: order.trackingNumber ?? '',
              },
            );
          }

          const transaction = this.transactionRepository.create({
            amount: payment.amount,
            type: TransactionType.CREDIT,
            status: TransactionStatus.COMPLETED,
            method: TransactionPaymentMethod.SSLCOMMERZ,
            userId: payment.userId,
            orderId: payment.orderId,
            description: `SSLCommerz payment for order ${payment.orderId}`,
            gatewayTransactionId: validation.gatewayTransactionId,
            referenceNumber: tranId,
          });
          await this.transactionRepository.save(transaction);

          return { status: 'paid' };
        }

        if (validation.status === 'failed') {
          payment.status = PaymentStatus.FAILED;
          payment.errorMessage = 'Gateway reported failure';
          await this.paymentRepository.save(payment);
          const order = await this.orderRepository.findOne({
            where: { id: payment.orderId },
          });
          if (order) {
            order.paymentStatus = OrderPaymentStatus.FAILED;
            await this.orderRepository.save(order);
          }
          return { status: 'failed' };
        }

        if (validation.status === 'cancelled') {
          payment.status = PaymentStatus.CANCELLED;
          await this.paymentRepository.save(payment);
          return { status: 'cancelled' };
        }

        return { status: 'ignored' };
      },
    );
  }

  async create(
    userId: string,
    createPaymentDto: CreatePaymentDto,
  ): Promise<Payment> {
    const order = await this.orderRepository.findOne({
      where: { id: createPaymentDto.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new BadRequestException('Order does not belong to user');
    }

    const payment = this.paymentRepository.create({
      ...createPaymentDto,
      userId,
      status: PaymentStatus.PENDING,
    });

    // TODO: Integrate with actual payment gateway
    try {
      // Simulate payment processing
      const result = await this.processPayment(payment);
      payment.status = PaymentStatus.COMPLETED;
      payment.transactionId = result.transactionId;
      payment.completedAt = new Date();
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      payment.errorMessage = error.message;
      throw new BadRequestException('Payment processing failed');
    }

    return this.paymentRepository.save(payment);
  }

  private async processPayment(
    payment: Payment,
  ): Promise<{ transactionId: string }> {
    // Simulate payment gateway integration
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (Math.random() > 0.9) {
      // 10% chance of failure
      throw new Error('Payment gateway error');
    }

    return {
      transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  async findAll(userId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { userId },
      relations: ['order'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id, userId },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async refund(
    userId: string,
    id: string,
    refundDto: RefundPaymentDto,
  ): Promise<Payment> {
    const payment = await this.findOne(userId, id);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment cannot be refunded');
    }

    if (refundDto.amount > payment.amount) {
      throw new BadRequestException(
        'Refund amount cannot exceed payment amount',
      );
    }

    // TODO: Integrate with actual payment gateway for refund
    try {
      // Simulate refund processing
      const result = await this.processRefund(payment, refundDto);
      payment.status = PaymentStatus.REFUNDED;
      payment.refundId = result.refundId;
      payment.refundAmount = refundDto.amount;
      payment.metadata = {
        ...payment.metadata,
        refundReason: refundDto.reason,
        refundMetadata: refundDto.metadata,
      };
    } catch (error) {
      throw new BadRequestException('Refund processing failed');
    }

    return this.paymentRepository.save(payment);
  }

  private async processRefund(
    payment: Payment,
    refundDto: RefundPaymentDto,
  ): Promise<{ refundId: string }> {
    // Simulate refund gateway integration
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (Math.random() > 0.9) {
      // 10% chance of failure
      throw new Error('Refund gateway error');
    }

    return {
      refundId: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  async getPaymentStats(userId: string): Promise<{
    totalAmount: number;
    completedPayments: number;
    failedPayments: number;
    refundedAmount: number;
  }> {
    const payments = await this.paymentRepository.find({
      where: { userId },
    });

    return {
      totalAmount: payments
        .filter((p) => p.status === PaymentStatus.COMPLETED)
        .reduce((sum, p) => sum + Number(p.amount), 0),
      completedPayments: payments.filter(
        (p) => p.status === PaymentStatus.COMPLETED,
      ).length,
      failedPayments: payments.filter((p) => p.status === PaymentStatus.FAILED)
        .length,
      refundedAmount: payments
        .filter((p) => p.status === PaymentStatus.REFUNDED)
        .reduce((sum, p) => sum + Number(p.refundAmount || 0), 0),
    };
  }
}
