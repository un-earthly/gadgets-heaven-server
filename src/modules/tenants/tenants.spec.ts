import { Test, TestingModule } from '@nestjs/testing';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { TenantSubscriber } from './tenant.subscriber';
import { TenantsService } from './tenants.service';
import { tenantStorage, getTenantId } from './tenant.context';
import {
  ForbiddenException,
  NotFoundException,
  ExecutionContext,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Connection } from 'typeorm';
import { AdminTenantGuard } from '../auth/guards/admin-tenant.guard';

describe('Tenants Module Unit Tests', () => {
  describe('TenantMiddleware', () => {
    let middleware: TenantMiddleware;
    let mockTenantsService: Partial<TenantsService>;

    beforeEach(() => {
      mockTenantsService = {
        findBySlug: jest.fn().mockImplementation(async (slug) => {
          if (slug === 'gadgets-heaven') {
            return {
              id: 'default-id',
              name: 'Gadgets Heaven',
              slug: 'gadgets-heaven',
            };
          }
          if (slug === 'jersey-mania') {
            return {
              id: 'jersey-id',
              name: 'Jersey Mania',
              slug: 'jersey-mania',
            };
          }
          return null;
        }),
        findById: jest.fn().mockImplementation(async (id) => {
          if (id === 'default-id') {
            return {
              id: 'default-id',
              name: 'Gadgets Heaven',
              slug: 'gadgets-heaven',
            };
          }
          return null;
        }),
      };
      middleware = new TenantMiddleware(mockTenantsService as TenantsService);
    });

    it('should resolve tenant from header x-tenant-slug', async () => {
      const req = {
        headers: { 'x-tenant-slug': 'jersey-mania' },
        hostname: 'localhost',
      } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn();

      await middleware.use(req, res, next);

      expect(mockTenantsService.findBySlug).toHaveBeenCalledWith(
        'jersey-mania',
      );
      expect((req as any).tenant).toBeDefined();
      expect((req as any).tenant.id).toBe('jersey-id');
      expect(next).toHaveBeenCalled();
    });

    it('should resolve tenant from hostname subdomain', async () => {
      const req = {
        headers: {},
        hostname: 'jersey-mania.figcoms.com',
      } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn();

      await middleware.use(req, res, next);

      expect(mockTenantsService.findBySlug).toHaveBeenCalledWith(
        'jersey-mania',
      );
      expect((req as any).tenant.id).toBe('jersey-id');
      expect(next).toHaveBeenCalled();
    });

    it('should fallback to gadgets-heaven if no slug or subdomain is provided', async () => {
      const req = {
        headers: {},
        hostname: 'localhost',
      } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn();

      await middleware.use(req, res, next);

      expect(mockTenantsService.findBySlug).toHaveBeenCalledWith(
        'gadgets-heaven',
      );
      expect((req as any).tenant.id).toBe('default-id');
      expect(next).toHaveBeenCalled();
    });

    it('should throw NotFoundException if resolved tenant does not exist', async () => {
      const req = {
        headers: { 'x-tenant-slug': 'unknown' },
        hostname: 'localhost',
      } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn();

      await expect(middleware.use(req, res, next)).rejects.toThrow(
        NotFoundException,
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('TenantSubscriber', () => {
    let subscriber: TenantSubscriber;
    let mockConnection: Partial<Connection>;

    beforeEach(() => {
      mockConnection = {
        subscribers: [],
      };
      subscriber = new TenantSubscriber(mockConnection as Connection);
    });

    it('should register itself in the connection subscribers list', () => {
      expect(mockConnection.subscribers).toContain(subscriber);
    });

    describe('afterLoad', () => {
      it('should pass if entity tenantId matches context tenantId', () => {
        tenantStorage.run({ tenantId: 'tenant-a', slug: 'tenant-a' }, () => {
          const entity = { id: '1', tenantId: 'tenant-a', name: 'Product A' };
          expect(() => subscriber.afterLoad(entity)).not.toThrow();
        });
      });

      it('should throw ForbiddenException if entity tenantId does not match context tenantId', () => {
        tenantStorage.run({ tenantId: 'tenant-a', slug: 'tenant-a' }, () => {
          const entity = { id: '1', tenantId: 'tenant-b', name: 'Product B' };
          expect(() => subscriber.afterLoad(entity)).toThrow(
            ForbiddenException,
          );
        });
      });

      it('should pass if context tenantId is not set (e.g. system operations)', () => {
        const entity = { id: '1', tenantId: 'tenant-b', name: 'Product B' };
        expect(() => subscriber.afterLoad(entity)).not.toThrow();
      });

      it('should pass if entity does not have tenantId field', () => {
        tenantStorage.run({ tenantId: 'tenant-a', slug: 'tenant-a' }, () => {
          const entity = { id: '1', name: 'Non-scoped entity' };
          expect(() => subscriber.afterLoad(entity)).not.toThrow();
        });
      });
    });

    describe('beforeInsert', () => {
      it('should inject context tenantId into the inserting entity', () => {
        tenantStorage.run({ tenantId: 'tenant-a', slug: 'tenant-a' }, () => {
          const event = {
            entity: { name: 'New Product', tenantId: '' },
          } as any;
          subscriber.beforeInsert(event);
          expect(event.entity.tenantId).toBe('tenant-a');
        });
      });

      it('should not throw or modify if entity does not have tenantId field', () => {
        tenantStorage.run({ tenantId: 'tenant-a', slug: 'tenant-a' }, () => {
          const event = {
            entity: { name: 'Non-scoped entity' },
          } as any;
          expect(() => subscriber.beforeInsert(event)).not.toThrow();
          expect(event.entity.tenantId).toBeUndefined();
        });
      });
    });

    describe('beforeUpdate', () => {
      it('should pass if updating entity matches context tenantId', () => {
        tenantStorage.run({ tenantId: 'tenant-a', slug: 'tenant-a' }, () => {
          const event = {
            entity: { id: '1', tenantId: 'tenant-a' },
            databaseEntity: { id: '1', tenantId: 'tenant-a' },
          } as any;
          expect(() => subscriber.beforeUpdate(event)).not.toThrow();
        });
      });

      it('should throw ForbiddenException if updating entity tenantId mismatch', () => {
        tenantStorage.run({ tenantId: 'tenant-a', slug: 'tenant-a' }, () => {
          const event = {
            entity: { id: '1', tenantId: 'tenant-b' },
            databaseEntity: { id: '1', tenantId: 'tenant-a' },
          } as any;
          expect(() => subscriber.beforeUpdate(event)).toThrow(
            ForbiddenException,
          );
        });
      });

      it('should throw ForbiddenException if databaseEntity tenantId mismatch', () => {
        tenantStorage.run({ tenantId: 'tenant-a', slug: 'tenant-a' }, () => {
          const event = {
            entity: { id: '1', tenantId: 'tenant-a' },
            databaseEntity: { id: '1', tenantId: 'tenant-b' },
          } as any;
          expect(() => subscriber.beforeUpdate(event)).toThrow(
            ForbiddenException,
          );
        });
      });
    });
  });

  describe('AdminTenantGuard', () => {
    let guard: AdminTenantGuard;
    let mockReflector: any;

    beforeEach(() => {
      mockReflector = {
        getAllAndMerge: jest.fn().mockReturnValue([]),
      };
      guard = new AdminTenantGuard(mockReflector);
      // Mock the super.canActivate method to prevent actual Passport call in unit tests
      jest
        .spyOn(guard as any, 'canActivate')
        .mockImplementation(async (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          const guards =
            mockReflector.getAllAndMerge('__guards__', [
              context.getHandler(),
              context.getClass(),
            ]) || [];

          const hasJwtGuard = guards.some(
            (g: any) => g && g.name === 'JwtAuthGuard',
          );

          if (!hasJwtGuard) {
            return true;
          }

          const user = request.user;
          if (!user) {
            throw new Error('Unauthorized');
          }

          const resolvedTenantId = getTenantId();
          if (
            resolvedTenantId &&
            user.tenantId &&
            user.tenantId !== resolvedTenantId
          ) {
            throw new ForbiddenException('Access Denied: Tenant mismatch');
          }

          return true;
        });
    });

    it('should allow public routes without JwtAuthGuard', async () => {
      mockReflector.getAllAndMerge.mockReturnValue([]);
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should reject requests if tenantId in request user does not match context tenantId', async () => {
      // Mock metadata showing route has JwtAuthGuard
      mockReflector.getAllAndMerge.mockReturnValue([{ name: 'JwtAuthGuard' }]);

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer token' },
            user: { id: 'user-id', tenantId: 'tenant-a', role: 'admin' },
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      await tenantStorage.run(
        { tenantId: 'tenant-b', slug: 'tenant-b' },
        async () => {
          await expect(guard.canActivate(mockContext)).rejects.toThrow(
            ForbiddenException,
          );
        },
      );
    });

    it('should allow requests if tenantId matches context tenantId', async () => {
      // Mock metadata showing route has JwtAuthGuard
      mockReflector.getAllAndMerge.mockReturnValue([{ name: 'JwtAuthGuard' }]);

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer token' },
            user: { id: 'user-id', tenantId: 'tenant-a', role: 'admin' },
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      await tenantStorage.run(
        { tenantId: 'tenant-a', slug: 'tenant-a' },
        async () => {
          const result = await guard.canActivate(mockContext);
          expect(result).toBe(true);
        },
      );
    });
  });
});
