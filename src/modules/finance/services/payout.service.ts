import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between } from 'typeorm';
import { Payout, PayoutStatus } from '../entities/payout.entity';
import { CreatePayoutDto } from '../dto/create-payout.dto';

@Injectable()
export class PayoutService {
    constructor(
        @InjectRepository(Payout)
        private readonly payoutRepository: Repository<Payout>,
    ) { }

    async create(createPayoutDto: CreatePayoutDto): Promise<Payout> {
        // Validate minimum payout amount
        if (createPayoutDto.amount < 10) {
            throw new BadRequestException('Minimum payout amount is $10');
        }

        const payout = this.payoutRepository.create(createPayoutDto);
        return this.payoutRepository.save(payout);
    }

    async findAll(): Promise<Payout[]> {
        return this.payoutRepository.find({
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string): Promise<Payout> {
        const payout = await this.payoutRepository.findOne({
            where: { id },
        });

        if (!payout) {
            throw new NotFoundException(`Payout with ID ${id} not found`);
        }

        return payout;
    }

    async findByUser(userId: string): Promise<Payout[]> {
        return this.payoutRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async updateStatus(id: string, status: PayoutStatus): Promise<Payout> {
        const payout = await this.findOne(id);
        payout.status = status;

        if (status === PayoutStatus.COMPLETED) {
            payout.processedAt = new Date();
        }

        return this.payoutRepository.save(payout);
    }

    async getPendingPayouts(): Promise<Payout[]> {
        return this.payoutRepository.find({
            where: { status: PayoutStatus.PENDING },
            order: { createdAt: 'ASC' },
        });
    }

    async getPayoutSummary(userId: string, startDate: Date, endDate: Date) {
        const payouts = await this.payoutRepository.find({
            where: {
                userId,
                createdAt: Between(startDate, endDate),
            },
        });

        const totalAmount = payouts.reduce((sum, p) => sum + Number(p.amount), 0);
        const completedAmount = payouts
            .filter(p => p.status === PayoutStatus.COMPLETED)
            .reduce((sum, p) => sum + Number(p.amount), 0);
        const pendingAmount = payouts
            .filter(p => p.status === PayoutStatus.PENDING)
            .reduce((sum, p) => sum + Number(p.amount), 0);

        return {
            totalPayouts: payouts.length,
            totalAmount,
            completedAmount,
            pendingAmount,
            payouts,
        };
    }

    async processPayouts(): Promise<void> {
        const pendingPayouts = await this.getPendingPayouts();

        for (const payout of pendingPayouts) {
            try {
                // Set status to processing
                await this.updateStatus(payout.id, PayoutStatus.PROCESSING);

                // Here you would integrate with your payment provider
                // For example: Stripe, PayPal, etc.
                // This is just a placeholder for the actual implementation
                const success = await this.processPayoutWithProvider(payout);

                if (success) {
                    await this.updateStatus(payout.id, PayoutStatus.COMPLETED);
                } else {
                    await this.updateStatus(payout.id, PayoutStatus.FAILED);
                }
            } catch (error) {
                await this.updateStatus(payout.id, PayoutStatus.FAILED);
                // Log error or notify admin
                console.error(`Failed to process payout ${payout.id}:`, error);
            }
        }
    }

    private async processPayoutWithProvider(payout: Payout): Promise<boolean> {
        // This is a placeholder for the actual payment provider integration
        // You would implement the actual payment processing logic here
        // For now, we'll simulate a successful payout
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
        return true;
    }
} 