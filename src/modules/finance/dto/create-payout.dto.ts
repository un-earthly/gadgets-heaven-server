import { IsEnum, IsNumber, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PayoutMethod, PayoutStatus } from '../entities/payout.entity';

export class PaymentDetailsDto {
    @IsString()
    @IsOptional()
    accountNumber?: string;

    @IsString()
    @IsOptional()
    bankName?: string;

    @IsString()
    @IsOptional()
    swiftCode?: string;

    @IsString()
    @IsOptional()
    paypalEmail?: string;

    @IsString()
    @IsOptional()
    cryptoAddress?: string;

    @IsString()
    @IsOptional()
    walletType?: string;
}

export class CreatePayoutDto {
    @IsUUID()
    userId: string;

    @IsNumber()
    amount: number;

    @IsEnum(PayoutMethod)
    method: PayoutMethod;

    @IsObject()
    @ValidateNested()
    @Type(() => PaymentDetailsDto)
    paymentDetails: PaymentDetailsDto;

    @IsEnum(PayoutStatus)
    @IsOptional()
    status?: PayoutStatus;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
} 