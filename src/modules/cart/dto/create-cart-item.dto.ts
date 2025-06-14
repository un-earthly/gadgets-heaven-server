import { IsUUID, IsInt, Min, IsOptional, IsObject } from 'class-validator';

export class CreateCartItemDto {
    @IsUUID()
    productId: string;

    @IsInt()
    @Min(1)
    quantity: number;

    @IsOptional()
    @IsObject()
    selectedOptions?: Record<string, any>;
} 