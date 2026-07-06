import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService) {}

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
