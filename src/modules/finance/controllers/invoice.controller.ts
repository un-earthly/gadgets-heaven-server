import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InvoiceService } from '../services/invoice.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
    constructor(private readonly invoiceService: InvoiceService) {}

    @Post()
    async create(@Body() createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
        return this.invoiceService.create(createInvoiceDto);
    }

    @Get()
    async findAll(): Promise<Invoice[]> {
        return this.invoiceService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<Invoice> {
        return this.invoiceService.findOne(id);
    }

    @Get('user/:userId')
    async findByUser(@Param('userId') userId: string): Promise<Invoice[]> {
        return this.invoiceService.findByUser(userId);
    }

    @Get('order/:orderId')
    async findByOrder(@Param('orderId') orderId: string): Promise<Invoice[]> {
        return this.invoiceService.findByOrder(orderId);
    }

    @Post(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: InvoiceStatus,
    ): Promise<Invoice> {
        return this.invoiceService.updateStatus(id, status);
    }

    @Get('overdue')
    async getOverdueInvoices(): Promise<Invoice[]> {
        return this.invoiceService.getOverdueInvoices();
    }

    @Get('summary/user/:userId')
    async getInvoiceSummary(
        @Param('userId') userId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.invoiceService.getInvoiceSummary(
            userId,
            new Date(startDate),
            new Date(endDate),
        );
    }

    @Get('generate/number')
    async generateInvoiceNumber(): Promise<{ invoiceNumber: string }> {
        const invoiceNumber = await this.invoiceService.generateInvoiceNumber();
        return { invoiceNumber };
    }
} 