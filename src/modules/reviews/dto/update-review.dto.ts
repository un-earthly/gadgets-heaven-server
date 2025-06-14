import { IsString, IsNumber, Min, Max, IsArray, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReviewStatus } from '../entities/review.entity';

export class UpdateReviewDto {
    @ApiProperty({ description: 'Review title', required: false })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiProperty({ description: 'Review content', required: false })
    @IsString()
    @IsOptional()
    content?: string;

    @ApiProperty({ description: 'Rating (1-5)', minimum: 1, maximum: 5, required: false })
    @IsNumber()
    @Min(1)
    @Max(5)
    @IsOptional()
    rating?: number;

    @ApiProperty({ description: 'Image URLs', required: false, type: [String] })
    @IsArray()
    @IsOptional()
    images?: string[];

    @ApiProperty({ enum: ReviewStatus, description: 'Review status', required: false })
    @IsEnum(ReviewStatus)
    @IsOptional()
    status?: ReviewStatus;
} 