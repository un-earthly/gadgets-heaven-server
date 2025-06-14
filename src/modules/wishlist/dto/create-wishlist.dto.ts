import { IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWishlistDto {
    @ApiProperty({
        description: 'Name of the wishlist',
        minLength: 1,
        example: 'My Tech Wishlist'
    })
    @IsString()
    @MinLength(1)
    name: string;

    @ApiProperty({
        description: 'Description of the wishlist',
        required: false,
        example: 'Products I want to buy during the next sale'
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        description: 'Whether the wishlist is public',
        default: false,
        required: false
    })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean;
} 