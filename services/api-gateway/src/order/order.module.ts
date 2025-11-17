import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrderController } from './order.controller';
import { ConfigService } from '../config/config.service';
import { ORDER_SERVICE_NAME, ORDER_PACKAGE_NAME } from '../proto/order';
import { AUTH_SERVICE_NAME, AUTH_PACKAGE_NAME } from '../proto/auth';
import { join } from 'path';

@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: ORDER_SERVICE_NAME,
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.GRPC,
                    options: {
                        package: ORDER_PACKAGE_NAME,
                        protoPath: '/app/proto/order.proto',
                        url: configService.orderServiceUrl,
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
    controllers: [OrderController],
})
export class OrderModule { }
