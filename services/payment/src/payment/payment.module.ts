import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentEntity } from '../entities/payment.entity';
import { RefundEntity } from '../entities/refund.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([PaymentEntity, RefundEntity]),
        ClientsModule.registerAsync([
            {
                name: 'ORDER_PACKAGE',
                imports: [ConfigModule],
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.GRPC,
                    options: {
                        package: 'order',
                        protoPath: join(__dirname, '../../../proto/order.proto'),
                        url: configService.get('grpc.orderServiceUrl'),
                    },
                }),
                inject: [ConfigService],
            },
        ]),
    ],
    controllers: [PaymentController],
    providers: [PaymentService],
})
export class PaymentModule { }
