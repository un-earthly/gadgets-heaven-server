import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
        AppModule,
        {
            transport: Transport.GRPC,
            options: {
                package: 'payment',
                protoPath: '/proto/payment.proto',
                url: `0.0.0.0:${process.env.GRPC_PORT || 50055}`,
            },
        },
    );

    await app.listen();
    console.log(`Payment Service is listening on port ${process.env.GRPC_PORT || 50055}`);
}

bootstrap();
