import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { WishlistItem } from './wishlist-item.entity';

@Entity('wishlists')
export class Wishlist {
    @ApiProperty({ description: 'Unique identifier' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ description: 'User who owns this wishlist' })
    @ManyToOne(() => User, user => user.wishlists, { lazy: true })
    user: Promise<User>;

    @Column()
    userId: string;

    @ApiProperty({ description: 'Name of the wishlist' })
    @Column()
    name: string;

    @ApiProperty({ description: 'Description of the wishlist', required: false })
    @Column({ nullable: true })
    description?: string;

    @ApiProperty({ description: 'Whether the wishlist is public or private' })
    @Column({ default: false })
    isPublic: boolean;

    @ApiProperty({ description: 'Items in the wishlist' })
    @OneToMany(() => WishlistItem, item => item.wishlist, { cascade: true })
    items: WishlistItem[];

    @ApiProperty({ description: 'Creation timestamp' })
    @CreateDateColumn()
    createdAt: Date;

    @ApiProperty({ description: 'Last update timestamp' })
    @UpdateDateColumn()
    updatedAt: Date;
} 