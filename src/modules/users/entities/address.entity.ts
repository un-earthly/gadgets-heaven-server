import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  addressLine1: string;

  @Column({ type: 'varchar', nullable: true })
  addressLine2: string;

  @Column()
  city: string;

  @Column({ type: 'varchar', nullable: true })
  state: string;

  @Column({ type: 'varchar', nullable: true })
  postalCode: string;

  @Column()
  country: string;

  @Column()
  phoneNumber: string;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
