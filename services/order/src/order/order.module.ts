import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { OrderEntity } from '../entities/order.entity';
import { OrderItemEntity } from '../entities/order-item.entity';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([OrderEntity, OrderItemEntity]),
        ClientsModule.registerAsync([
            {
                name: 'PRODUCT_SERVICE',
                imports: [ConfigModule],
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.GRPC,
                    options: {
                        package: 'product',
                        protoPath: join(__dirname, '../../../proto/product.proto'),
                        url: configService.get('grpc.productServiceUrl'),
                    },
                }),
                inject: [ConfigService],
            },
        ]),
    ],
    controllers: [OrderController],
    providers: [OrderService],
})
export class OrderModule { }
