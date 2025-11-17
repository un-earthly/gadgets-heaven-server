import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UserController } from './user.controller';
import { ConfigService } from '../config/config.service';
import { USER_SERVICE_NAME, USER_PACKAGE_NAME } from '../proto/user';
import { AUTH_SERVICE_NAME, AUTH_PACKAGE_NAME } from '../proto/auth';
import { join } from 'path';

@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: USER_SERVICE_NAME,
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.GRPC,
                    options: {
                        package: USER_PACKAGE_NAME,
                        protoPath: '/app/proto/user.proto',
                        url: configService.userServiceUrl,
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
    controllers: [UserController],
})
export class UserModule { }
