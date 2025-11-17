import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
    get httpPort(): number {
        return parseInt(process.env.HTTP_PORT || '3000', 10);
    }

    get authServiceUrl(): string {
        return process.env.AUTH_SERVICE_URL || 'localhost:50051';
    }

    get userServiceUrl(): string {
        return process.env.USER_SERVICE_URL || 'localhost:50052';
    }

    get productServiceUrl(): string {
        return process.env.PRODUCT_SERVICE_URL || 'localhost:50053';
    }

    get orderServiceUrl(): string {
        return process.env.ORDER_SERVICE_URL || 'localhost:50054';
    }

    get paymentServiceUrl(): string {
        return process.env.PAYMENT_SERVICE_URL || 'localhost:50055';
    }
}
