import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantsService } from '../tenants.service';
import { tenantStorage } from '../tenant.context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantsService: TenantsService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    let slug = req.headers['x-tenant-slug'] as string;
    const tenantIdHeader = req.headers['x-tenant-id'] as string;

    if (!slug && !tenantIdHeader) {
      const hostname = req.hostname;
      const parts = hostname.split('.');
      if (parts.length > 1) {
        const possibleSlug = parts[0];
        if (
          possibleSlug !== 'localhost' &&
          possibleSlug !== 'www' &&
          possibleSlug !== 'api'
        ) {
          slug = possibleSlug;
        }
      }
    }

    let tenant;
    if (tenantIdHeader) {
      tenant = await this.tenantsService.findById(tenantIdHeader);
    } else {
      const targetSlug = slug || 'gadgets-heaven';
      tenant = await this.tenantsService.findBySlug(targetSlug);
    }

    if (!tenant) {
      throw new NotFoundException(`Tenant not found`);
    }

    (req as any).tenant = tenant;

    tenantStorage.run({ tenantId: tenant.id, slug: tenant.slug }, () => {
      next();
    });
  }
}
