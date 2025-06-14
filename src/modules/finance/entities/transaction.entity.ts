import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';

export enum TransactionType {
    CREDIT = 'credit',
    DEBIT = 'debit'
}

export enum TransactionStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded'
}

export enum PaymentMethod {
    CARD = 'card',
    BANK_TRANSFER = 'bank_transfer',
    WALLET = 'wallet'
}

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('decimal', { precision: 10, scale: 2 })
    amount: number;

    @Column({
        type: 'enum',
        enum: TransactionType,
        default: TransactionType.CREDIT
    })
    type: TransactionType;

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING
    })
    status: TransactionStatus;

    @Column({
        type: 'enum',
        enum: PaymentMethod,
        default: PaymentMethod.CARD
    })
    method: PaymentMethod;

    @ManyToOne(() => User, { eager: true })
    user: User;

    @Column()
    userId: string;

    @ManyToOne(() => Order, { nullable: true, eager: true })
    order: Order;

    @Column({ nullable: true })
    orderId: string;

    @Column({ nullable: true })
    description: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ nullable: true })
    referenceNumber: string;

    @Column({ nullable: true })
    gatewayTransactionId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 