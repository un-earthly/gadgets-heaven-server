import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { BulkOrder, BulkOrderStatus, BulkOrderPriority } from '../entities/bulk-order.entity';
import { CreateBulkOrderDto } from '../dto/create-bulk-order.dto';
import { Product } from '../../products/entities/product.entity';

@Injectable()
export class BulkOrderService {
    constructor(
        @InjectRepository(BulkOrder)
        private readonly bulkOrderRepository: Repository<BulkOrder>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }

    async create(userId: string, createBulkOrderDto: CreateBulkOrderDto): Promise<BulkOrder> {
        const bulkOrder = this.bulkOrderRepository.create({
            userId,
            status: BulkOrderStatus.DRAFT,
            priority: createBulkOrderDto.priority || BulkOrderPriority.MEDIUM,
            shippingDetails: createBulkOrderDto.shippingDetails,
            notes: createBulkOrderDto.notes,
        });

        // Generate order number
        bulkOrder.orderNumber = await this.generateOrderNumber();

        // Process items and calculate totals
        const items = await Promise.all(
            createBulkOrderDto.items.map(async (item) => {
                const product = await this.productRepository.findOne({
                    where: { id: item.productId },
                });

                if (!product) {
                    throw new NotFoundException(`Product with ID ${item.productId} not found`);
                }

                if (product.stockQuantity < item.quantity) {
                    throw new BadRequestException(
                        `Not enough stock for product ${product.name}. Available: ${product.stockQuantity}`
                    );
                }

                return {
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: product.price,
                    subtotal: product.price * item.quantity,
                    product,
                };
            })
        );

        bulkOrder.items = items;
        bulkOrder.totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

        // Calculate bulk discount based on total amount or quantity
        bulkOrder.bulkDiscountPercentage = this.calculateBulkDiscount(bulkOrder.totalAmount, items);
        bulkOrder.finalAmount = bulkOrder.totalAmount * (1 - bulkOrder.bulkDiscountPercentage / 100);

        // Initialize status history
        bulkOrder.statusHistory = [{
            status: BulkOrderStatus.DRAFT,
            date: new Date(),
        }];

        return this.bulkOrderRepository.save(bulkOrder);
    }

    private calculateBulkDiscount(totalAmount: number, items: any[]): number {
        // Example discount tiers based on total amount
        if (totalAmount >= 10000) return 15;
        if (totalAmount >= 5000) return 10;
        if (totalAmount >= 1000) return 5;

        // Additional discount based on total quantity
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        if (totalQuantity >= 100) return 7;
        if (totalQuantity >= 50) return 5;
        if (totalQuantity >= 20) return 3;

        return 0;
    }

    private async generateOrderNumber(): Promise<string> {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `BLK${year}${month}`;

        const lastOrder = await this.bulkOrderRepository.find({
            where: {
                orderNumber: Like(`${prefix}%`),
            },
            order: { orderNumber: 'DESC' },
            take: 1,
        });

        let sequence = 1;
        if (lastOrder.length > 0) {
            const lastSequence = parseInt(lastOrder[0].orderNumber.slice(-4));
            sequence = lastSequence + 1;
        }

        return `${prefix}${sequence.toString().padStart(4, '0')}`;
    }

    async findAll(filters?: {
        status?: BulkOrderStatus;
        priority?: BulkOrderPriority;
        userId?: string;
    }): Promise<BulkOrder[]> {
        return this.bulkOrderRepository.find({
            where: filters,
            order: {
                createdAt: 'DESC',
            },
        });
    }

    async findOne(id: string): Promise<BulkOrder> {
        const bulkOrder = await this.bulkOrderRepository.findOne({
            where: { id },
        });

        if (!bulkOrder) {
            throw new NotFoundException(`Bulk order with ID ${id} not found`);
        }

        return bulkOrder;
    }

    async updateStatus(
        id: string,
        status: BulkOrderStatus,
        note?: string
    ): Promise<BulkOrder> {
        const bulkOrder = await this.findOne(id);
        const oldStatus = bulkOrder.status;
        bulkOrder.status = status;

        // Update status-specific timestamps
        switch (status) {
            case BulkOrderStatus.APPROVED:
                bulkOrder.approvedAt = new Date();
                break;
            case BulkOrderStatus.PROCESSING:
                bulkOrder.processedAt = new Date();
                break;
            case BulkOrderStatus.SHIPPED:
                bulkOrder.shippedAt = new Date();
                break;
            case BulkOrderStatus.DELIVERED:
                bulkOrder.deliveredAt = new Date();
                break;
        }

        // Add to status history
        bulkOrder.statusHistory.push({
            status,
            date: new Date(),
            note,
        });

        // If moving to APPROVED, check stock availability again
        if (status === BulkOrderStatus.APPROVED) {
            await this.validateStockAvailability(bulkOrder);
        }

        // If moving to PROCESSING, reserve the stock
        if (oldStatus !== BulkOrderStatus.PROCESSING && status === BulkOrderStatus.PROCESSING) {
            await this.reserveStock(bulkOrder);
        }

        return this.bulkOrderRepository.save(bulkOrder);
    }

    private async validateStockAvailability(bulkOrder: BulkOrder): Promise<void> {
        for (const item of bulkOrder.items) {
            const product = await this.productRepository.findOne({
                where: { id: item.productId },
            });

            if (!product) {
                throw new NotFoundException(`Product with ID ${item.productId} not found`);
            }

            if (product.stockQuantity < item.quantity) {
                throw new BadRequestException(
                    `Not enough stock for product ${product.name}. Required: ${item.quantity}, Available: ${product.stockQuantity}`
                );
            }
        }
    }

    private async reserveStock(bulkOrder: BulkOrder): Promise<void> {
        for (const item of bulkOrder.items) {
            const product = await this.productRepository.findOne({
                where: { id: item.productId },
            });

            if (!product) {
                throw new NotFoundException(`Product with ID ${item.productId} not found`);
            }

            product.stockQuantity -= item.quantity;
            await this.productRepository.save(product);
        }
    }

    async updateShippingDetails(
        id: string,
        shippingDetails: any
    ): Promise<BulkOrder> {
        const bulkOrder = await this.findOne(id);
        bulkOrder.shippingDetails = {
            ...bulkOrder.shippingDetails,
            ...shippingDetails,
        };
        return this.bulkOrderRepository.save(bulkOrder);
    }

    async updatePaymentDetails(
        id: string,
        paymentDetails: any
    ): Promise<BulkOrder> {
        const bulkOrder = await this.findOne(id);
        bulkOrder.paymentDetails = {
            ...bulkOrder.paymentDetails,
            ...paymentDetails,
        };
        return this.bulkOrderRepository.save(bulkOrder);
    }

    async getBulkOrderSummary(userId: string, startDate: Date, endDate: Date) {
        const orders = await this.bulkOrderRepository
            .createQueryBuilder('bulkOrder')
            .where('bulkOrder.userId = :userId', { userId })
            .andWhere('bulkOrder.createdAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
            .getMany();

        const totalOrders = orders.length;
        const totalAmount = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
        const totalDiscount = orders.reduce(
            (sum, order) => sum + (Number(order.totalAmount) - Number(order.finalAmount)),
            0
        );

        const statusCounts = orders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
        }, {});

        return {
            totalOrders,
            totalAmount,
            totalDiscount,
            statusCounts,
            orders,
        };
    }
} 