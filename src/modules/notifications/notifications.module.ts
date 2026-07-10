import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './services/notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { WhatsAppService } from './services/whatsapp.service';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationTemplatesController } from './notification-templates.controller';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([NotificationTemplate]),
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATIONS_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>('RABBITMQ_URL') ??
                'amqp://admin:admin123@localhost:5672',
            ],
            queue:
              configService.get<string>('RABBITMQ_NOTIFICATIONS_QUEUE') ??
              'notifications_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [NotificationsController, NotificationTemplatesController],
  providers: [NotificationsService, EmailService, SmsService, WhatsAppService],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
