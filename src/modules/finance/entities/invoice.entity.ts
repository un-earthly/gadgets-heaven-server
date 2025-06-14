import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';

export enum InvoiceStatus {
    DRAFT = 'draft',
    SENT = 'sent',
    PAID = 'paid',
    OVERDUE = 'overdue',
    CANCELLED = 'cancelled'
}

export interface InvoiceItem {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    tax: number;
    total: number;
}

@Entity('invoices')
export class Invoice {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    invoiceNumber: string;

    @Column('decimal', { precision: 10, scale: 2 })
    subtotal: number;

    @Column('decimal', { precision: 10, scale: 2 })
    tax: number;

    @Column('decimal', { precision: 10, scale: 2 })
    total: number;

    @Column({
        type: 'enum',
        enum: InvoiceStatus,
        default: InvoiceStatus.DRAFT
    })
    status: InvoiceStatus;

    @ManyToOne(() => User, { eager: true })
    user: User;

    @Column()
    userId: string;

    @ManyToOne(() => Order, { nullable: true, eager: true })
    order: Order;

    @Column({ nullable: true })
    orderId: string;

    @Column({ type: 'date' })
    dueDate: Date;

    @Column({ type: 'date', nullable: true })
    paidDate: Date;

    @Column({ type: 'jsonb' })
    items: InvoiceItem[];

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ nullable: true })
    paymentTerms: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 