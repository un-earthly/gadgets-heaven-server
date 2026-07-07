import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { PaymentType } from '../entities/order.entity';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Product variant ID (for stock-tracked variants)',
    required: false,
  })
  @IsString()
  @IsOptional()
  variantId?: string;

  @ApiProperty({ description: 'Quantity of the product' })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Array of order items', type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ description: 'Shipping address', required: false })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiProperty({ description: 'Billing address', required: false })
  @IsString()
  @IsOptional()
  billingAddress?: string;

  @ApiProperty({ description: 'Payment method', required: false })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({
    description: 'Payment type: online (gateway) or cod (cash on delivery)',
    enum: PaymentType,
    required: false,
    default: PaymentType.COD,
  })
  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType;

  @ApiProperty({
    description:
      'Recipient WhatsApp/phone number (E.164, e.g. 8801700000000) used for order lifecycle notifications',
    required: false,
  })
  @IsString()
  @IsOptional()
  recipientPhone?: string;

  @ApiProperty({ description: 'Recipient name', required: false })
  @IsString()
  @IsOptional()
  recipientName?: string;
}
