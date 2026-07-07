import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository, InjectConnection } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm';
import { Tenant, TenantStatus } from './entities/tenant.entity';
import { Category } from '../categories/entities/category.entity';
import { Product, ProductStatus } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { encryptSecret } from '../../common/crypto.util';

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
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
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

  // Stores per-tenant integration credentials; secret values are encrypted
  // with the deployment-wide CREDENTIALS_ENCRYPTION_KEY before persisting.
  async updateCredentials(
    tenantId: string,
    dto: {
      sslcommerzStoreId?: string;
      sslcommerzStorePassword?: string;
      steadfastApiKey?: string;
      steadfastSecretKey?: string;
      whatsappPhoneNumberId?: string;
      whatsappAccessToken?: string;
      simpleMode?: boolean;
    },
  ): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (dto.sslcommerzStoreId !== undefined) {
      tenant.sslcommerzStoreId = dto.sslcommerzStoreId;
    }
    if (dto.sslcommerzStorePassword !== undefined) {
      tenant.sslcommerzStorePassword = encryptSecret(
        dto.sslcommerzStorePassword,
      );
    }
    if (dto.steadfastApiKey !== undefined) {
      tenant.steadfastApiKey = encryptSecret(dto.steadfastApiKey);
    }
    if (dto.steadfastSecretKey !== undefined) {
      tenant.steadfastSecretKey = encryptSecret(dto.steadfastSecretKey);
    }
    if (dto.whatsappPhoneNumberId !== undefined) {
      tenant.whatsappPhoneNumberId = dto.whatsappPhoneNumberId;
    }
    if (dto.whatsappAccessToken !== undefined) {
      tenant.whatsappAccessToken = encryptSecret(dto.whatsappAccessToken);
    }
    if (dto.simpleMode !== undefined) {
      tenant.simpleMode = dto.simpleMode;
    }

    return this.tenantRepository.save(tenant);
  }

  async seedDefaultTenantAndMigrate() {
    try {
      // Check if default tenant exists by slug
      let defaultTenant = await this.tenantRepository.findOne({
        where: { slug: 'gadgets-heaven' },
      });
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
          logoUrl: '/logo-text-dark.png',
          themePrimaryColor: '#ea580c',
          themeSecondaryColor: '#ffedd5',
          contactPhone: '+8801700000000',
          contactEmail: 'support@gadgetsheaven.com',
        });
        await this.tenantRepository.save(defaultTenant);
      } else {
        this.logger.log('Updating default tenant branding fields');
        defaultTenant.logoUrl = '/logo-text-dark.png';
        defaultTenant.themePrimaryColor = '#ea580c';
        defaultTenant.themeSecondaryColor = '#ffedd5';
        defaultTenant.contactPhone = '+8801700000000';
        defaultTenant.contactEmail = 'support@gadgetsheaven.com';
        await this.tenantRepository.save(defaultTenant);
      }

      // Seed default admin user for Tenant A
      let defaultAdmin = await this.userRepository.findOne({
        where: { email: 'admin@gadgetsheaven.com' },
      });
      if (!defaultAdmin) {
        this.logger.log('Seeding default admin user for Tenant A');
        defaultAdmin = this.userRepository.create({
          tenantId: defaultTenant.id,
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
      let secondTenant = await this.tenantRepository.findOne({
        where: { slug: 'jersey-mania' },
      });
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
          logoUrl: '/logo-beige.png',
          themePrimaryColor: '#059669',
          themeSecondaryColor: '#d1fae5',
          contactPhone: '+8801900000000',
          contactEmail: 'info@jerseymania.com',
        });
        await this.tenantRepository.save(secondTenant);

        // Seed category for second tenant
        const category = this.categoryRepository.create({
          tenantId: secondTenant.id,
          name: 'Jerseys',
          slug: 'jerseys',
          description: 'Quality sports jerseys',
        });
        await this.categoryRepository.save(category);

        // Seed product for second tenant
        const product = this.productRepository.create({
          tenantId: secondTenant.id,
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
          tenantId: secondTenant.id,
          email: 'vendor@jerseymania.com',
          password: 'password123',
          firstName: 'Jersey',
          lastName: 'Vendor',
          role: UserRole.VENDOR,
          isActive: true,
        });
        await this.userRepository.save(user);
      } else {
        this.logger.log('Updating second tenant branding fields');
        secondTenant.logoUrl = '/logo-beige.png';
        secondTenant.themePrimaryColor = '#059669';
        secondTenant.themeSecondaryColor = '#d1fae5';
        secondTenant.contactPhone = '+8801900000000';
        secondTenant.contactEmail = 'info@jerseymania.com';
        await this.tenantRepository.save(secondTenant);
      }

      await this.seedJerseyVariants();

      // Migrate existing data where tenantId is null
      const tables = [
        'users',
        'products',
        'categories',
        'orders',
        'carts',
        'inventory',
        'bulk_orders',
        'reviews',
        'wishlists',
        'payments',
        'installments',
        'transactions',
        'payouts',
        'invoices',
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
              this.logger.log(
                `Migrated ${result[1]} rows in table "${table}" to default tenant.`,
              );
            }
          }
        } catch (err) {
          this.logger.error(
            `Failed to migrate table "${table}": ${err.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error seeding default tenant / running migration: ${error.message}`,
      );
    }
  }

  // Real size variants for Jersey Mania's cricket jersey. L is deliberately
  // low-stock and XL deliberately zero-stock so the per-variant
  // out-of-stock UI has real data to validate against.
  private async seedJerseyVariants() {
    const product = await this.productRepository.findOne({
      where: {
        tenantId: SECOND_TENANT_ID,
        name: 'Bangladesh Cricket Jersey',
      },
    });
    if (!product) return;

    const existing = await this.variantRepository.count({
      where: { productId: product.id },
    });
    if (existing > 0) return;

    this.logger.log('Seeding size variants for Bangladesh Cricket Jersey');
    const sizes: { size: string; stock: number }[] = [
      { size: 'S', stock: 20 },
      { size: 'M', stock: 15 },
      { size: 'L', stock: 2 },
      { size: 'XL', stock: 0 },
    ];
    for (const { size, stock } of sizes) {
      const variant = this.variantRepository.create({
        tenantId: SECOND_TENANT_ID,
        productId: product.id,
        attributes: { size },
        sku: `BD-CRIC-01-${size}`,
        stockQuantity: stock,
        priceOverride: null,
      });
      await this.variantRepository.save(variant);
    }
  }
}
