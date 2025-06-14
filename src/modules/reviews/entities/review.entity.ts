import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

export enum ReviewStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected'
}

@Entity('reviews')
export class Review {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, user => user.reviews)
    user: User;

    @Column()
    userId: string;

    @ManyToOne(() => Product, product => product.reviews)
    product: Product;

    @Column()
    productId: string;

    @Column()
    title: string;

    @Column('text')
    content: string;

    @Column()
    rating: number;

    @Column({ type: 'jsonb', nullable: true })
    images: string[];

    @Column({
        type: 'enum',
        enum: ReviewStatus,
        default: ReviewStatus.PENDING
    })
    status: ReviewStatus;

    @Column({ default: false })
    isVerifiedPurchase: boolean;

    @Column({ type: 'int', default: 0 })
    helpfulVotes: number;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 