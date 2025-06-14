import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

export enum NotificationType {
    EMAIL = 'email',
    SMS = 'sms',
    PUSH = 'push',
}

export interface NotificationPayload {
    type: NotificationType;
    recipient: string;
    subject?: string;
    content: string;
    metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
    constructor(
        @Inject('NOTIFICATIONS_SERVICE') private readonly client: ClientProxy,
        private readonly emailService: EmailService,
        private readonly smsService: SmsService,
    ) { }

    async sendNotification(payload: NotificationPayload) {
        // Emit to queue for async processing
        this.client.emit('send_notification', payload);

        // For immediate processing if needed
        return this.processNotification(payload);
    }

    async sendBulkNotifications(payloads: NotificationPayload[]) {
        return Promise.all(
            payloads.map(payload => this.sendNotification(payload))
        );
    }

    async processNotification(payload: NotificationPayload) {
        switch (payload.type) {
            case NotificationType.EMAIL:
                return this.emailService.sendEmail(
                    payload.recipient,
                    payload.subject || '',
                    payload.content,
                    payload.metadata
                );

            case NotificationType.SMS:
                return this.smsService.sendSms(
                    payload.recipient,
                    payload.content,
                    payload.metadata
                );

            case NotificationType.PUSH:
                // TODO: Implement push notification service
                break;
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