import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NotificationsService } from './services/notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';

@Module({
    imports: [
        ConfigModule.forRoot(),
        ClientsModule.registerAsync([
            {
                name: 'NOTIFICATIONS_SERVICE',
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.RMQ,
                    options: {
                        urls: ['amqp://admin:admin123@localhost:5672'],
                        queue: 'notifications_queue',
                        queueOptions: {
                            durable: true,
                        },
                    },
                }),
                inject: [ConfigService],
            },
        ]),
    ],
    controllers: [NotificationsController],
    providers: [NotificationsService, EmailService, SmsService],
    exports: [NotificationsService],
})
export class NotificationsModule { } 