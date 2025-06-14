import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { InstallmentService } from '../services/installment.service';
import { CreateInstallmentDto } from '../dto/create-installment.dto';
import { Installment, InstallmentStatus } from '../entities/installment.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('installments')
@UseGuards(JwtAuthGuard)
export class InstallmentController {
    constructor(private readonly installmentService: InstallmentService) { }

    @Post()
    async create(@Body() createInstallmentDto: CreateInstallmentDto): Promise<Installment> {
        return this.installmentService.create(createInstallmentDto);
    }

    @Post('bulk')
    async createMany(@Body() createInstallmentDtos: CreateInstallmentDto[]): Promise<Installment[]> {
        return this.installmentService.createMany(createInstallmentDtos);
    }

    @Get()
    async findAll(): Promise<Installment[]> {
        return this.installmentService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<Installment> {
        return this.installmentService.findOne(id);
    }

    @Get('user/:userId')
    async findByUser(@Param('userId') userId: string): Promise<Installment[]> {
        return this.installmentService.findByUser(userId);
    }

    @Get('order/:orderId')
    async findByOrder(@Param('orderId') orderId: string): Promise<Installment[]> {
        return this.installmentService.findByOrder(orderId);
    }

    @Post(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: InstallmentStatus,
    ): Promise<Installment> {
        return this.installmentService.updateStatus(id, status);
    }

    @Get('overdue')
    async getOverdueInstallments(): Promise<Installment[]> {
        return this.installmentService.getOverdueInstallments();
    }

    @Post('calculate-late-fees')
    async calculateLateFees(): Promise<void> {
        return this.installmentService.calculateLateFees();
    }

    @Get('summary/user/:userId')
    async getInstallmentSummary(@Param('userId') userId: string) {
        return this.installmentService.getInstallmentSummary(userId);
    }
} 