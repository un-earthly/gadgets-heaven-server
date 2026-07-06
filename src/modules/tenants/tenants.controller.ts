import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { getTenantId } from './tenant.context';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService) {}

    @Get('branding')
    @ApiOperation({ summary: 'Get current tenant branding details' })
    @ApiResponse({ status: 200, description: 'Tenant branding details' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    async getBranding(): Promise<Tenant> {
        const tenantId = getTenantId();
        if (!tenantId) {
            throw new NotFoundException('Tenant context not resolved');
        }
        const tenant = await this.tenantsService.findById(tenantId);
        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }
        return tenant;
    }

    @Get('by-slug/:slug')
    @ApiOperation({ summary: 'Get tenant branding and details by slug' })
    @ApiResponse({ status: 200, description: 'Tenant details' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    async getBySlug(@Param('slug') slug: string): Promise<Tenant> {
        const tenant = await this.tenantsService.findBySlug(slug);
        if (!tenant) {
            throw new NotFoundException(`Tenant with slug "${slug}" not found`);
        }
        return tenant;
    }
}
