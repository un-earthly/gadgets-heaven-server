import { IsArray, IsDate, IsEnum, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus, InvoiceItem } from '../entities/invoice.entity';

export class CreateInvoiceItemDto implements InvoiceItem {
    @IsUUID()
    productId: string;

    @IsString()
    name: string;

    @IsNumber()
    quantity: number;

    @IsNumber()
    unitPrice: number;

    @IsNumber()
    subtotal: number;

    @IsNumber()
    tax: number;

    @IsNumber()
    total: number;
}

export class CreateInvoiceDto {
    @IsString()
    invoiceNumber: string;

    @IsNumber()
    subtotal: number;

    @IsNumber()
    tax: number;

    @IsNumber()
    total: number;

    @IsEnum(InvoiceStatus)
    @IsOptional()
    status?: InvoiceStatus;

    @IsUUID()
    userId: string;

    @IsUUID()
    @IsOptional()
    orderId?: string;

    @IsDate()
    @Type(() => Date)
    dueDate: Date;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateInvoiceItemDto)
    items: CreateInvoiceItemDto[];

    @IsString()
    @IsOptional()
    notes?: string;

    @IsOptional()
    metadata?: Record<string, any>;

    @IsString()
    @IsOptional()
    paymentTerms?: string;
} 