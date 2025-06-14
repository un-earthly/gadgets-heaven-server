import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

export enum BulkOrderStatus {
    DRAFT = 'draft',
    PENDING = 'pending',
    APPROVED = 'approved',
    PROCESSING = 'processing',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled'
}

export enum BulkOrderPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent'
}

@Entity('bulk_orders')
export class BulkOrder {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    orderNumber: string;

    @ManyToOne(() => User, { eager: true })
    user: User;

    @Column()
    userId: string;

    @Column({
        type: 'enum',
        enum: BulkOrderStatus,
        default: BulkOrderStatus.DRAFT
    })
    status: BulkOrderStatus;

    @Column({
        type: 'enum',
        enum: BulkOrderPriority,
        default: BulkOrderPriority.MEDIUM
    })
    priority: BulkOrderPriority;

    @Column('decimal', { precision: 10, scale: 2 })
    totalAmount: number;

    @Column('decimal', { precision: 5, scale: 2, default: 0 })
    bulkDiscountPercentage: number;

    @Column('decimal', { precision: 10, scale: 2 })
    finalAmount: number;

    @Column({ type: 'jsonb' })
    items: {
        productId: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
        product?: Product;
    }[];

    @Column({ type: 'jsonb', nullable: true })
    shippingDetails: {
        address: string;
        method: string;
        trackingNumber?: string;
        estimatedDeliveryDate?: Date;
        actualDeliveryDate?: Date;
        instructions?: string;
    };

    @Column({ type: 'jsonb', nullable: true })
    paymentDetails: {
        method: string;
        status: string;
        transactionId?: string;
        paidAmount?: number;
        paidDate?: Date;
    };

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ type: 'timestamp', nullable: true })
    approvedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    processedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    shippedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    deliveredAt: Date;

    @Column({ type: 'jsonb', default: [] })
    statusHistory: {
        status: BulkOrderStatus;
        date: Date;
        note?: string;
    }[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 