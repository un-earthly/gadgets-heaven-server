import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CartItem } from './cart-item.entity';

export enum CartStatus {
    ACTIVE = 'active',
    CHECKOUT = 'checkout',
    ABANDONED = 'abandoned',
    COMPLETED = 'completed'
}

@Entity('carts')
export class Cart {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, user => user.carts)
    user: User;

    @Column()
    userId: string;

    @OneToMany(() => CartItem, cartItem => cartItem.cart, { cascade: true })
    items: CartItem[];

    @Column({
        type: 'enum',
        enum: CartStatus,
        default: CartStatus.ACTIVE
    })
    status: CartStatus;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    subtotal: number;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    tax: number;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    total: number;

    @Column({ type: 'varchar', nullable: true })
    couponCode: string | null;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    discount: number;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ default: false })
    isGuestCart: boolean;

    @Column({ nullable: true })
    guestEmail: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ nullable: true })
    lastActivityAt: Date;
} 