import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientGrpc, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { v4 as uuidv4 } from 'uuid';
import { PaymentEntity } from '../entities/payment.entity';
import { RefundEntity } from '../entities/refund.entity';
import {
    ProcessPaymentRequest,
    ProcessPaymentResponse,
    GetPaymentRequest,
    GetPaymentResponse,
    RefundPaymentRequest,
    RefundPaymentResponse,
    ListPaymentsRequest,
    ListPaymentsResponse,
    Payment,
    PaymentStatus,
} from '../proto/payment';
import {
    OrderServiceClient,
    ORDER_SERVICE_NAME,
    OrderStatus,
} from '../proto/order';

@Injectable()
export class PaymentService implements OnModuleInit {
    private orderService: OrderServiceClient;

    constructor(
        @InjectRepository(PaymentEntity)
        private paymentRepository: Repository<PaymentEntity>,
        @InjectRepository(RefundEntity)
        private refundRepository: Repository<RefundEntity>,
        @Inject('ORDER_PACKAGE')
        private orderClient: ClientGrpc,
    ) { }

    onModuleInit() {
        this.orderService = this.orderClient.getService<OrderServiceClient>(ORDER_SERVICE_NAME);
    }

    async processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResponse> {
        try {
            // Validate order via gRPC call to Order Service
            const orderResponse = await new Promise((resolve, reject) => {
                this.orderService.getOrder({ orderId: request.orderId }).subscribe({
                    next: resolve,
                    error: reject,
                });
            });

            const order = (orderResponse as any).order;
            if (!order) {
                throw new RpcException({
                    code: status.NOT_FOUND,
                    message: 'Order not found',
                });
            }

            // Verify order belongs to user
            if (order.userId !== request.userId) {
                throw new RpcException({
                    code: status.PERMISSION_DENIED,
                    message: 'Order does not belong to user',
                });
            }

            // Verify order amount matches
            if (Math.abs(order.totalAmount - request.amount) > 0.01) {
                throw new RpcException({
                    code: status.INVALID_ARGUMENT,
                    message: 'Payment amount does not match order total',
                });
            }

            // Check if order is in valid state for payment
            if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
                throw new RpcException({
                    code: status.FAILED_PRECONDITION,
                    message: 'Order is not in a valid state for payment',
                });
            }

            // Create payment record
            const payment = this.paymentRepository.create({
                orderId: request.orderId,
                userId: request.userId,
                amount: request.amount,
                status: 'processing',
                paymentMethod: this.mapPaymentMethod(request.paymentMethod),
                transactionId: uuidv4(), // Simulate transaction ID
            });

            const savedPayment = await this.paymentRepository.save(payment);

            // Simulate payment processing
            savedPayment.status = 'completed';
            await this.paymentRepository.save(savedPayment);

            // Notify Order Service to update order status
            await new Promise((resolve, reject) => {
                this.orderService.updateOrderStatus({
                    orderId: request.orderId,
                    status: OrderStatus.CONFIRMED,
                }).subscribe({
                    next: resolve,
                    error: reject,
                });
            });

            return {
                payment: this.mapToPaymentProto(savedPayment),
            };
        } catch (error) {
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                code: status.INTERNAL,
                message: `Failed to process payment: ${error.message}`,
            });
        }
    }

    async getPayment(request: GetPaymentRequest): Promise<GetPaymentResponse> {
        try {
            const payment = await this.paymentRepository.findOne({
                where: { id: request.paymentId },
            });

            if (!payment) {
                throw new RpcException({
                    code: status.NOT_FOUND,
                    message: 'Payment not found',
                });
            }

            return {
                payment: this.mapToPaymentProto(payment),
            };
        } catch (error) {
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                code: status.INTERNAL,
                message: `Failed to get payment: ${error.message}`,
            });
        }
    }

    async refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResponse> {
        try {
            // Find the payment
            const payment = await this.paymentRepository.findOne({
                where: { id: request.paymentId },
                relations: ['refunds'],
            });

            if (!payment) {
                throw new RpcException({
                    code: status.NOT_FOUND,
                    message: 'Payment not found',
                });
            }

            // Validate payment is eligible for refund
            if (payment.status !== 'completed') {
                throw new RpcException({
                    code: status.FAILED_PRECONDITION,
                    message: 'Payment is not in a valid state for refund',
                });
            }

            // Calculate total refunded amount
            const totalRefunded = payment.refunds?.reduce((sum, refund) => sum + Number(refund.amount), 0) || 0;
            const remainingAmount = Number(payment.amount) - totalRefunded;

            if (request.amount > remainingAmount) {
                throw new RpcException({
                    code: status.INVALID_ARGUMENT,
                    message: 'Refund amount exceeds remaining payment amount',
                });
            }

            // Create refund record
            const refund = this.refundRepository.create({
                paymentId: payment.id,
                amount: request.amount,
                reason: request.reason,
                status: 'completed',
            });

            await this.refundRepository.save(refund);

            // Update payment status if fully refunded
            if (request.amount >= remainingAmount) {
                payment.status = 'refunded';
                await this.paymentRepository.save(payment);

                // Notify Order Service to update order status
                await new Promise((resolve, reject) => {
                    this.orderService.updateOrderStatus({
                        orderId: payment.orderId,
                        status: OrderStatus.CANCELLED,
                    }).subscribe({
                        next: resolve,
                        error: reject,
                    });
                });
            }

            return {
                payment: this.mapToPaymentProto(payment),
            };
        } catch (error) {
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                code: status.INTERNAL,
                message: `Failed to process refund: ${error.message}`,
            });
        }
    }

    async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
        try {
            const page = request.page || 1;
            const pageSize = request.pageSize || 10;
            const skip = (page - 1) * pageSize;

            const [payments, total] = await this.paymentRepository.findAndCount({
                where: { userId: request.userId },
                skip,
                take: pageSize,
                order: { createdAt: 'DESC' },
            });

            return {
                payments: payments.map(p => this.mapToPaymentProto(p)),
                total,
            };
        } catch (error) {
            throw new RpcException({
                code: status.INTERNAL,
                message: `Failed to list payments: ${error.message}`,
            });
        }
    }

    private mapToPaymentProto(payment: PaymentEntity): Payment {
        return {
            paymentId: payment.id,
            orderId: payment.orderId,
            userId: payment.userId,
            amount: Number(payment.amount),
            status: this.mapPaymentStatus(payment.status),
            paymentMethod: this.mapPaymentMethodToEnum(payment.paymentMethod),
            transactionId: payment.transactionId || '',
            createdAt: payment.createdAt.getTime(),
            updatedAt: payment.updatedAt.getTime(),
        };
    }

    private mapPaymentStatus(status: string): PaymentStatus {
        const statusMap: { [key: string]: PaymentStatus } = {
            'pending': PaymentStatus.PENDING,
            'processing': PaymentStatus.PROCESSING,
            'completed': PaymentStatus.COMPLETED,
            'failed': PaymentStatus.FAILED,
            'refunded': PaymentStatus.REFUNDED,
        };
        return statusMap[status] || PaymentStatus.PENDING;
    }

    private mapPaymentMethod(method: number): string {
        const methodMap: { [key: number]: string } = {
            0: 'credit_card',
            1: 'debit_card',
            2: 'paypal',
            3: 'bank_transfer',
        };
        return methodMap[method] || 'credit_card';
    }

    private mapPaymentMethodToEnum(method: string): number {
        const methodMap: { [key: string]: number } = {
            'credit_card': 0,
            'debit_card': 1,
            'paypal': 2,
            'bank_transfer': 3,
        };
        return methodMap[method] || 0;
    }
}
