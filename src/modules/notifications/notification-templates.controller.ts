import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEnum, IsString } from 'class-validator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  NotificationTemplate,
  NotificationEvent,
} from './entities/notification-template.entity';
import { getTenantId } from '../tenants/tenant.context';

export class UpsertTemplateDto {
  @IsEnum(NotificationEvent)
  event: NotificationEvent;

  @IsString()
  body: string;
}

@ApiTags('notifications')
@Controller('notification-templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationTemplatesController {
  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
  ) {}

  @Get()
  @ApiOperation({ summary: "List the current tenant's WhatsApp templates" })
  async list(): Promise<NotificationTemplate[]> {
    const tenantId = getTenantId();
    if (!tenantId) throw new BadRequestException('Tenant context not resolved');
    return this.templateRepository.find({ where: { tenantId } });
  }

  @Put()
  @ApiOperation({
    summary: 'Create or update a WhatsApp template for an event',
  })
  async upsert(@Body() dto: UpsertTemplateDto): Promise<NotificationTemplate> {
    const tenantId = getTenantId();
    if (!tenantId) throw new BadRequestException('Tenant context not resolved');

    let template = await this.templateRepository.findOne({
      where: { tenantId, event: dto.event, channel: 'whatsapp' },
    });
    if (template) {
      template.body = dto.body;
    } else {
      template = this.templateRepository.create({
        event: dto.event,
        channel: 'whatsapp',
        body: dto.body,
      });
    }
    return this.templateRepository.save(template);
  }
}
