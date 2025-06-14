import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TransactionService } from '../services/transaction.service';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
    constructor(private readonly transactionService: TransactionService) { }

    @Post()
    async create(@Body() createTransactionDto: CreateTransactionDto): Promise<Transaction> {
        return this.transactionService.create(createTransactionDto);
    }

    @Get()
    async findAll(): Promise<Transaction[]> {
        return this.transactionService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<Transaction> {
        return this.transactionService.findOne(id);
    }

    @Get('user/:userId')
    async findByUser(@Param('userId') userId: string): Promise<Transaction[]> {
        return this.transactionService.findByUser(userId);
    }

    @Get('order/:orderId')
    async findByOrder(@Param('orderId') orderId: string): Promise<Transaction[]> {
        return this.transactionService.findByOrder(orderId);
    }

    @Post(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: TransactionStatus,
    ): Promise<Transaction> {
        return this.transactionService.updateStatus(id, status);
    }

    @Get('summary/user/:userId')
    async getTransactionSummary(
        @Param('userId') userId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.transactionService.getTransactionSummary(
            userId,
            new Date(startDate),
            new Date(endDate),
        );
    }
} 