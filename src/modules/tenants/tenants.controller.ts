import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { getTenantId } from './tenant.context';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateTenantCredentialsDto } from './dto/update-tenant-credentials.dto';

// Credential fields must never leave the API, even encrypted.
function sanitizeTenant(tenant: Tenant): Tenant {
  const copy = { ...tenant };
  delete (copy as Partial<Tenant>).sslcommerzStorePassword;
  delete (copy as Partial<Tenant>).steadfastApiKey;
  delete (copy as Partial<Tenant>).steadfastSecretKey;
  delete (copy as Partial<Tenant>).whatsappAccessToken;
  return copy as Tenant;
}

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
    return sanitizeTenant(tenant);
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
    return sanitizeTenant(tenant);
  }

  @Put('credentials')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Update current tenant integration credentials (encrypted at rest)',
  })
  @ApiResponse({ status: 200, description: 'Credentials updated' })
  async updateCredentials(
    @Body() dto: UpdateTenantCredentialsDto,
  ): Promise<Tenant> {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new NotFoundException('Tenant context not resolved');
    }
    const tenant = await this.tenantsService.updateCredentials(tenantId, dto);
    return sanitizeTenant(tenant);
  }
}
