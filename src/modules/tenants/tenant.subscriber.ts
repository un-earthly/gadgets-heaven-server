import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  Connection,
} from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { getTenantId } from './tenant.context';
import { ForbiddenException } from '@nestjs/common';

@Injectable()
@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {
    this.connection.subscribers.push(this);
  }

  afterLoad(entity: any) {
    const tenantId = getTenantId();
    if (tenantId && entity && 'tenantId' in entity) {
      if (entity.tenantId && entity.tenantId !== tenantId) {
        throw new ForbiddenException(
          `Access Denied: Tenant isolation violation.`,
        );
      }
    }
  }

  beforeInsert(event: InsertEvent<any>) {
    const tenantId = getTenantId();
    if (tenantId && 'tenantId' in event.entity) {
      event.entity.tenantId = tenantId;
    }
  }

  beforeUpdate(event: UpdateEvent<any>) {
    const tenantId = getTenantId();
    if (tenantId) {
      if (
        event.entity &&
        'tenantId' in event.entity &&
        event.entity.tenantId !== tenantId
      ) {
        throw new ForbiddenException(
          `Access Denied: Cannot update another tenant's data.`,
        );
      }
      if (
        event.databaseEntity &&
        'tenantId' in event.databaseEntity &&
        event.databaseEntity.tenantId !== tenantId
      ) {
        throw new ForbiddenException(
          `Access Denied: Cannot update another tenant's data.`,
        );
      }
    }
  }

  beforeRemove(event: RemoveEvent<any>) {
    const tenantId = getTenantId();
    if (tenantId) {
      if (
        event.entity &&
        'tenantId' in event.entity &&
        event.entity.tenantId !== tenantId
      ) {
        throw new ForbiddenException(
          `Access Denied: Cannot delete another tenant's data.`,
        );
      }
      if (
        event.databaseEntity &&
        'tenantId' in event.databaseEntity &&
        event.databaseEntity.tenantId !== tenantId
      ) {
        throw new ForbiddenException(
          `Access Denied: Cannot delete another tenant's data.`,
        );
      }
    }
  }
}
