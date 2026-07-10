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

// Full description of a tenant to provision: branding, first admin, category
// taxonomy and seed products (each optionally with stock-tracked variants).
export interface ProvisionTenantVariantSpec {
  attributes?: Record<string, string>;
  sku?: string;
  stockQuantity: number;
  priceOverride?: number | null;
}
export interface ProvisionTenantProductSpec {
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
  sku?: string;
  categories?: string[];
  variants?: ProvisionTenantVariantSpec[];
}
export interface ProvisionTenantSpec {
  id?: string; // fixed id (seed only); omit for real onboarding
  name: string;
  slug: string;
  logoUrl?: string;
  themePrimaryColor?: string;
  themeSecondaryColor?: string;
  contactPhone?: string;
  contactEmail?: string;
  footerText?: string;
  activePaymentMethods?: string[];
  activeCourier?: string;
  simpleMode?: boolean; // defaults to true via the entity default
  admin: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
  };
  categories?: { name: string; slug: string; description?: string }[];
  products?: ProvisionTenantProductSpec[];
}

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

  async updateTenantBranding(
    tenantId: string,
    dto: {
      name?: string;
      logoUrl?: string;
      themePrimaryColor?: string;
      themeSecondaryColor?: string;
      contactPhone?: string;
      contactEmail?: string;
      simpleMode?: boolean;
    },
  ): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (dto.name !== undefined) tenant.name = dto.name;
    if (dto.logoUrl !== undefined) tenant.logoUrl = dto.logoUrl;
    if (dto.themePrimaryColor !== undefined) tenant.themePrimaryColor = dto.themePrimaryColor;
    if (dto.themeSecondaryColor !== undefined) tenant.themeSecondaryColor = dto.themeSecondaryColor;
    if (dto.contactPhone !== undefined) tenant.contactPhone = dto.contactPhone;
    if (dto.contactEmail !== undefined) tenant.contactEmail = dto.contactEmail;
    if (dto.simpleMode !== undefined) tenant.simpleMode = dto.simpleMode;

    return this.tenantRepository.save(tenant);
  }

  // ---- Reusable tenant onboarding (V1-STEP 10) --------------------------
  // Single generalized provisioning path used by BOTH the seed routine and
  // the onboard-tenant CLI, so there is never a copy-pasted per-tenant script.
  // Idempotent by slug. New tenants inherit simpleMode=true from the entity
  // default unless the spec overrides it. All rows are written with an
  // explicit tenantId because provisioning runs outside a request's tenant
  // context (the TenantSubscriber only auto-fills tenantId within a request).
  async provisionTenant(spec: ProvisionTenantSpec): Promise<Tenant> {
    const existing = await this.tenantRepository.findOne({
      where: { slug: spec.slug },
    });
    if (existing) {
      this.logger.log(
        `Tenant "${spec.slug}" already exists — skipping provision.`,
      );
      return existing;
    }

    this.logger.log(`Provisioning tenant: ${spec.name} (${spec.slug})`);
    const tenant = this.tenantRepository.create({
      ...(spec.id ? { id: spec.id } : {}),
      name: spec.name,
      slug: spec.slug,
      status: TenantStatus.ACTIVE,
      activePaymentMethods: spec.activePaymentMethods ?? ['cod'],
      activeCourier: spec.activeCourier ?? 'steadfast',
      footerText: spec.footerText ?? `© ${spec.name}. All rights reserved.`,
      logoUrl: spec.logoUrl,
      themePrimaryColor: spec.themePrimaryColor,
      themeSecondaryColor: spec.themeSecondaryColor,
      contactPhone: spec.contactPhone,
      contactEmail: spec.contactEmail,
      ...(spec.simpleMode !== undefined ? { simpleMode: spec.simpleMode } : {}),
    });
    await this.tenantRepository.save(tenant);

    // Initial admin user
    const admin = this.userRepository.create({
      tenantId: tenant.id,
      email: spec.admin.email,
      password: spec.admin.password,
      firstName: spec.admin.firstName,
      lastName: spec.admin.lastName ?? 'Admin',
      role: UserRole.ADMIN,
      isActive: true,
    });
    await this.userRepository.save(admin);

    // Category taxonomy
    for (const cat of spec.categories ?? []) {
      const category = this.categoryRepository.create({
        tenantId: tenant.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
      });
      await this.categoryRepository.save(category);
    }

    // Seed products (with optional variants)
    for (const p of spec.products ?? []) {
      const product = this.productRepository.create({
        tenantId: tenant.id,
        name: p.name,
        description: p.description ?? '',
        price: p.price,
        stockQuantity: p.stockQuantity,
        sku: p.sku,
        categories: p.categories ?? [],
        status: ProductStatus.PUBLISHED,
      });
      await this.productRepository.save(product);

      for (const v of p.variants ?? []) {
        const variant = this.variantRepository.create({
          tenantId: tenant.id,
          productId: product.id,
          attributes: v.attributes ?? {},
          sku: v.sku,
          stockQuantity: v.stockQuantity,
          priceOverride: v.priceOverride ?? null,
        });
        await this.variantRepository.save(variant);
      }
    }

    this.logger.log(
      `Provisioned tenant ${tenant.slug} (id=${tenant.id}) with admin ${admin.email}`,
    );
    return tenant;
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

      // Second tenant (isolation proof) — provisioned through the same
      // reusable path a real new tenant uses. L is deliberately low-stock and
      // XL zero-stock so the per-variant out-of-stock UI has real data.
      await this.provisionTenant({
        id: SECOND_TENANT_ID,
        name: 'Jersey Mania',
        slug: 'jersey-mania',
        activePaymentMethods: ['cod'],
        activeCourier: 'steadfast',
        logoUrl: '/logo-beige.png',
        themePrimaryColor: '#059669',
        themeSecondaryColor: '#d1fae5',
        contactPhone: '+8801900000000',
        contactEmail: 'info@jerseymania.com',
        admin: {
          email: 'vendor@jerseymania.com',
          password: 'password123',
          firstName: 'Jersey',
          lastName: 'Vendor',
        },
        categories: [
          { name: 'Jerseys', slug: 'jerseys', description: 'Quality sports jerseys' },
        ],
        products: [
          {
            name: 'Bangladesh Cricket Jersey',
            description: 'Official replica cricket jersey',
            price: 1200,
            stockQuantity: 50,
            sku: 'BD-CRIC-01',
            categories: ['sports', 'jerseys'],
            variants: [
              { attributes: { size: 'S' }, sku: 'BD-CRIC-01-S', stockQuantity: 20 },
              { attributes: { size: 'M' }, sku: 'BD-CRIC-01-M', stockQuantity: 15 },
              { attributes: { size: 'L' }, sku: 'BD-CRIC-01-L', stockQuantity: 2 },
              { attributes: { size: 'XL' }, sku: 'BD-CRIC-01-XL', stockQuantity: 0 },
            ],
          },
        ],
      });

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

}
