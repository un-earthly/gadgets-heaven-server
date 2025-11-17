import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GrpcExceptionFilter } from './filters/grpc-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';

@Module({
    imports: [
        ConfigModule,
        AuthModule,
        UserModule,
        ProductModule,
        OrderModule,
        PaymentModule,
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: GrpcExceptionFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ResponseInterceptor,
        },
    ],
})
export class AppModule { }
