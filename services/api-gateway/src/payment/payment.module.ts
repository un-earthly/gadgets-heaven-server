import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PaymentController } from './payment.controller';
import { ConfigService } from '../config/config.service';
import { PAYMENT_SERVICE_NAME, PAYMENT_PACKAGE_NAME } from '../proto/payment';
import { AUTH_SERVICE_NAME, AUTH_PACKAGE_NAME } from '../proto/auth';
import { join } from 'path';

@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: PAYMENT_SERVICE_NAME,
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.GRPC,
                    options: {
                        package: PAYMENT_PACKAGE_NAME,
                        protoPath: '/app/proto/payment.proto',
                        url: configService.paymentServiceUrl,
                    },
                }),
                inject: [ConfigService],
            },
            {
                name: AUTH_SERVICE_NAME,
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.GRPC,
                    options: {
                        package: AUTH_PACKAGE_NAME,
                        protoPath: '/app/proto/auth.proto',
                        url: configService.authServiceUrl,
                    },
                }),
                inject: [ConfigService],
            },
        ]),
    ],
    controllers: [PaymentController],
})
export class PaymentModule { }
