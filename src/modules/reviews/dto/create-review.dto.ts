import { IsNotEmpty, IsString, IsNumber, Min, Max, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
    @ApiProperty({ description: 'Product ID to review' })
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({ description: 'Review title' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ description: 'Review content' })
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiProperty({ description: 'Rating (1-5)', minimum: 1, maximum: 5 })
    @IsNumber()
    @Min(1)
    @Max(5)
    rating: number;

    @ApiProperty({ description: 'Image URLs', required: false, type: [String] })
    @IsArray()
    @IsOptional()
    images?: string[];
} 