import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { Product } from './product.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('product_variants')
@Unique(['tenantId', 'sku'])
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
  })
  product: Product;

  @Column()
  productId: string;

  @Column({ type: 'jsonb' })
  attributes: Record<string, string>;

  @Column()
  sku: string;

  @Column('int')
  stockQuantity: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  priceOverride: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
