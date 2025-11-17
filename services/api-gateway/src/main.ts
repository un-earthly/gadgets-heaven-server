import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS
    app.enableCors();

    // Set global prefix
    app.setGlobalPrefix('api');

    const port = process.env.HTTP_PORT || 3000;
    await app.listen(port);

    console.log(`API Gateway is running on: http://localhost:${port}`);
}

bootstrap();
