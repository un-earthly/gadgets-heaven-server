import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { OrderItemEntity } from './order-item.entity';

@Entity('orders')
export class OrderEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
    totalAmount: number;

    @Column({ default: 'PENDING' })
    status: string;

    @Column({ type: 'jsonb', name: 'shipping_address' })
    shippingAddress: {
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    };

    @OneToMany(() => OrderItemEntity, (item) => item.order, { cascade: true })
    items: OrderItemEntity[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
