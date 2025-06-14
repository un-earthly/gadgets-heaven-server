import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PayoutService } from '../services/payout.service';
import { CreatePayoutDto } from '../dto/create-payout.dto';
import { Payout, PayoutStatus } from '../entities/payout.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('payouts')
@UseGuards(JwtAuthGuard)
export class PayoutController {
    constructor(private readonly payoutService: PayoutService) { }

    @Post()
    async create(@Body() createPayoutDto: CreatePayoutDto): Promise<Payout> {
        return this.payoutService.create(createPayoutDto);
    }

    @Get()
    async findAll(): Promise<Payout[]> {
        return this.payoutService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<Payout> {
        return this.payoutService.findOne(id);
    }

    @Get('user/:userId')
    async findByUser(@Param('userId') userId: string): Promise<Payout[]> {
        return this.payoutService.findByUser(userId);
    }

    @Post(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: PayoutStatus,
    ): Promise<Payout> {
        return this.payoutService.updateStatus(id, status);
    }

    @Get('pending')
    async getPendingPayouts(): Promise<Payout[]> {
        return this.payoutService.getPendingPayouts();
    }

    @Post('process')
    async processPayouts(): Promise<void> {
        return this.payoutService.processPayouts();
    }

    @Get('summary/user/:userId')
    async getPayoutSummary(
        @Param('userId') userId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.payoutService.getPayoutSummary(
            userId,
            new Date(startDate),
            new Date(endDate),
        );
    }
} 