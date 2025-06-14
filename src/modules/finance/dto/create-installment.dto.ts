import { IsDate, IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { InstallmentStatus } from '../entities/installment.entity';

export class CreateInstallmentDto {
    @IsUUID()
    orderId: string;

    @IsUUID()
    userId: string;

    @IsNumber()
    amount: number;

    @IsNumber()
    installmentNumber: number;

    @IsNumber()
    totalInstallments: number;

    @IsDate()
    @Type(() => Date)
    dueDate: Date;

    @IsEnum(InstallmentStatus)
    @IsOptional()
    status?: InstallmentStatus;

    @IsNumber()
    @IsOptional()
    lateFee?: number;

    @IsOptional()
    metadata?: Record<string, any>;

    @IsString()
    @IsOptional()
    paymentMethod?: string;

    @IsString()
    @IsOptional()
    transactionId?: string;
} 