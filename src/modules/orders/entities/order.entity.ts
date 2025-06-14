import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

export enum OrderStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    PROCESSING = 'processing',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded'
}

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, user => user.orders)
    user: User;

    @Column()
    userId: string;

    @Column({
        type: 'enum',
        enum: OrderStatus,
        default: OrderStatus.PENDING
    })
    status: OrderStatus;

    @Column('decimal', { precision: 10, scale: 2 })
    totalAmount: number;

    @Column({ nullable: true })
    shippingAddress: string;

    @Column({ nullable: true })
    billingAddress: string;

    @Column({ nullable: true })
    trackingNumber: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ default: false })
    isPaid: boolean;

    @Column({ nullable: true })
    paymentMethod: string;

    @Column({ nullable: true })
    paymentId: string;

    @Column({ type: 'jsonb' })
    items: OrderItem[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

export interface OrderItem {
    productId: string;
    quantity: number;
    price: number;
    name: string;
    subtotal: number;
} 