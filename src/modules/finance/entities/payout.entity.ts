import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PayoutStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

export enum PayoutMethod {
    BANK_TRANSFER = 'bank_transfer',
    PAYPAL = 'paypal',
    STRIPE = 'stripe',
    CRYPTO = 'crypto'
}

@Entity('payouts')
export class Payout {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { eager: true })
    user: User;

    @Column()
    userId: string;

    @Column('decimal', { precision: 10, scale: 2 })
    amount: number;

    @Column({
        type: 'enum',
        enum: PayoutStatus,
        default: PayoutStatus.PENDING
    })
    status: PayoutStatus;

    @Column({
        type: 'enum',
        enum: PayoutMethod,
        default: PayoutMethod.BANK_TRANSFER
    })
    method: PayoutMethod;

    @Column({ type: 'jsonb', nullable: true })
    paymentDetails: {
        accountNumber?: string;
        bankName?: string;
        swiftCode?: string;
        paypalEmail?: string;
        cryptoAddress?: string;
        walletType?: string;
    };

    @Column({ nullable: true })
    transactionId: string;

    @Column({ nullable: true })
    reference: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ type: 'timestamp', nullable: true })
    processedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 