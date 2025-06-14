import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
    @ApiProperty({ description: 'Category name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'Category slug for URL', required: false })
    @IsString()
    @IsOptional()
    slug?: string;

    @ApiProperty({ description: 'Category description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Category image URL', required: false })
    @IsString()
    @IsOptional()
    image?: string;

    @ApiProperty({ description: 'Parent category ID', required: false })
    @IsString()
    @IsOptional()
    parentId?: string;

    @ApiProperty({ description: 'Category sort order', required: false })
    @IsNumber()
    @IsOptional()
    sortOrder?: number;

    @ApiProperty({ description: 'Category status', required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiProperty({ description: 'Meta title for SEO', required: false })
    @IsString()
    @IsOptional()
    metaTitle?: string;

    @ApiProperty({ description: 'Meta description for SEO', required: false })
    @IsString()
    @IsOptional()
    metaDescription?: string;
} 