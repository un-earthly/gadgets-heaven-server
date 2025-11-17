import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthController } from './auth.controller';
import { ConfigService } from '../config/config.service';
import { AUTH_SERVICE_NAME, AUTH_PACKAGE_NAME } from '../proto/auth';
import { join } from 'path';

@Module({
    imports: [
        ClientsModule.registerAsync([
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
    controllers: [AuthController],
    exports: [ClientsModule],
})
export class AuthModule { }
