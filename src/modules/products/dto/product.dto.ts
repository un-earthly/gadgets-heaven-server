import { IsString, IsNumber, IsEnum, IsArray, IsOptional, IsBoolean, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import { ProductStatus } from '../entities/product.entity';

export class CreateProductDto {
    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsNumber()
    @Min(0)
    stockQuantity: number;

    @IsEnum(ProductStatus)
    @IsOptional()
    status?: ProductStatus;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    images?: string[];

    @IsArray()
    @IsString({ each: true })
    categories: string[];

    @IsOptional()
    specifications?: Record<string, any>;

    @IsString()
    @IsOptional()
    brand?: string;

    @IsString()
    @IsOptional()
    sku?: string;

    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    discountPercentage?: number;

    @IsBoolean()
    @IsOptional()
    isFeatured?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) { }

export class ProductQueryDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    categories?: string[];

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    minPrice?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    maxPrice?: number;

    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;

    @IsOptional()
    @IsString()
    brand?: string;

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    isFeatured?: boolean;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    page?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    limit?: number;

    @IsOptional()
    @IsString()
    sortBy?: string;

    @IsOptional()
    @IsString()
    sortOrder?: 'ASC' | 'DESC';
} 