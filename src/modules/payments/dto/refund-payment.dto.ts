import { IsNumber, Min, IsString, IsOptional } from 'class-validator';

export class RefundPaymentDto {
    @IsNumber()
    @Min(0)
    amount: number;

    @IsString()
    @IsOptional()
    reason?: string;

    @IsOptional()
    metadata?: Record<string, any>;
} 