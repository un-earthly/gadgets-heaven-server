import { IsEnum, IsNumber, IsString, IsOptional, IsUUID } from 'class-validator';
import { TransactionType, TransactionStatus, PaymentMethod } from '../entities/transaction.entity';

export class CreateTransactionDto {
    @IsNumber()
    amount: number;

    @IsEnum(TransactionType)
    type: TransactionType;

    @IsEnum(TransactionStatus)
    @IsOptional()
    status?: TransactionStatus;

    @IsEnum(PaymentMethod)
    method: PaymentMethod;

    @IsUUID()
    userId: string;

    @IsUUID()
    @IsOptional()
    orderId?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsOptional()
    metadata?: Record<string, any>;

    @IsString()
    @IsOptional()
    referenceNumber?: string;

    @IsString()
    @IsOptional()
    gatewayTransactionId?: string;
} 