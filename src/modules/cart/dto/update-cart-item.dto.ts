import { IsInt, Min, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
    @ApiProperty({ description: 'New quantity of the product', minimum: 0, required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    quantity?: number;

    @ApiProperty({
        description: 'Updated product options (e.g., color, size)',
        required: false,
        example: {
            color: 'red',
            size: 'medium'
        }
    })
    @IsOptional()
    @IsObject()
    selectedOptions?: Record<string, any>;
} 