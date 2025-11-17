import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { OrderEntity } from './order.entity';

@Entity('order_items')
export class OrderItemEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'order_id' })
    orderId: string;

    @Column({ name: 'product_id' })
    productId: string;

    @Column()
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @ManyToOne(() => OrderEntity, (order) => order.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: OrderEntity;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
