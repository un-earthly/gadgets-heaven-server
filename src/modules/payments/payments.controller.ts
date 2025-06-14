import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Payment } from './entities/payment.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post()
    @ApiOperation({ summary: 'Create payment' })
    @ApiResponse({ status: 201, description: 'Payment created successfully', type: Payment })
    async create(
        @GetUser('id') userId: string,
        @Body() createPaymentDto: CreatePaymentDto,
    ): Promise<Payment> {
        return this.paymentsService.create(userId, createPaymentDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all payments' })
    @ApiResponse({ status: 200, description: 'Returns all payments', type: [Payment] })
    async findAll(@GetUser('id') userId: string): Promise<Payment[]> {
        return this.paymentsService.findAll(userId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get payment by ID' })
    @ApiResponse({ status: 200, description: 'Returns the payment', type: Payment })
    async findOne(
        @GetUser('id') userId: string,
        @Param('id') id: string,
    ): Promise<Payment> {
        return this.paymentsService.findOne(userId, id);
    }

    @Post(':id/refund')
    @ApiOperation({ summary: 'Refund payment' })
    @ApiResponse({ status: 200, description: 'Payment refunded successfully', type: Payment })
    async refund(
        @GetUser('id') userId: string,
        @Param('id') id: string,
        @Body() refundDto: RefundPaymentDto,
    ): Promise<Payment> {
        return this.paymentsService.refund(userId, id, refundDto);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get payment statistics' })
    @ApiResponse({ status: 200, description: 'Returns payment statistics' })
    async getStats(@GetUser('id') userId: string): Promise<{
        totalAmount: number;
        completedPayments: number;
        failedPayments: number;
        refundedAmount: number;
    }> {
        return this.paymentsService.getPaymentStats(userId);
    }
} 