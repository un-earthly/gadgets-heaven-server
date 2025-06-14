import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Review } from '../../reviews/entities/review.entity';

export enum ProductStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    OUT_OF_STOCK = 'out_of_stock',
    DISCONTINUED = 'discontinued'
}

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column('text')
    description: string;

    @Column('decimal', { precision: 10, scale: 2 })
    price: number;

    @Column('int')
    stockQuantity: number;

    @Column({
        type: 'enum',
        enum: ProductStatus,
        default: ProductStatus.DRAFT
    })
    status: ProductStatus;

    @Column('simple-array', { nullable: true })
    images: string[];

    @Column('simple-array')
    categories: string[];

    @Column({ type: 'jsonb', nullable: true })
    specifications: Record<string, any>;

    @Column({ default: 0 })
    rating: number;

    @Column({ default: 0 })
    reviewCount: number;

    @Column({ default: false })
    isFeatured: boolean;

    @Column({ nullable: true })
    brand: string;

    @Column({ nullable: true })
    sku: string;

    @Column({ default: 0 })
    discountPercentage: number;

    @ManyToOne(() => User)
    vendor: User;

    @Column({ nullable: true })
    vendorId: string;

    @OneToMany(() => Review, review => review.product)
    reviews: Review[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 