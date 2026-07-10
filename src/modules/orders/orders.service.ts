import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Order,
  OrderStatus,
  OrderItem,
  PaymentType,
  OrderPaymentStatus,
} from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaymentMethod as TransactionPaymentMethod,
} from '../finance/entities/transaction.entity';
import { CourierService } from '../couriers/courier.interface';
import { NotificationsService } from '../notifications/services/notifications.service';
import { NotificationEvent } from '../notifications/entities/notification-template.entity';
import { TenantsService } from '../tenants/tenants.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { getTenantId } from '../tenants/tenant.context';
import { decryptSecret } from '../../common/crypto.util';
import { Logger } from '@nestjs/common';

import { Cart, CartStatus } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Address } from '../users/entities/address.entity';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly courier: CourierService,
    private readonly tenantsService: TenantsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async notifyOrderEvent(
    order: Order,
    event: NotificationEvent,
    extra: Record<string, string | number> = {},
  ) {
    const tenant = await this.tenantsService.findById(order.tenantId);
    await this.notificationsService.sendWhatsAppEvent(
      order.tenantId,
      event,
      order.metadata?.recipientPhone,
      {
        orderId: order.id.slice(0, 8),
        storeName: tenant?.name ?? 'our store',
        amount: Number(order.totalAmount),
        trackingCode: order.trackingNumber ?? '',
        ...extra,
      },
    );
  }

  private courierCredentials(tenant: Tenant) {
    if (!tenant.steadfastApiKey || !tenant.steadfastSecretKey) {
      throw new BadRequestException(
        'Courier delivery is not configured for this store',
      );
    }
    return {
      apiKey: decryptSecret(tenant.steadfastApiKey),
      secretKey: decryptSecret(tenant.steadfastSecretKey),
    };
  }

  private async currentTenant(): Promise<Tenant> {
    const tenantId = getTenantId();
    const tenant = tenantId
      ? await this.tenantsService.findById(tenantId)
      : null;
    if (!tenant) {
      throw new BadRequestException('Tenant context not resolved');
    }
    return tenant;
  }

  // Creates the courier consignment for a confirmed order. COD amount is
  // the order total for COD orders, 0 for prepaid ones.
  async dispatchToCourier(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    if (order.consignmentId) {
      throw new BadRequestException('Order already has a consignment');
    }
    if (!order.shippingAddress) {
      throw new BadRequestException(
        'Order has no shipping address to dispatch to',
      );
    }

    const tenant = await this.currentTenant();
    const credentials = this.courierCredentials(tenant);

    const result = await this.courier.createConsignment(credentials, {
      invoice: order.id,
      recipientName: order.metadata?.recipientName || 'Customer',
      recipientPhone: order.metadata?.recipientPhone || 'N/A',
      recipientAddress: order.shippingAddress,
      codAmount:
        order.paymentType === PaymentType.COD ? Number(order.totalAmount) : 0,
    });

    order.courierProvider = tenant.activeCourier || 'steadfast';
    order.consignmentId = result.consignmentId;
    order.trackingNumber = result.trackingCode || order.trackingNumber;
    order.trackingStatus = result.status;
    if (order.status === OrderStatus.PENDING) {
      order.status = OrderStatus.CONFIRMED;
    }
    return this.orderRepository.save(order);
  }

  // Pull-based tracking refresh (Steadfast webhooks are account-dependent;
  // the status API is always available). On delivery, a COD order's payment
  // transitions cod_pending -> cod_collected and its pending finance
  // transaction completes.
  async refreshTrackingStatus(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    if (!order.consignmentId) {
      throw new BadRequestException('Order has no consignment to track');
    }

    const tenant = await this.currentTenant();
    const credentials = this.courierCredentials(tenant);

    const tracking = await this.courier.getTrackingStatus(
      credentials,
      order.consignmentId,
    );
    order.trackingStatus = tracking.status;

    if (tracking.delivered) {
      order.status = OrderStatus.DELIVERED;
      if (
        order.paymentType === PaymentType.COD &&
        order.paymentStatus !== OrderPaymentStatus.COD_COLLECTED
      ) {
        order.paymentStatus = OrderPaymentStatus.COD_COLLECTED;
        order.isPaid = true;

        const pendingTxn = await this.transactionRepository.findOne({
          where: {
            orderId: order.id,
            method: TransactionPaymentMethod.COD,
            status: TransactionStatus.PENDING,
          },
        });
        if (pendingTxn) {
          pendingTxn.status = TransactionStatus.COMPLETED;
          pendingTxn.description = `COD collected by courier for order ${order.id}`;
          await this.transactionRepository.save(pendingTxn);
        } else {
          this.logger.warn(
            `No pending COD transaction found for delivered order ${order.id}`,
          );
        }
      }
      await this.notifyOrderEvent(order, NotificationEvent.ORDER_DELIVERED);
    } else if (
      !tracking.cancelled &&
      tracking.status !== 'in_review' &&
      (order.status === OrderStatus.CONFIRMED ||
        order.status === OrderStatus.PROCESSING)
    ) {
      // Consignment moving through the courier network implies shipped;
      // in_review means Steadfast hasn't picked it up yet.
      order.status = OrderStatus.SHIPPED;
      await this.notifyOrderEvent(order, NotificationEvent.ORDER_SHIPPED);
    }

    return this.orderRepository.save(order);
  }

  async create(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const order = new Order();
    order.userId = userId;
    order.shippingAddress = createOrderDto.shippingAddress || '';
    order.billingAddress = createOrderDto.billingAddress || '';
    order.paymentMethod = createOrderDto.paymentMethod || 'pending';
    order.paymentType = createOrderDto.paymentType || PaymentType.COD;
    // COD orders never touch a gateway: they start as cod_pending and move
    // to cod_collected when the courier remits (wired in the courier step).
    order.paymentStatus =
      order.paymentType === PaymentType.COD
        ? OrderPaymentStatus.COD_PENDING
        : OrderPaymentStatus.PENDING;

    // Capture the recipient contact for order-lifecycle notifications
    // (WhatsApp). Without this, notifyOrderEvent has no phone to send to.
    if (createOrderDto.recipientPhone || createOrderDto.recipientName) {
      order.metadata = {
        ...(order.metadata ?? {}),
        recipientPhone: createOrderDto.recipientPhone,
        recipientName: createOrderDto.recipientName,
      };
    }

    // Calculate total and validate products
    let totalAmount = 0;
    const orderItems: OrderItem[] = [];

    for (const item of createOrderDto.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      });
      if (!product) {
        throw new NotFoundException(
          `Product with ID ${item.productId} not found`,
        );
      }

      if (item.variantId) {
        const variant = await this.variantRepository.findOne({
          where: { id: item.variantId, productId: product.id },
        });
        if (!variant) {
          throw new NotFoundException(
            `Variant with ID ${item.variantId} not found for product ${product.name}`,
          );
        }

        if (variant.stockQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.name} (${Object.values(
              variant.attributes,
            ).join(', ')})`,
          );
        }

        const price = variant.priceOverride ?? product.price;
        const subtotal = price * item.quantity;
        totalAmount += subtotal;

        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          price,
          name: product.name,
          subtotal,
          variantId: variant.id,
          variantAttributes: variant.attributes,
        });

        // Deduct the variant's stock only — product.stockQuantity is
        // untouched for variant line items.
        variant.stockQuantity -= item.quantity;
        await this.variantRepository.save(variant);
      } else {
        if (product.stockQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.name}`,
          );
        }

        const subtotal = product.price * item.quantity;
        totalAmount += subtotal;

        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
          name: product.name,
          subtotal,
        });

        // Update product stock
        product.stockQuantity -= item.quantity;
        await this.productRepository.save(product);
      }
    }

    order.items = orderItems;
    order.totalAmount = totalAmount;

    const savedOrder = await this.orderRepository.save(order);

    // COD gets its finance ledger entry up front (pending until the courier
    // remits); online orders get theirs when the gateway confirms payment.
    if (savedOrder.paymentType === PaymentType.COD) {
      const transaction = this.transactionRepository.create({
        amount: savedOrder.totalAmount,
        type: TransactionType.CREDIT,
        status: TransactionStatus.PENDING,
        method: TransactionPaymentMethod.COD,
        userId: savedOrder.userId,
        orderId: savedOrder.id,
        description: `COD order ${savedOrder.id} awaiting collection`,
      });
      await this.transactionRepository.save(transaction);
    }

    await this.notifyOrderEvent(savedOrder, NotificationEvent.ORDER_PLACED);

    return savedOrder;
  }

  async findAll(userId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id, userId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async update(
    userId: string,
    id: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<Order> {
    const order = await this.findOne(userId, id);

    // Only allow updates if order is not delivered or cancelled
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot update order with status ${order.status}`,
      );
    }

    Object.assign(order, updateOrderDto);
    return this.orderRepository.save(order);
  }

  async cancel(userId: string, id: string): Promise<Order> {
    const order = await this.findOne(userId, id);

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}`,
      );
    }

    // Restore stock to the exact source it was deducted from
    for (const item of order.items) {
      if (item.variantId) {
        const variant = await this.variantRepository.findOne({
          where: { id: item.variantId, productId: item.productId },
        });
        if (variant) {
          variant.stockQuantity += item.quantity;
          await this.variantRepository.save(variant);
        }
      } else {
        const product = await this.productRepository.findOne({
          where: { id: item.productId },
        });
        if (product) {
          product.stockQuantity += item.quantity;
          await this.productRepository.save(product);
        }
      }
    }

    order.status = OrderStatus.CANCELLED;
    return this.orderRepository.save(order);
  }

  async findUserOrderStats(userId: string) {
    const orders = await this.orderRepository.find({ where: { userId } });

    return {
      totalOrders: orders.length,
      totalSpent: orders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0,
      ),
      pendingOrders: orders.filter(
        (order) => order.status === OrderStatus.PENDING,
      ).length,
      deliveredOrders: orders.filter(
        (order) => order.status === OrderStatus.DELIVERED,
      ).length,
    };
  }

  private formatAddress(address: Address): string {
    const parts = [
      `${address.firstName} ${address.lastName}`,
      address.addressLine1,
      address.addressLine2,
      `${address.city}${address.state ? `, ${address.state}` : ''}${address.postalCode ? ` ${address.postalCode}` : ''}`,
      address.country,
      `Phone: ${address.phoneNumber}`,
    ].filter(Boolean);
    return parts.join('\n');
  }

  async createOrderFromCart(
    userId: string,
    cartId: string,
    addressId: string,
    paymentMethod: 'sslcommerz' | 'cod',
  ): Promise<Order> {
    const cart = await this.cartRepository.findOne({
      where: { id: cartId, userId, status: CartStatus.ACTIVE },
      relations: ['items', 'items.product'],
    });
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty or not found');
    }

    const address = await this.addressRepository.findOne({
      where: { id: addressId, userId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    const formattedAddress = this.formatAddress(address);

    const order = new Order();
    order.userId = userId;
    order.tenantId = cart.tenantId;
    order.shippingAddress = formattedAddress;
    order.billingAddress = formattedAddress;
    order.status = OrderStatus.PENDING;
    order.paymentMethod = paymentMethod;
    order.paymentType = paymentMethod === 'cod' ? PaymentType.COD : PaymentType.ONLINE;
    order.paymentStatus = paymentMethod === 'cod' ? OrderPaymentStatus.COD_PENDING : OrderPaymentStatus.PENDING;

    order.metadata = {
      recipientName: `${address.firstName} ${address.lastName}`,
      recipientPhone: address.phoneNumber,
    };

    let subtotal = 0;
    const orderItems: OrderItem[] = [];

    for (const item of cart.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      });
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      let price = product.price;
      let variantAttrs: Record<string, string> | undefined;

      if (item.variantId) {
        const variant = await this.variantRepository.findOne({
          where: { id: item.variantId },
        });
        if (!variant) {
          throw new NotFoundException(`Variant ${item.variantId} not found`);
        }
        if (variant.stockQuantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for variant ${variant.sku}`);
        }
        variant.stockQuantity -= item.quantity;
        await this.variantRepository.save(variant);
        price = variant.priceOverride ?? product.price;
        variantAttrs = variant.attributes;
      } else {
        if (product.stockQuantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for product ${product.name}`);
        }
        product.stockQuantity -= item.quantity;
        await this.productRepository.save(product);
      }

      const itemSubtotal = price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price,
        name: product.name,
        subtotal: itemSubtotal,
        variantId: item.variantId || undefined,
        variantAttributes: variantAttrs,
      });
    }

    order.items = orderItems;
    order.subtotal = subtotal;
    order.shippingCost = 100;
    order.totalAmount = subtotal + order.shippingCost;

    const savedOrder = await this.orderRepository.save(order);

    if (savedOrder.paymentType === PaymentType.COD) {
      const transaction = this.transactionRepository.create({
        amount: savedOrder.totalAmount,
        type: TransactionType.CREDIT,
        status: TransactionStatus.PENDING,
        method: TransactionPaymentMethod.COD,
        userId: savedOrder.userId,
        orderId: savedOrder.id,
        description: `COD order ${savedOrder.id} awaiting collection`,
      });
      await this.transactionRepository.save(transaction);
      
      savedOrder.status = OrderStatus.PROCESSING;
      await this.orderRepository.save(savedOrder);

      try {
        const dispatchedOrder = await this.dispatchToCourier(savedOrder.id);
        Object.assign(savedOrder, dispatchedOrder);
      } catch (err) {
        this.logger.error(`Failed to auto-dispatch COD order ${savedOrder.id} to courier: ${err.message}`);
      }
    }

    await this.cartItemRepository.remove(cart.items);
    cart.subtotal = 0;
    cart.tax = 0;
    cart.total = 0;
    await this.cartRepository.save(cart);

    await this.notifyOrderEvent(savedOrder, NotificationEvent.ORDER_PLACED);

    return savedOrder;
  }
}
