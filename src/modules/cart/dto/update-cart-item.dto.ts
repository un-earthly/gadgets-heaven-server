import { IsInt, Min, IsOptional, IsObject } from 'class-validator';

export class UpdateCartItemDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    quantity?: number;

    @IsOptional()
    @IsObject()
    selectedOptions?: Record<string, any>;
} 