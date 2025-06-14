import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Product } from '../../products/entities/product.entity';

export enum StockStatus {
    IN_STOCK = 'in_stock',
    LOW_STOCK = 'low_stock',
    OUT_OF_STOCK = 'out_of_stock',
    DISCONTINUED = 'discontinued',
    ON_ORDER = 'on_order'
}

@Entity('inventory')
export class Inventory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Product)
    product: Product;

    @Column()
    productId: string;

    @Column('int')
    quantity: number;

    @Column('int')
    minStockLevel: number;

    @Column('int')
    maxStockLevel: number;

    @Column({
        type: 'enum',
        enum: StockStatus,
        default: StockStatus.IN_STOCK
    })
    status: StockStatus;

    @Column({ nullable: true })
    warehouseLocation: string;

    @Column({ nullable: true })
    shelfLocation: string;

    @Column({ type: 'jsonb', nullable: true })
    dimensions: {
        length: number;
        width: number;
        height: number;
        weight: number;
        unit: string;
    };

    @Column({ type: 'simple-array', nullable: true })
    barcodes: string[];

    @Column({ type: 'jsonb', nullable: true })
    supplier: {
        id: string;
        name: string;
        contactInfo: string;
        leadTime: number;
    };

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    costPerUnit: number;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ nullable: true })
    lastRestockDate: Date;

    @Column({ nullable: true })
    nextRestockDate: Date;

    @Column('int', { default: 0 })
    reservedQuantity: number;

    @Column('int', { default: 0 })
    damagedQuantity: number;

    @Column('int', { default: 0 })
    returnedQuantity: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'jsonb', nullable: true })
    stockMovements: {
        date: Date;
        type: 'in' | 'out';
        quantity: number;
        reason: string;
        reference: string;
    }[];
} 