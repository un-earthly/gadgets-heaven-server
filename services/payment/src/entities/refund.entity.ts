import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PaymentEntity } from './payment.entity';

@Entity('refunds')
export class RefundEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'payment_id' })
    paymentId: string;

    @ManyToOne(() => PaymentEntity, payment => payment.refunds)
    @JoinColumn({ name: 'payment_id' })
    payment: PaymentEntity;

    @Column('decimal', { precision: 10, scale: 2 })
    amount: number;

    @Column({ type: 'text', nullable: true })
    reason: string;

    @Column({ default: 'pending' })
    status: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
