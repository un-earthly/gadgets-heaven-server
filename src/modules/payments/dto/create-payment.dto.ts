import { IsUUID, IsEnum, IsNumber, Min, IsObject, IsOptional } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
    @IsUUID()
    orderId: string;

    @IsEnum(PaymentMethod)
    method: PaymentMethod;

    @IsNumber()
    @Min(0)
    amount: number;

    @IsObject()
    @IsOptional()
    paymentDetails?: Record<string, any>;

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
} 