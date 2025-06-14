import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService, NotificationPayload } from './services/notifications.service';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @EventPattern('send_notification')
    async handleNotification(@Payload() payload: NotificationPayload) {
        return this.notificationsService.processNotification(payload);
    }
} 