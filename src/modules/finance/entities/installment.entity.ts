import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';

export enum InstallmentStatus {
    PENDING = 'pending',
    PAID = 'paid',
    OVERDUE = 'overdue',
    DEFAULTED = 'defaulted'
}

@Entity('installments')
export class Installment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Order, { eager: true })
    order: Order;

    @Column()
    orderId: string;

    @ManyToOne(() => User, { eager: true })
    user: User;

    @Column()
    userId: string;

    @Column('decimal', { precision: 10, scale: 2 })
    amount: number;

    @Column()
    installmentNumber: number;

    @Column()
    totalInstallments: number;

    @Column({ type: 'date' })
    dueDate: Date;

    @Column({ type: 'date', nullable: true })
    paidDate: Date;

    @Column({
        type: 'enum',
        enum: InstallmentStatus,
        default: InstallmentStatus.PENDING
    })
    status: InstallmentStatus;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    lateFee: number;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ nullable: true })
    paymentMethod: string;

    @Column({ nullable: true })
    transactionId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 