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
                package: 'order',
                protoPath: '/proto/order.proto',
                url: `0.0.0.0:${process.env.GRPC_PORT || 50054}`,
            },
        },
    );

    await app.listen();
    console.log(`Order Service is listening on port ${process.env.GRPC_PORT || 50054}`);
}

bootstrap();
