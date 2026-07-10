import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getTenantId } from './tenant.context';
import { UpdateTenantCredentialsDto } from './dto/update-tenant-credentials.dto';

class UpdateBrandingDto {
  name?: string;
  logoUrl?: string;
  themePrimaryColor?: string;
  themeSecondaryColor?: string;
  contactPhone?: string;
  contactEmail?: string;
  simpleMode?: boolean;
}

@ApiTags('Admin Tenant Settings')
@Controller('admin/tenant-settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminTenantSettingsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current tenant settings' })
  @ApiResponse({ status: 200, description: 'Tenant settings retrieved' })
  async getSettings() {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not resolved');
    }
    const tenant = await this.tenantsService.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      themePrimaryColor: tenant.themePrimaryColor,
      themeSecondaryColor: tenant.themeSecondaryColor,
      contactPhone: tenant.contactPhone,
      contactEmail: tenant.contactEmail,
      simpleMode: tenant.simpleMode,
      sslcommerzStoreId: tenant.sslcommerzStoreId,
      whatsappPhoneNumberId: tenant.whatsappPhoneNumberId,
      hasSslcommerzStorePassword: !!tenant.sslcommerzStorePassword,
      hasSteadfastApiKey: !!tenant.steadfastApiKey,
      hasSteadfastSecretKey: !!tenant.steadfastSecretKey,
      hasWhatsappAccessToken: !!tenant.whatsappAccessToken,
    };
  }

  @Put()
  @ApiOperation({ summary: 'Update tenant branding' })
  @ApiResponse({ status: 200, description: 'Tenant branding updated' })
  async updateBranding(@Body() dto: UpdateBrandingDto) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not resolved');
    }
    return this.tenantsService.updateTenantBranding(tenantId, dto);
  }

  @Put('credentials')
  @ApiOperation({ summary: 'Update tenant integration credentials' })
  @ApiResponse({ status: 200, description: 'Credentials updated' })
  async updateCredentials(@Body() dto: UpdateTenantCredentialsDto) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not resolved');
    }
    return this.tenantsService.updateCredentials(tenantId, dto);
  }
}
