import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { WhatsAppService } from './whatsapp.service';
import {
  NotificationTemplate,
  NotificationEvent,
} from '../entities/notification-template.entity';
import { TenantsService } from '../../tenants/tenants.service';
import { decryptSecret } from '../../../common/crypto.util';

export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WHATSAPP = 'whatsapp',
}

const DEFAULT_TEMPLATES: Record<NotificationEvent, string> = {
  [NotificationEvent.ORDER_PLACED]:
    'Thank you for your order at {{storeName}}! Your order {{orderId}} for ৳{{amount}} has been received.',
  [NotificationEvent.PAYMENT_CONFIRMED]:
    'We have received your payment of ৳{{amount}} for order {{orderId}} at {{storeName}}. Thank you!',
  [NotificationEvent.ORDER_SHIPPED]:
    'Good news! Your order {{orderId}} from {{storeName}} has been shipped. Tracking: {{trackingCode}}.',
  [NotificationEvent.ORDER_DELIVERED]:
    'Your order {{orderId}} from {{storeName}} has been delivered. We hope to see you again!',
};

export interface NotificationPayload {
  type: NotificationType;
  recipient: string;
  subject?: string;
  content: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject('NOTIFICATIONS_SERVICE') private readonly client: ClientProxy,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly whatsAppService: WhatsAppService,
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
    private readonly tenantsService: TenantsService,
  ) {}

  async sendNotification(payload: NotificationPayload) {
    // Emit to queue for async processing
    this.client.emit('send_notification', payload);

    // For immediate processing if needed
    return this.processNotification(payload);
  }

  async sendBulkNotifications(payloads: NotificationPayload[]) {
    return Promise.all(
      payloads.map((payload) => this.sendNotification(payload)),
    );
  }

  async processNotification(payload: NotificationPayload) {
    switch (payload.type) {
      case NotificationType.EMAIL:
        return this.emailService.sendEmail(
          payload.recipient,
          payload.subject || '',
          payload.content,
          payload.metadata,
        );

      case NotificationType.SMS:
        return this.smsService.sendSms(
          payload.recipient,
          payload.content,
          payload.metadata,
        );

      case NotificationType.PUSH:
        // TODO: Implement push notification service
        break;

      case NotificationType.WHATSAPP: {
        const tenantId = payload.metadata?.tenantId as string;
        if (!tenantId) {
          this.logger.warn('WhatsApp notification without tenantId — skipped');
          return { success: false, error: 'missing tenantId' };
        }
        const tenant = await this.tenantsService.findById(tenantId);
        if (
          !tenant ||
          !tenant.whatsappPhoneNumberId ||
          !tenant.whatsappAccessToken
        ) {
          this.logger.log(
            `WhatsApp not configured for tenant ${tenantId} — skipped`,
          );
          return { success: false, error: 'whatsapp not configured' };
        }
        return this.whatsAppService.sendTextMessage(
          {
            phoneNumberId: tenant.whatsappPhoneNumberId,
            accessToken: decryptSecret(tenant.whatsappAccessToken),
          },
          payload.recipient,
          payload.content,
        );
      }
    }
  }

  private renderTemplate(
    body: string,
    variables: Record<string, string | number>,
  ): string {
    return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
      variables[key] !== undefined ? String(variables[key]) : '',
    );
  }

  // Sends the tenant's WhatsApp template for an order lifecycle event.
  // Never throws: notification failure must not break the order flow.
  async sendWhatsAppEvent(
    tenantId: string,
    event: NotificationEvent,
    recipientPhone: string | undefined,
    variables: Record<string, string | number>,
  ) {
    try {
      if (!recipientPhone) {
        this.logger.log(
          `No recipient phone for ${event} (tenant ${tenantId}) — skipped`,
        );
        return { success: false, error: 'no recipient phone' };
      }

      const template = await this.templateRepository.findOne({
        where: { tenantId, event, channel: 'whatsapp' },
      });
      const body = this.renderTemplate(
        template?.body ?? DEFAULT_TEMPLATES[event],
        variables,
      );

      return await this.sendNotification({
        type: NotificationType.WHATSAPP,
        recipient: recipientPhone,
        content: body,
        metadata: { tenantId, event },
      });
    } catch (error) {
      this.logger.warn(`WhatsApp event ${event} failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Specific notification methods for different events
  async sendOrderConfirmation(userId: string, orderDetails: any) {
    return this.sendNotification({
      type: NotificationType.EMAIL,
      recipient: userId,
      subject: 'Order Confirmation',
      content: `Your order #${orderDetails.orderNumber} has been confirmed`,
      metadata: { orderDetails },
    });
  }

  async sendShippingUpdate(userId: string, trackingInfo: any) {
    return this.sendNotification({
      type: NotificationType.EMAIL,
      recipient: userId,
      subject: 'Shipping Update',
      content: `Your order has been shipped. Tracking number: ${trackingInfo.trackingNumber}`,
      metadata: { trackingInfo },
    });
  }

  async sendPriceDropAlert(userId: string, productInfo: any) {
    return this.sendNotification({
      type: NotificationType.EMAIL,
      recipient: userId,
      subject: 'Price Drop Alert',
      content: `The price of ${productInfo.name} has dropped to ${productInfo.newPrice}`,
      metadata: { productInfo },
    });
  }

  async sendBulkOrderStatus(userId: string, bulkOrderInfo: any) {
    return this.sendNotification({
      type: NotificationType.EMAIL,
      recipient: userId,
      subject: 'Bulk Order Status Update',
      content: `Your bulk order #${bulkOrderInfo.orderNumber} status: ${bulkOrderInfo.status}`,
      metadata: { bulkOrderInfo },
    });
  }
}
