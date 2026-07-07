import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum PaymentType {
  ONLINE = 'online',
  COD = 'cod',
}

export enum OrderPaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  COD_PENDING = 'cod_pending',
  COD_COLLECTED = 'cod_collected',
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  @ManyToOne(() => User, (user) => user.orders)
  user: User;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ nullable: true })
  shippingAddress: string;

  @Column({ nullable: true })
  billingAddress: string;

  @Column({ nullable: true })
  trackingNumber: string;

  // Courier integration (provider kept as a plain string so Pathao/RedX can
  // be added without schema changes)
  @Column({ nullable: true })
  courierProvider: string;

  @Column({ nullable: true })
  consignmentId: string;

  @Column({ nullable: true })
  trackingStatus: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  isPaid: boolean;

  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.COD,
  })
  paymentType: PaymentType;

  @Column({
    type: 'enum',
    enum: OrderPaymentStatus,
    default: OrderPaymentStatus.PENDING,
  })
  paymentStatus: OrderPaymentStatus;

  @Column({ nullable: true })
  paymentMethod: string;

  @Column({ nullable: true })
  paymentId: string;

  @Column({ type: 'jsonb' })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  subtotal: number;
  variantId?: string;
  // Snapshot of the variant's attributes at order time, so historical
  // orders render correctly even if the variant is later edited/deleted.
  variantAttributes?: Record<string, string>;
}
