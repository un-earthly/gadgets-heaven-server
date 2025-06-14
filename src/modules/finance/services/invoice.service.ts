import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { Like, LessThan } from 'typeorm';

@Injectable()
export class InvoiceService {
    constructor(
        @InjectRepository(Invoice)
        private readonly invoiceRepository: Repository<Invoice>,
    ) { }

    async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
        const invoice = this.invoiceRepository.create(createInvoiceDto);
        return this.invoiceRepository.save(invoice);
    }

    async findAll(): Promise<Invoice[]> {
        return this.invoiceRepository.find({
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string): Promise<Invoice> {
        const invoice = await this.invoiceRepository.findOne({
            where: { id },
        });

        if (!invoice) {
            throw new NotFoundException(`Invoice with ID ${id} not found`);
        }

        return invoice;
    }

    async findByUser(userId: string): Promise<Invoice[]> {
        return this.invoiceRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async findByOrder(orderId: string): Promise<Invoice[]> {
        return this.invoiceRepository.find({
            where: { orderId },
            order: { createdAt: 'DESC' },
        });
    }

    async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
        const invoice = await this.findOne(id);
        invoice.status = status;

        if (status === InvoiceStatus.PAID) {
            invoice.paidDate = new Date();
        }

        return this.invoiceRepository.save(invoice);
    }

    async getOverdueInvoices(): Promise<Invoice[]> {
        const today = new Date();
        return this.invoiceRepository.find({
            where: {
                dueDate: LessThan(today),
                status: InvoiceStatus.SENT,
            },
            order: { dueDate: 'ASC' },
        });
    }

    async getInvoiceSummary(userId: string, startDate: Date, endDate: Date) {
        const invoices = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .where('invoice.userId = :userId', { userId })
            .andWhere('invoice.createdAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
            .getMany();

        const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
        const paidAmount = invoices
            .filter(inv => inv.status === InvoiceStatus.PAID)
            .reduce((sum, inv) => sum + Number(inv.total), 0);
        const pendingAmount = totalAmount - paidAmount;

        return {
            totalInvoices: invoices.length,
            totalAmount,
            paidAmount,
            pendingAmount,
            invoices,
        };
    }

    async generateInvoiceNumber(): Promise<string> {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `INV${year}${month}`;

        const lastInvoice = await this.invoiceRepository.find({
            where: {
                invoiceNumber: Like(`${prefix}%`),
            },
            order: { invoiceNumber: 'DESC' },
            take: 1,
        });

        let sequence = 1;
        if (lastInvoice.length > 0) {
            const lastSequence = parseInt(lastInvoice[0].invoiceNumber.slice(-4));
            sequence = lastSequence + 1;
        }

        return `${prefix}${sequence.toString().padStart(4, '0')}`;
    }
} 