import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository, InjectConnection } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm';
import { Tenant, TenantStatus } from './entities/tenant.entity';
import { Category } from '../categories/entities/category.entity';
import { Product, ProductStatus } from '../products/entities/product.entity';
import { User, UserRole } from '../users/entities/user.entity';

export const DEFAULT_TENANT_ID = 'de7a5e8f-7e04-4b5a-93ef-3c588523c91d';
export const SECOND_TENANT_ID = 'c2b7d59b-1349-4f76-8f23-5e8c187b5a8e';

@Injectable()
export class TenantsService implements OnModuleInit {
    private readonly logger = new Logger(TenantsService.name);

    constructor(
        @InjectRepository(Tenant)
        private readonly tenantRepository: Repository<Tenant>,
        @InjectRepository(Category)
        private readonly categoryRepository: Repository<Category>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectConnection()
        private readonly connection: Connection,
    ) {}

    async onModuleInit() {
        await this.seedDefaultTenantAndMigrate();
    }

    async findById(id: string): Promise<Tenant | null> {
        return this.tenantRepository.findOne({ where: { id } });
    }

    async findBySlug(slug: string): Promise<Tenant | null> {
        return this.tenantRepository.findOne({ where: { slug } });
    }

    async create(tenantData: Partial<Tenant>): Promise<Tenant> {
        const tenant = this.tenantRepository.create(tenantData);
        return this.tenantRepository.save(tenant);
    }

    async seedDefaultTenantAndMigrate() {
        try {
            // Check if default tenant exists
            let defaultTenant = await this.tenantRepository.findOne({ where: { id: DEFAULT_TENANT_ID } });
            if (!defaultTenant) {
                // Check by slug in case ID is different
                defaultTenant = await this.tenantRepository.findOne({ where: { slug: 'gadgets-heaven' } });
                if (!defaultTenant) {
                    this.logger.log('Seeding default tenant: Gadgets Heaven');
                    defaultTenant = this.tenantRepository.create({
                        id: DEFAULT_TENANT_ID,
                        name: 'Gadgets Heaven',
                        slug: 'gadgets-heaven',
                        status: TenantStatus.ACTIVE,
                        activePaymentMethods: ['cod', 'sslcommerz'],
                        activeCourier: 'steadfast',
                        footerText: '© Gadgets Heaven. All rights reserved.',
                    });
                    await this.tenantRepository.save(defaultTenant);
                }
            }

            // Seed default admin user for Tenant A
            let defaultAdmin = await this.userRepository.findOne({ where: { email: 'admin@gadgetsheaven.com' } });
            if (!defaultAdmin) {
                this.logger.log('Seeding default admin user for Tenant A');
                defaultAdmin = this.userRepository.create({
                    tenantId: DEFAULT_TENANT_ID,
                    email: 'admin@gadgetsheaven.com',
                    password: 'password123',
                    firstName: 'Gadgets',
                    lastName: 'Admin',
                    role: UserRole.ADMIN,
                    isActive: true,
                });
                await this.userRepository.save(defaultAdmin);
            }

            const targetTenantId = defaultTenant.id;

            // Seed second tenant for isolation proof
            let secondTenant = await this.tenantRepository.findOne({ where: { id: SECOND_TENANT_ID } });
            if (!secondTenant) {
                secondTenant = await this.tenantRepository.findOne({ where: { slug: 'jersey-mania' } });
                if (!secondTenant) {
                    this.logger.log('Seeding second tenant: Jersey Mania');
                    secondTenant = this.tenantRepository.create({
                        id: SECOND_TENANT_ID,
                        name: 'Jersey Mania',
                        slug: 'jersey-mania',
                        status: TenantStatus.ACTIVE,
                        activePaymentMethods: ['cod'],
                        activeCourier: 'steadfast',
                        footerText: '© Jersey Mania. All rights reserved.',
                    });
                    await this.tenantRepository.save(secondTenant);

                    // Seed category for second tenant
                    const category = this.categoryRepository.create({
                        tenantId: SECOND_TENANT_ID,
                        name: 'Jerseys',
                        slug: 'jerseys',
                        description: 'Quality sports jerseys',
                    });
                    await this.categoryRepository.save(category);

                    // Seed product for second tenant
                    const product = this.productRepository.create({
                        tenantId: SECOND_TENANT_ID,
                        name: 'Bangladesh Cricket Jersey',
                        description: 'Official replica cricket jersey',
                        price: 1200,
                        stockQuantity: 50,
                        sku: 'BD-CRIC-01',
                        categories: ['sports', 'jerseys'],
                        status: ProductStatus.PUBLISHED,
                    });
                    await this.productRepository.save(product);

                    // Seed user for second tenant
                    const user = this.userRepository.create({
                        tenantId: SECOND_TENANT_ID,
                        email: 'vendor@jerseymania.com',
                        password: 'password123',
                        firstName: 'Jersey',
                        lastName: 'Vendor',
                        role: UserRole.VENDOR,
                        isActive: true,
                    });
                    await this.userRepository.save(user);
                }
            }

            // Migrate existing data where tenantId is null
            const tables = [
                'users', 'products', 'categories', 'orders', 'carts', 'inventory',
                'bulk_orders', 'reviews', 'wishlists', 'payments', 'installments',
                'transactions', 'payouts', 'invoices'
            ];

            for (const table of tables) {
                try {
                    // Check if column exists first
                    const columnCheck = await this.connection.query(`
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = '${table}' AND column_name = 'tenantId'
                    `);

                    if (columnCheck.length > 0) {
                        const result = await this.connection.query(`
                            UPDATE "${table}" 
                            SET "tenantId" = '${targetTenantId}' 
                            WHERE "tenantId" IS NULL
                        `);
                        if (result[1] > 0) {
                            this.logger.log(`Migrated ${result[1]} rows in table "${table}" to default tenant.`);
                        }
                    }
                } catch (err) {
                    this.logger.error(`Failed to migrate table "${table}": ${err.message}`);
                }
            }
        } catch (error) {
            this.logger.error(`Error seeding default tenant / running migration: ${error.message}`);
        }
    }
}
