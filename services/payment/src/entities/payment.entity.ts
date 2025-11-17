import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RefundEntity } from './refund.entity';

@Entity('payments')
export class PaymentEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'order_id' })
    orderId: string;

    @Column({ name: 'user_id' })
    userId: string;

    @Column('decimal', { precision: 10, scale: 2 })
    amount: number;

    @Column({ default: 'pending' })
    status: string;

    @Column({ name: 'payment_method' })
    paymentMethod: string;

    @Column({ name: 'transaction_id', nullable: true })
    transactionId: string;

    @OneToMany(() => RefundEntity, refund => refund.payment)
    refunds: RefundEntity[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
