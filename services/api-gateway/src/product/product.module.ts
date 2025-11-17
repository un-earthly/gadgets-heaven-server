import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ProductController } from './product.controller';
import { ConfigService } from '../config/config.service';
import { PRODUCT_SERVICE_NAME, PRODUCT_PACKAGE_NAME } from '../proto/product';
import { AUTH_SERVICE_NAME, AUTH_PACKAGE_NAME } from '../proto/auth';
import { join } from 'path';

@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: PRODUCT_SERVICE_NAME,
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.GRPC,
                    options: {
                        package: PRODUCT_PACKAGE_NAME,
                        protoPath: '/app/proto/product.proto',
                        url: configService.productServiceUrl,
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
    controllers: [ProductController],
})
export class ProductModule { }
