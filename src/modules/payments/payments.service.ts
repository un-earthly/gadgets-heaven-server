import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { Order } from '../orders/entities/order.entity';

@Injectable()
export class PaymentsService {
    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
    ) { }

    async create(userId: string, createPaymentDto: CreatePaymentDto): Promise<Payment> {
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

    private async processPayment(payment: Payment): Promise<{ transactionId: string }> {
        // Simulate payment gateway integration
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (Math.random() > 0.9) { // 10% chance of failure
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

    async refund(userId: string, id: string, refundDto: RefundPaymentDto): Promise<Payment> {
        const payment = await this.findOne(userId, id);

        if (payment.status !== PaymentStatus.COMPLETED) {
            throw new BadRequestException('Payment cannot be refunded');
        }

        if (refundDto.amount > payment.amount) {
            throw new BadRequestException('Refund amount cannot exceed payment amount');
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

    private async processRefund(payment: Payment, refundDto: RefundPaymentDto): Promise<{ refundId: string }> {
        // Simulate refund gateway integration
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (Math.random() > 0.9) { // 10% chance of failure
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
                .filter(p => p.status === PaymentStatus.COMPLETED)
                .reduce((sum, p) => sum + Number(p.amount), 0),
            completedPayments: payments.filter(p => p.status === PaymentStatus.COMPLETED).length,
            failedPayments: payments.filter(p => p.status === PaymentStatus.FAILED).length,
            refundedAmount: payments
                .filter(p => p.status === PaymentStatus.REFUNDED)
                .reduce((sum, p) => sum + Number(p.refundAmount || 0), 0),
        };
    }
} 