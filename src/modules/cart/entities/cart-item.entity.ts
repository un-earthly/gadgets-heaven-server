import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Cart } from './cart.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('cart_items')
export class CartItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Cart, cart => cart.items)
    cart: Cart;

    @Column()
    cartId: string;

    @ManyToOne(() => Product)
    product: Product;

    @Column()
    productId: string;

    @Column()
    quantity: number;

    @Column('decimal', { precision: 10, scale: 2 })
    unitPrice: number;

    @Column('decimal', { precision: 10, scale: 2 })
    subtotal: number;

    @Column({ type: 'jsonb', nullable: true })
    selectedOptions: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}