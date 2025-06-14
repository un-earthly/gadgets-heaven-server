import { IsString, IsEnum, IsNumber, IsArray, ValidateNested, IsOptional, Min, IsUUID, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { BulkOrderPriority } from '../entities/bulk-order.entity';

export class BulkOrderItemDto {
    @IsUUID()
    productId: string;

    @IsNumber()
    @Min(1)
    quantity: number;
}

export class ShippingDetailsDto {
    @IsString()
    address: string;

    @IsString()
    method: string;

    @IsString()
    @IsOptional()
    instructions?: string;
}

export class CreateBulkOrderDto {
    @IsEnum(BulkOrderPriority)
    @IsOptional()
    priority?: BulkOrderPriority;

    @IsArray()
    @ValidateNested({ each: true })
    @ArrayMinSize(1)
    @Type(() => BulkOrderItemDto)
    items: BulkOrderItemDto[];

    @ValidateNested()
    @Type(() => ShippingDetailsDto)
    shippingDetails: ShippingDetailsDto;

    @IsString()
    @IsOptional()
    notes?: string;
}