import { Entity, PrimaryGeneratedColumn, Column, Tree, TreeChildren, TreeParent, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('categories')
@Tree('materialized-path')
export class Category {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ unique: true })
    slug: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    image: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: 0 })
    sortOrder: number;

    @Column({ nullable: true })
    metaTitle: string;

    @Column({ nullable: true })
    metaDescription: string;

    @TreeChildren()
    children: Category[];

    @TreeParent({ onDelete: 'SET NULL' })
    parent: Category | null;

    @Column({ nullable: true })
    parentId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 