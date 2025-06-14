import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderDto {
    @ApiProperty({ enum: OrderStatus, description: 'Order status', required: false })
    @IsEnum(OrderStatus)
    @IsOptional()
    status?: OrderStatus;

    @ApiProperty({ description: 'Tracking number', required: false })
    @IsString()
    @IsOptional()
    trackingNumber?: string;

    @ApiProperty({ description: 'Payment status', required: false })
    @IsBoolean()
    @IsOptional()
    isPaid?: boolean;

    @ApiProperty({ description: 'Payment ID', required: false })
    @IsString()
    @IsOptional()
    paymentId?: string;

    @ApiProperty({ description: 'Shipping address', required: false })
    @IsString()
    @IsOptional()
    shippingAddress?: string;

    @ApiProperty({ description: 'Billing address', required: false })
    @IsString()
    @IsOptional()
    billingAddress?: string;
} 