import { IsNotEmpty, IsString, IsNumber, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
    @ApiProperty({ description: 'Product ID' })
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({ description: 'Quantity of the product' })
    @IsNumber()
    @IsNotEmpty()
    quantity: number;
}

export class CreateOrderDto {
    @ApiProperty({ description: 'Array of order items', type: [OrderItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @ApiProperty({ description: 'Shipping address', required: false })
    @IsString()
    @IsOptional()
    shippingAddress?: string;

    @ApiProperty({ description: 'Billing address', required: false })
    @IsString()
    @IsOptional()
    billingAddress?: string;

    @ApiProperty({ description: 'Payment method', required: false })
    @IsString()
    @IsOptional()
    paymentMethod?: string;
} 