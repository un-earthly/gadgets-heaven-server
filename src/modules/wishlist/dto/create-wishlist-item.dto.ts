import { IsUUID, IsNumber, IsString, IsOptional, IsEnum, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PriceAlertType } from '../entities/wishlist-item.entity';

export class CreateWishlistItemDto {
    @ApiProperty({ description: 'Product ID to add to wishlist' })
    @IsUUID()
    productId: string;

    @ApiProperty({
        description: 'Priority level (1-5)',
        minimum: 1,
        maximum: 5,
        default: 3,
        required: false
    })
    @IsNumber()
    @Min(1)
    @Max(5)
    @IsOptional()
    priority?: number;

    @ApiProperty({
        description: 'Notes about the item',
        required: false,
        example: 'Wait for Black Friday sale'
    })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiProperty({
        description: 'Type of price alert',
        enum: PriceAlertType,
        default: PriceAlertType.NONE,
        required: false
    })
    @IsEnum(PriceAlertType)
    @IsOptional()
    priceAlertType?: PriceAlertType;

    @ApiProperty({
        description: 'Target price for alert',
        required: false,
        example: 999.99
    })
    @IsNumber()
    @Min(0)
    @IsOptional()
    targetPrice?: number;

    @ApiProperty({
        description: 'Price drop percentage for alert',
        minimum: 0,
        maximum: 100,
        required: false,
        example: 20
    })
    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    priceDropPercentage?: number;

    @ApiProperty({
        description: 'Whether to notify when back in stock',
        default: false,
        required: false
    })
    @IsBoolean()
    @IsOptional()
    notifyInStock?: boolean;
} 