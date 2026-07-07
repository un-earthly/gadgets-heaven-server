import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Attach the RabbitMQ microservice consumer to this same process so the
  // notifications @EventPattern('send_notification') handler actually runs.
  // Without connectMicroservice + startAllMicroservices the queue is never
  // consumed and notifications are silently dropped. (V1-STEP 8D fix.)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [
        process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672',
      ],
      queue: process.env.RABBITMQ_NOTIFICATIONS_QUEUE || 'notifications_queue',
      queueOptions: { durable: true },
      // Broker auto-acks on delivery (at-most-once). Notifications are
      // best-effort and must never block or duplicate: with noAck:false we
      // would need manual channel.ack() and would risk redelivering (and thus
      // re-sending) the same WhatsApp message on any consumer reconnect.
      noAck: true,
    },
  });

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle('Gadgets Heaven API')
    .setDescription('The Gadgets Heaven e-commerce platform API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Start the RMQ consumer before the HTTP listener.
  await app.startAllMicroservices();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(
    `Swagger documentation is available at: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
