import { IsString, IsNumber, IsOptional, IsObject, Min } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateProductVariantDto {
  @IsObject()
  attributes: Record<string, string>;

  @IsString()
  sku: string;

  @IsNumber()
  @Min(0)
  stockQuantity: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  priceOverride?: number;
}

export class UpdateProductVariantDto extends PartialType(
  CreateProductVariantDto,
) {}
