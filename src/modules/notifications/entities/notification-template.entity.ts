import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  ManyToOne,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum NotificationEvent {
  ORDER_PLACED = 'order_placed',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
}

// Per-tenant notification templates. Bodies use {{placeholder}} tokens
// (orderId, storeName, amount, trackingCode). A tenant with no row for an
// event falls back to the built-in default template.
@Entity('notification_templates')
@Unique(['tenantId', 'event', 'channel'])
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  @Column({ type: 'enum', enum: NotificationEvent })
  event: NotificationEvent;

  @Column({ default: 'whatsapp' })
  channel: string;

  @Column('text')
  body: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
