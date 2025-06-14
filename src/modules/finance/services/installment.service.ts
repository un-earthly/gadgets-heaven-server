import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Installment, InstallmentStatus } from '../entities/installment.entity';
import { CreateInstallmentDto } from '../dto/create-installment.dto';

@Injectable()
export class InstallmentService {
    constructor(
        @InjectRepository(Installment)
        private readonly installmentRepository: Repository<Installment>,
    ) { }

    async create(createInstallmentDto: CreateInstallmentDto): Promise<Installment> {
        const installment = this.installmentRepository.create(createInstallmentDto);
        return this.installmentRepository.save(installment);
    }

    async createMany(createInstallmentDtos: CreateInstallmentDto[]): Promise<Installment[]> {
        const installments = createInstallmentDtos.map(dto =>
            this.installmentRepository.create(dto)
        );
        return this.installmentRepository.save(installments);
    }

    async findAll(): Promise<Installment[]> {
        return this.installmentRepository.find({
            order: { dueDate: 'ASC' },
        });
    }

    async findOne(id: string): Promise<Installment> {
        const installment = await this.installmentRepository.findOne({
            where: { id },
        });

        if (!installment) {
            throw new NotFoundException(`Installment with ID ${id} not found`);
        }

        return installment;
    }

    async findByUser(userId: string): Promise<Installment[]> {
        return this.installmentRepository.find({
            where: { userId },
            order: { dueDate: 'ASC' },
        });
    }

    async findByOrder(orderId: string): Promise<Installment[]> {
        return this.installmentRepository.find({
            where: { orderId },
            order: { installmentNumber: 'ASC' },
        });
    }

    async updateStatus(id: string, status: InstallmentStatus): Promise<Installment> {
        const installment = await this.findOne(id);
        installment.status = status;

        if (status === InstallmentStatus.PAID) {
            installment.paidDate = new Date();
        }

        return this.installmentRepository.save(installment);
    }

    async getOverdueInstallments(): Promise<Installment[]> {
        const today = new Date();
        return this.installmentRepository.find({
            where: {
                dueDate: LessThan(today),
                status: InstallmentStatus.PENDING,
            },
            order: { dueDate: 'ASC' },
        });
    }

    async calculateLateFees(): Promise<void> {
        const overdueInstallments = await this.getOverdueInstallments();
        const today = new Date();

        for (const installment of overdueInstallments) {
            const daysLate = Math.floor(
                (today.getTime() - installment.dueDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Calculate late fee (example: 1% per day up to 30%)
            const lateFeePercentage = Math.min(daysLate, 30) * 0.01;
            installment.lateFee = Number(installment.amount) * lateFeePercentage;
            installment.status = InstallmentStatus.OVERDUE;

            await this.installmentRepository.save(installment);
        }
    }

    async getInstallmentSummary(userId: string) {
        const installments = await this.findByUser(userId);

        const totalAmount = installments.reduce((sum, inst) => sum + Number(inst.amount), 0);
        const paidAmount = installments
            .filter(inst => inst.status === InstallmentStatus.PAID)
            .reduce((sum, inst) => sum + Number(inst.amount), 0);
        const pendingAmount = totalAmount - paidAmount;
        const totalLateFees = installments.reduce((sum, inst) => sum + Number(inst.lateFee), 0);

        return {
            totalInstallments: installments.length,
            totalAmount,
            paidAmount,
            pendingAmount,
            totalLateFees,
            installments,
        };
    }
} 