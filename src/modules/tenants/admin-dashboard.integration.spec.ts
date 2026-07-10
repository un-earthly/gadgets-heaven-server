import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { tenantStorage } from './tenant.context';
import { DEFAULT_TENANT_ID, SECOND_TENANT_ID, TenantsService } from './tenants.service';
import { decryptSecret } from '../../common/crypto.util';
import { JwtService } from '@nestjs/jwt';

describe('Admin Dashboard Integration Tests (Module 4)', () => {
  let app: INestApplication;
  let tenantRepository: Repository<Tenant>;
  let userRepository: Repository<User>;
  let productRepository: Repository<Product>;
  let orderRepository: Repository<Order>;
  let jwtService: JwtService;
  let tenantsService: TenantsService;

  let tenantAToken: string;
  let tenantBToken: string;
  let customerToken: string;

  let tenantA: any;
  let tenantB: any;

  beforeAll(async () => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = 'test-key-32-chars-long-must-be-unique-123';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    tenantRepository = moduleFixture.get<Repository<Tenant>>(getRepositoryToken(Tenant));
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    productRepository = moduleFixture.get<Repository<Product>>(getRepositoryToken(Product));
    orderRepository = moduleFixture.get<Repository<Order>>(getRepositoryToken(Order));
    jwtService = moduleFixture.get<JwtService>(JwtService);
    tenantsService = moduleFixture.get<TenantsService>(TenantsService);

    // Clean up existing test users first
    await userRepository.delete({ email: 'adminA@tenant-a.com' });
    await userRepository.delete({ email: 'adminB@tenant-b.com' });
    await userRepository.delete({ email: 'customer@tenant-a.com' });

    // Setup test tenants A and B
    tenantA = await tenantRepository.findOne({ where: { id: DEFAULT_TENANT_ID } });
    if (!tenantA) {
      tenantA = await tenantRepository.save(
        tenantRepository.create({
          id: DEFAULT_TENANT_ID,
          name: 'Tenant A',
          slug: 'gadgets-heaven',
          simpleMode: true,
        }),
      );
    }

    tenantB = await tenantRepository.findOne({ where: { id: SECOND_TENANT_ID } });
    if (!tenantB) {
      const conflicting = await tenantRepository.findOne({ where: { slug: 'tenant-b' } });
      if (conflicting) {
        conflicting.slug = 'tenant-b-renamed-' + Date.now();
        await tenantRepository.save(conflicting);
      }
      tenantB = await tenantRepository.save(
        tenantRepository.create({
          id: SECOND_TENANT_ID,
          name: 'Tenant B',
          slug: 'tenant-b',
          simpleMode: true,
        }),
      );
    } else if (tenantB.slug !== 'tenant-b') {
      tenantB.slug = 'tenant-b';
      await tenantRepository.save(tenantB);
    }

    // Create Tenant A admin
    const adminA = await userRepository.save(
      userRepository.create({
        email: 'adminA@tenant-a.com',
        password: 'password123',
        role: UserRole.ADMIN,
        tenantId: tenantA.id,
        firstName: 'Admin',
        lastName: 'A',
      }),
    );
    tenantAToken = jwtService.sign({ sub: adminA.id, email: adminA.email, role: adminA.role, tenantId: adminA.tenantId });

    // Create Tenant B admin
    const adminB = await userRepository.save(
      userRepository.create({
        email: 'adminB@tenant-b.com',
        password: 'password123',
        role: UserRole.ADMIN,
        tenantId: tenantB.id,
        firstName: 'Admin',
        lastName: 'B',
      }),
    );
    tenantBToken = jwtService.sign({ sub: adminB.id, email: adminB.email, role: adminB.role, tenantId: adminB.tenantId });

    // Create Tenant A customer (regular user role)
    const customer = await userRepository.save(
      userRepository.create({
        email: 'customer@tenant-a.com',
        password: 'password123',
        role: UserRole.CUSTOMER,
        tenantId: tenantA.id,
        firstName: 'Customer',
        lastName: 'User',
      }),
    );
    customerToken = jwtService.sign({ sub: customer.id, email: customer.email, role: customer.role, tenantId: customer.tenantId });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Role Authorization and tenant isolation', () => {
    it('should deny access to regular customer', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('x-tenant-slug', tenantA.slug)
        .expect(403);
    });

    it('should allow access to admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-tenant-slug', tenantA.slug)
        .expect(200);

      expect(res.body).toHaveProperty('todayOrderCount');
      expect(res.body).toHaveProperty('lowStockProductCount');
    });

    it('should deny cross-tenant access even with valid token', async () => {
      // Tenant A admin tries to fetch from Tenant B using Tenant B slug
      await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-tenant-slug', 'tenant-b')
        .expect(401);
    });
  });

  describe('2. Credentials update, encryption and round-trip', () => {
    it('should correctly save, encrypt and decrypt settings', async () => {
      // Update credentials
      await request(app.getHttpServer())
        .put('/api/v1/admin/tenant-settings/credentials')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-tenant-slug', tenantA.slug)
        .send({
          sslcommerzStoreId: 'test-store-123',
          sslcommerzStorePassword: 'my-secret-password',
          steadfastApiKey: 'steadfast-api-key',
          steadfastSecretKey: 'steadfast-secret-key',
        })
        .expect(200);

      // Verify at the database level that they are encrypted
      const dbTenant = await tenantRepository.findOne({ where: { id: tenantA.id } });
      expect(dbTenant?.sslcommerzStoreId).toBe('test-store-123');
      expect(dbTenant?.sslcommerzStorePassword).not.toBe('my-secret-password');
      expect(dbTenant?.sslcommerzStorePassword).toContain('.'); // AES format: iv.tag.ciphertext

      // Decrypt and confirm
      expect(decryptSecret(dbTenant!.sslcommerzStorePassword)).toBe('my-secret-password');
      expect(decryptSecret(dbTenant!.steadfastApiKey)).toBe('steadfast-api-key');
      expect(decryptSecret(dbTenant!.steadfastSecretKey)).toBe('steadfast-secret-key');

      // Get from API - should mask credentials
      const apiRes = await request(app.getHttpServer())
        .get('/api/v1/admin/tenant-settings')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-tenant-slug', tenantA.slug)
        .expect(200);

      expect(apiRes.body.sslcommerzStoreId).toBe('test-store-123');
      expect(apiRes.body.hasSslcommerzStorePassword).toBe(true);
      expect(apiRes.body.hasSteadfastApiKey).toBe(true);
    });
  });

  describe('3. Product soft-delete support', () => {
    it('should soft delete and exclude product from standard lists', async () => {
      // Create a product
      const product = await productRepository.save(
        productRepository.create({
          tenantId: tenantA.id,
          name: 'Integration Test Product',
          description: 'A test product',
          price: 150.00,
          stockQuantity: 10,
          categories: ['test'],
        }),
      );

      // Soft delete it
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/products/${product.id}`)
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-tenant-slug', tenantA.slug)
        .expect(200);

      // Verify that it is not returned in list but remains in DB with deletedAt populated
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-tenant-slug', tenantA.slug);

      const foundInList = listRes.body.items.some((p: any) => p.id === product.id);
      expect(foundInList).toBe(false);

      const dbProduct = await productRepository.findOne({
        where: { id: product.id },
        withDeleted: true,
      });
      expect(dbProduct).toBeDefined();
      expect(dbProduct?.deletedAt).not.toBeNull();
    });
  });
});
