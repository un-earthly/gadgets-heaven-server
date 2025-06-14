import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { CreateTransactionDto } from '../dto/create-transaction.dto';

@Injectable()
export class TransactionService {
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
    ) { }

    async create(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
        const transaction = this.transactionRepository.create(createTransactionDto);
        return this.transactionRepository.save(transaction);
    }

    async findAll(): Promise<Transaction[]> {
        return this.transactionRepository.find();
    }

    async findOne(id: string): Promise<Transaction> {
        const transaction = await this.transactionRepository.findOne({
            where: { id },
        });

        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }

        return transaction;
    }

    async findByUser(userId: string): Promise<Transaction[]> {
        return this.transactionRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async findByOrder(orderId: string): Promise<Transaction[]> {
        return this.transactionRepository.find({
            where: { orderId },
            order: { createdAt: 'DESC' },
        });
    }

    async updateStatus(id: string, status: TransactionStatus): Promise<Transaction> {
        const transaction = await this.findOne(id);
        transaction.status = status;
        return this.transactionRepository.save(transaction);
    }

    async getTransactionSummary(userId: string, startDate: Date, endDate: Date) {
        const transactions = await this.transactionRepository
            .createQueryBuilder('transaction')
            .where('transaction.userId = :userId', { userId })
            .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
            .getMany();

        const totalCredit = transactions
            .filter(t => t.type === 'credit' && t.status === TransactionStatus.COMPLETED)
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalDebit = transactions
            .filter(t => t.type === 'debit' && t.status === TransactionStatus.COMPLETED)
            .reduce((sum, t) => sum + Number(t.amount), 0);

        return {
            totalTransactions: transactions.length,
            totalCredit,
            totalDebit,
            netAmount: totalCredit - totalDebit,
            transactions,
        };
    }
} 