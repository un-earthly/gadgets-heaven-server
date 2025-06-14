import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, OrderItem } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }

    async create(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
        const order = new Order();
        order.userId = userId;
        order.shippingAddress = createOrderDto.shippingAddress || '';
        order.billingAddress = createOrderDto.billingAddress || '';
        order.paymentMethod = createOrderDto.paymentMethod || 'pending';

        // Calculate total and validate products
        let totalAmount = 0;
        const orderItems: OrderItem[] = [];

        for (const item of createOrderDto.items) {
            const product = await this.productRepository.findOne({ where: { id: item.productId } });
            if (!product) {
                throw new NotFoundException(`Product with ID ${item.productId} not found`);
            }

            if (product.stockQuantity < item.quantity) {
                throw new BadRequestException(`Insufficient stock for product ${product.name}`);
            }

            const subtotal = product.price * item.quantity;
            totalAmount += subtotal;

            orderItems.push({
                productId: product.id,
                quantity: item.quantity,
                price: product.price,
                name: product.name,
                subtotal,
            });

            // Update product stock
            product.stockQuantity -= item.quantity;
            await this.productRepository.save(product);
        }

        order.items = orderItems;
        order.totalAmount = totalAmount;

        return this.orderRepository.save(order);
    }

    async findAll(userId: string): Promise<Order[]> {
        return this.orderRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(userId: string, id: string): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id, userId },
        });

        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found`);
        }

        return order;
    }

    async update(userId: string, id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
        const order = await this.findOne(userId, id);

        // Only allow updates if order is not delivered or cancelled
        if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
            throw new BadRequestException(`Cannot update order with status ${order.status}`);
        }

        Object.assign(order, updateOrderDto);
        return this.orderRepository.save(order);
    }

    async cancel(userId: string, id: string): Promise<Order> {
        const order = await this.findOne(userId, id);

        if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
            throw new BadRequestException(`Cannot cancel order with status ${order.status}`);
        }

        // Restore product stock
        for (const item of order.items) {
            const product = await this.productRepository.findOne({ where: { id: item.productId } });
            if (product) {
                product.stockQuantity += item.quantity;
                await this.productRepository.save(product);
            }
        }

        order.status = OrderStatus.CANCELLED;
        return this.orderRepository.save(order);
    }

    async findUserOrderStats(userId: string) {
        const orders = await this.orderRepository.find({ where: { userId } });

        return {
            totalOrders: orders.length,
            totalSpent: orders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
            pendingOrders: orders.filter(order => order.status === OrderStatus.PENDING).length,
            deliveredOrders: orders.filter(order => order.status === OrderStatus.DELIVERED).length,
        };
    }
} 