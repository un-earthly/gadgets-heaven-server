import { IsUUID, IsInt, Min, IsString, IsOptional, IsObject, IsArray, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StockStatus } from '../entities/inventory.entity';

export class CreateInventoryDto {
    @ApiProperty({ description: 'Product ID' })
    @IsUUID()
    productId: string;

    @ApiProperty({ description: 'Current stock quantity', minimum: 0 })
    @IsInt()
    @Min(0)
    quantity: number;

    @ApiProperty({ description: 'Minimum stock level for alerts', minimum: 0 })
    @IsInt()
    @Min(0)
    minStockLevel: number;

    @ApiProperty({ description: 'Maximum stock level capacity', minimum: 0 })
    @IsInt()
    @Min(0)
    maxStockLevel: number;

    @ApiProperty({ description: 'Stock status', enum: StockStatus, required: false })
    @IsEnum(StockStatus)
    @IsOptional()
    status?: StockStatus;

    @ApiProperty({ description: 'Warehouse location identifier', required: false })
    @IsString()
    @IsOptional()
    warehouseLocation?: string;

    @ApiProperty({ description: 'Shelf location identifier', required: false })
    @IsString()
    @IsOptional()
    shelfLocation?: string;

    @ApiProperty({
        description: 'Product dimensions',
        required: false,
        example: {
            length: 10,
            width: 5,
            height: 3,
            weight: 1.5,
            unit: 'cm'
        }
    })
    @IsObject()
    @IsOptional()
    dimensions?: {
        length: number;
        width: number;
        height: number;
        weight: number;
        unit: string;
    };

    @ApiProperty({ description: 'Product barcodes', type: [String], required: false })
    @IsArray()
    @IsOptional()
    barcodes?: string[];

    @ApiProperty({
        description: 'Supplier information',
        required: false,
        example: {
            id: 'supplier-123',
            name: 'Supplier Co.',
            contactInfo: 'contact@supplier.com',
            leadTime: 7
        }
    })
    @IsObject()
    @IsOptional()
    supplier?: {
        id: string;
        name: string;
        contactInfo: string;
        leadTime: number;
    };

    @ApiProperty({ description: 'Cost per unit', minimum: 0, required: false })
    @IsNumber()
    @IsOptional()
    costPerUnit?: number;

    @ApiProperty({ description: 'Additional metadata', required: false })
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
} 