import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Wishlist } from './wishlist.entity';
import { Product } from '../../products/entities/product.entity';

export enum PriceAlertType {
    NONE = 'none',
    PERCENTAGE = 'percentage',
    FIXED = 'fixed',
    ANY = 'any'
}

@Entity('wishlist_items')
export class WishlistItem {
    @ApiProperty({ description: 'Unique identifier' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ description: 'Associated wishlist' })
    @ManyToOne(() => Wishlist, wishlist => wishlist.items, { lazy: true })
    wishlist: Promise<Wishlist>;

    @Column()
    wishlistId: string;

    @ApiProperty({ description: 'Product in the wishlist' })
    @ManyToOne(() => Product, { lazy: true })
    product: Promise<Product>;

    @Column()
    productId: string;

    @ApiProperty({ description: 'Priority level (1-5)', minimum: 1, maximum: 5 })
    @Column({ default: 3 })
    priority: number;

    @ApiProperty({ description: 'Notes about the item', required: false })
    @Column({ nullable: true })
    notes?: string;

    @ApiProperty({ description: 'Type of price alert', enum: PriceAlertType })
    @Column({
        type: 'enum',
        enum: PriceAlertType,
        default: PriceAlertType.NONE
    })
    priceAlertType: PriceAlertType;

    @ApiProperty({ description: 'Target price for alert', required: false })
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    targetPrice?: number;

    @ApiProperty({ description: 'Price drop percentage for alert', required: false })
    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    priceDropPercentage?: number;

    @ApiProperty({ description: 'Whether to notify when back in stock' })
    @Column({ default: false })
    notifyInStock: boolean;

    @ApiProperty({ description: 'Price when item was added' })
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    addedPrice: number;

    @ApiProperty({ description: 'Current price of the item' })
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    currentPrice: number;

    @ApiProperty({ description: 'Lowest price since added' })
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    lowestPrice: number;

    @ApiProperty({ description: 'Creation timestamp' })
    @CreateDateColumn()
    createdAt: Date;

    @ApiProperty({ description: 'Last update timestamp' })
    @UpdateDateColumn()
    updatedAt: Date;
} 