import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException, ClientGrpc } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { OrderEntity } from '../entities/order.entity';
import { OrderItemEntity } from '../entities/order-item.entity';
import {
    CreateOrderRequest,
    CreateOrderResponse,
    GetOrderRequest,
    GetOrderResponse,
    UpdateOrderStatusRequest,
    UpdateOrderStatusResponse,
    CancelOrderRequest,
    CancelOrderResponse,
    ListOrdersRequest,
    ListOrdersResponse,
    GetUserOrdersRequest,
    GetUserOrdersResponse,
    Order,
    OrderStatus,
    OrderItem,
} from '../proto/order';
import {
    ProductServiceClient,
    PRODUCT_SERVICE_NAME,
} from '../proto/product';

@Injectable()
export class OrderService implements OnModuleInit {
    private productService: ProductServiceClient;

    constructor(
        @InjectRepository(OrderEntity)
        private orderRepository: Repository<OrderEntity>,
        @InjectRepository(OrderItemEntity)
        private orderItemRepository: Repository<OrderItemEntity>,
        @Inject('PRODUCT_SERVICE')
        private productClient: ClientGrpc,
    ) { }

    onModuleInit() {
        this.productService = this.productClient.getService<ProductServiceClient>(
            PRODUCT_SERVICE_NAME,
        );
    }

    async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
        try {
            // Validate products and get prices
            const validatedItems: OrderItem[] = [];
            let totalAmount = 0;

            for (const item of request.items) {
                // Get product details from Product Service
                const productResponse = await firstValueFrom(
                    this.productService.getProduct({ productId: item.productId }),
                );

                if (!productResponse.product) {
                    throw new RpcException({
                        code: status.NOT_FOUND,
                        message: `Product ${item.productId} not found`,
                    });
                }

                // Check inventory
                const inventoryResponse = await firstValueFrom(
                    this.productService.checkInventory({ productId: item.productId }),
                );

                if (!inventoryResponse.inStock || inventoryResponse.availableQuantity < item.quantity) {
                    throw new RpcException({
                        code: status.FAILED_PRECONDITION,
                        message: `Insufficient stock for product ${item.productId}`,
                    });
                }

                // Use the current price from the product service
                const itemPrice = productResponse.product.price;
                const itemTotal = itemPrice * item.quantity;
                totalAmount += itemTotal;

                validatedItems.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: itemPrice,
                });
            }

            // Create order entity
            const order = this.orderRepository.create({
                userId: request.userId,
                totalAmount,
                status: 'PENDING',
                shippingAddress: {
                    street: request.shippingAddress.street,
                    city: request.shippingAddress.city,
                    state: request.shippingAddress.state,
                    postalCode: request.shippingAddress.postalCode,
                    country: request.shippingAddress.country,
                },
            });

            const savedOrder = await this.orderRepository.save(order);

            // Create order items
            const orderItems = validatedItems.map((item) =>
                this.orderItemRepository.create({
                    orderId: savedOrder.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                }),
            );

            await this.orderItemRepository.save(orderItems);

            // Reload order with items
            const orderWithItems = await this.orderRepository.findOne({
                where: { id: savedOrder.id },
                relations: ['items'],
            });

            return {
                order: this.mapEntityToProto(orderWithItems),
            };
        } catch (error) {
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                code: status.INTERNAL,
                message: 'Failed to create order',
            });
        }
    }

    async getOrder(request: GetOrderRequest): Promise<GetOrderResponse> {
        const order = await this.orderRepository.findOne({
            where: { id: request.orderId },
            relations: ['items'],
        });

        if (!order) {
            throw new RpcException({
                code: status.NOT_FOUND,
                message: 'Order not found',
            });
        }

        return {
            order: this.mapEntityToProto(order),
        };
    }

    async updateOrderStatus(request: UpdateOrderStatusRequest): Promise<UpdateOrderStatusResponse> {
        const order = await this.orderRepository.findOne({
            where: { id: request.orderId },
            relations: ['items'],
        });

        if (!order) {
            throw new RpcException({
                code: status.NOT_FOUND,
                message: 'Order not found',
            });
        }

        // Validate status transition
        const validTransitions = this.getValidStatusTransitions(order.status);
        const newStatus = OrderStatus[request.status];

        if (!validTransitions.includes(newStatus)) {
            throw new RpcException({
                code: status.FAILED_PRECONDITION,
                message: `Invalid status transition from ${order.status} to ${newStatus}`,
            });
        }

        order.status = newStatus;
        const updatedOrder = await this.orderRepository.save(order);

        return {
            order: this.mapEntityToProto(updatedOrder),
        };
    }

    async cancelOrder(request: CancelOrderRequest): Promise<CancelOrderResponse> {
        const order = await this.orderRepository.findOne({
            where: { id: request.orderId },
        });

        if (!order) {
            throw new RpcException({
                code: status.NOT_FOUND,
                message: 'Order not found',
            });
        }

        // Verify user owns the order
        if (order.userId !== request.userId) {
            throw new RpcException({
                code: status.PERMISSION_DENIED,
                message: 'You do not have permission to cancel this order',
            });
        }

        // Check if order can be cancelled
        if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
            throw new RpcException({
                code: status.FAILED_PRECONDITION,
                message: 'Order cannot be cancelled in current status',
            });
        }

        order.status = 'CANCELLED';
        await this.orderRepository.save(order);

        return {
            success: true,
        };
    }

    async listOrders(request: ListOrdersRequest): Promise<ListOrdersResponse> {
        const page = request.page || 1;
        const pageSize = request.pageSize || 10;

        const queryBuilder = this.orderRepository
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.items', 'items');

        if (request.status !== OrderStatus.PENDING || request.status) {
            const statusStr = OrderStatus[request.status];
            if (statusStr && statusStr !== 'UNRECOGNIZED') {
                queryBuilder.where('order.status = :status', { status: statusStr });
            }
        }

        const [orders, total] = await queryBuilder
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        return {
            orders: orders.map((o) => this.mapEntityToProto(o)),
            total,
        };
    }

    async getUserOrders(request: GetUserOrdersRequest): Promise<GetUserOrdersResponse> {
        const page = request.page || 1;
        const pageSize = request.pageSize || 10;

        const [orders, total] = await this.orderRepository.findAndCount({
            where: { userId: request.userId },
            relations: ['items'],
            skip: (page - 1) * pageSize,
            take: pageSize,
            order: { createdAt: 'DESC' },
        });

        return {
            orders: orders.map((o) => this.mapEntityToProto(o)),
            total,
        };
    }

    private mapEntityToProto(entity: OrderEntity): Order {
        return {
            orderId: entity.id,
            userId: entity.userId,
            items: entity.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: Number(item.price),
            })),
            totalAmount: Number(entity.totalAmount),
            status: OrderStatus[entity.status as keyof typeof OrderStatus],
            shippingAddress: entity.shippingAddress,
            createdAt: entity.createdAt.getTime(),
            updatedAt: entity.updatedAt.getTime(),
        };
    }

    private getValidStatusTransitions(currentStatus: string): string[] {
        const transitions: Record<string, string[]> = {
            PENDING: ['CONFIRMED', 'CANCELLED'],
            CONFIRMED: ['PROCESSING', 'CANCELLED'],
            PROCESSING: ['SHIPPED', 'CANCELLED'],
            SHIPPED: ['DELIVERED'],
            DELIVERED: [],
            CANCELLED: [],
        };

        return transitions[currentStatus] || [];
    }
}
