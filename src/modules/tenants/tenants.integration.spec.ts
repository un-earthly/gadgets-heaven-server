import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { TenantsService, DEFAULT_TENANT_ID, SECOND_TENANT_ID } from './tenants.service';
import { tenantStorage } from './tenant.context';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';

describe('Tenants Integration Proof (Real DB)', () => {
    let module: TestingModule;
    let app: INestApplication;
    let tenantsService: TenantsService;
    let categoryRepository: Repository<Category>;
    let productRepository: Repository<Product>;
    let userRepository: Repository<User>;
    let jwtService: JwtService;

    let tokenA: string;
    let tokenB: string;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = module.createNestApplication();
        await app.init();

        tenantsService = module.get<TenantsService>(TenantsService);
        categoryRepository = module.get<Repository<Category>>(getRepositoryToken(Category));
        productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
        userRepository = module.get<Repository<User>>(getRepositoryToken(User));
        jwtService = module.get<JwtService>(JwtService);

        // Ensure database is seeded
        await tenantsService.onModuleInit();

        // Get users and generate tokens
        const userA = await userRepository.findOne({ where: { email: 'admin@gadgetsheaven.com' } });
        const userB = await userRepository.findOne({ where: { email: 'vendor@jerseymania.com' } });

        if (!userA || !userB) {
            throw new Error('Seeded users not found');
        }

        tokenA = jwtService.sign({ sub: userA.id, email: userA.email, role: userA.role });
        tokenB = jwtService.sign({ sub: userB.id, email: userB.email, role: userB.role });
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });

    it('should have seeded both tenants successfully', async () => {
        const tenantA = await tenantsService.findById(DEFAULT_TENANT_ID);
        const tenantB = await tenantsService.findById(SECOND_TENANT_ID);

        expect(tenantA).toBeDefined();
        expect(tenantA?.slug).toBe('gadgets-heaven');

        expect(tenantB).toBeDefined();
        expect(tenantB?.slug).toBe('jersey-mania');
    });

    it('should isolate data during querying (Tenant B cannot see Tenant A)', async () => {
        const jerseyCategory = await tenantStorage.run({ tenantId: SECOND_TENANT_ID, slug: 'jersey-mania' }, async () => {
            return categoryRepository.findOne({ where: { slug: 'jerseys' } });
        });
        expect(jerseyCategory).toBeDefined();
        expect(jerseyCategory?.name).toBe('Jerseys');

        await tenantStorage.run({ tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' }, async () => {
            await expect(categoryRepository.findOne({ where: { id: jerseyCategory!.id } })).rejects.toThrow(
                ForbiddenException
            );
        });
    });

    it('should isolate data during querying (Tenant A cannot see Tenant B)', async () => {
        const jerseyProduct = await tenantStorage.run({ tenantId: SECOND_TENANT_ID, slug: 'jersey-mania' }, async () => {
            return productRepository.findOne({ where: { sku: 'BD-CRIC-01' } });
        });
        expect(jerseyProduct).toBeDefined();
        expect(jerseyProduct?.name).toBe('Bangladesh Cricket Jersey');

        await tenantStorage.run({ tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' }, async () => {
            await expect(productRepository.findOne({ where: { id: jerseyProduct!.id } })).rejects.toThrow(
                ForbiddenException
            );
        });
    });

    it('should allow public endpoints to be accessed without authentication', async () => {
        // GET /products is public
        await request(app.getHttpServer())
            .get('/products')
            .set('x-tenant-slug', 'gadgets-heaven')
            .expect(200);
    });

    it('should reject access to Tenant A admin endpoints using Tenant B token', async () => {
        // POST /products requires authentication.
        // Hitting it resolved to Tenant A but carrying Tenant B token must return 401 or 403.
        await request(app.getHttpServer())
            .post('/products')
            .set('x-tenant-slug', 'gadgets-heaven')
            .set('Authorization', `Bearer ${tokenB}`)
            .send({
                name: 'New Product',
                description: 'Test',
                price: 10,
                stockQuantity: 5,
                categories: ['test'],
            })
            .expect(res => {
                if (res.status !== 401 && res.status !== 403) {
                    throw new Error(`Expected 401 or 403, got ${res.status}`);
                }
            });
    });

    it('should reject cross-tenant access to orders, reviews, users, and finance endpoints', async () => {
        const endpoints = [
            { method: 'get', path: '/orders' },
            { method: 'get', path: '/reviews' },
            { method: 'get', path: '/users' },
            { method: 'get', path: '/inventory' },
            { method: 'get', path: '/bulk-orders' },
            { method: 'get', path: '/payments' },
            { method: 'get', path: '/wishlist' },
            { method: 'get', path: '/transactions' },
            { method: 'get', path: '/invoices' },
            { method: 'get', path: '/payouts' },
            { method: 'get', path: '/installments' },
        ];

        for (const endpoint of endpoints) {
            // Verify that calling Tenant A with Tenant B JWT is rejected with 401 or 403
            const req = (request(app.getHttpServer()) as any)[endpoint.method](endpoint.path)
                .set('x-tenant-slug', 'gadgets-heaven')
                .set('Authorization', `Bearer ${tokenB}`);

            await req.expect(res => {
                if (res.status !== 401 && res.status !== 403) {
                    throw new Error(`Expected 401 or 403, got ${res.status} on ${endpoint.path}`);
                }
            });
        }
    });

    it('should allow access to Tenant B admin endpoints using Tenant B token', async () => {
        await request(app.getHttpServer())
            .get('/inventory')
            .set('x-tenant-slug', 'jersey-mania')
            .set('Authorization', `Bearer ${tokenB}`)
            .expect(200);
    });
});
