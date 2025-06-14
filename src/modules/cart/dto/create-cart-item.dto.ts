import { IsUUID, IsInt, Min, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCartItemDto {
    @ApiProperty({ description: 'Product ID to add to cart' })
    @IsUUID()
    productId: string;

    @ApiProperty({ description: 'Quantity of the product', minimum: 1 })
    @IsInt()
    @Min(1)
    quantity: number;

    @ApiProperty({
        description: 'Selected product options (e.g., color, size)',
        required: false,
        example: {
            color: 'blue',
            size: 'large'
        }
    })
    @IsOptional()
    @IsObject()
    selectedOptions?: Record<string, any>;
} 