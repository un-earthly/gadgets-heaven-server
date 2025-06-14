import { IsInt, Min, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum StockUpdateType {
    ADD = 'add',
    REMOVE = 'remove',
    DAMAGE = 'damage',
    RETURN = 'return',
    RESERVE = 'reserve',
    RELEASE = 'release'
}

export class UpdateStockDto {
    @ApiProperty({ description: 'Quantity to update', minimum: 1 })
    @IsInt()
    @Min(1)
    quantity: number;

    @ApiProperty({
        description: 'Type of stock update',
        enum: StockUpdateType,
        example: StockUpdateType.ADD
    })
    @IsEnum(StockUpdateType)
    type: StockUpdateType;

    @ApiProperty({ description: 'Reason for stock update', required: false })
    @IsString()
    @IsOptional()
    reason?: string;

    @ApiProperty({ description: 'Reference number or ID', required: false })
    @IsString()
    @IsOptional()
    reference?: string;
} 