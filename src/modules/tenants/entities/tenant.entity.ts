import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TenantStatus {
    ACTIVE = 'active',
    TRIAL = 'trial',
    SUSPENDED = 'suspended'
}

@Entity('tenants')
export class Tenant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ unique: true })
    slug: string; // Subdomain e.g. "gadgets-heaven"

    @Column({ nullable: true })
    logoUrl: string;

    @Column({ nullable: true })
    themePrimaryColor: string;

    @Column({ nullable: true })
    themeSecondaryColor: string;

    @Column({ nullable: true })
    contactPhone: string;

    @Column({ nullable: true })
    contactEmail: string;

    @Column('jsonb', { default: [] })
    activePaymentMethods: string[]; // e.g., ['cod', 'sslcommerz']

    @Column({ nullable: true })
    activeCourier: string; // e.g. 'steadfast'

    @Column({ nullable: true })
    categoryTaxonomyRef: string;

    @Column({ nullable: true })
    footerText: string;

    @Column({
        type: 'enum',
        enum: TenantStatus,
        default: TenantStatus.ACTIVE
    })
    status: TenantStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
