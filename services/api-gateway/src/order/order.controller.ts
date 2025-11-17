import { Controller, Get, Post, Put, Body, Param, Query, Inject, OnModuleInit, UseGuards, Req } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
    ORDER_SERVICE_NAME,
    OrderServiceClient,
    CreateOrderRequest,
    UpdateOrderStatusRequest,
    OrderStatus,
} from '../proto/order';
import { AuthGuard } from '../guards/auth.guard';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrderController implements OnModuleInit {
    private orderService: OrderServiceClient;

    constructor(@Inject(ORDER_SERVICE_NAME) private client: ClientGrpc) { }

    onModuleInit() {
        this.orderService = this.client.getService<OrderServiceClient>(ORDER_SERVICE_NAME);
    }

    @Post()
    async createOrder(@Body() body: Omit<CreateOrderRequest, 'userId'>, @Req() req: any) {
        const userId = req.user.userId;
        const response = await firstValueFrom(
            this.orderService.createOrder({
                userId,
                items: body.items,
                shippingAddress: body.shippingAddress,
            })
        );
        return response.order;
    }

    @Get(':id')
    async getOrder(@Param('id') orderId: string) {
        const response = await firstValueFrom(this.orderService.getOrder({ orderId }));
        return response.order;
    }

    @Get('user/:userId')
    async getUserOrders(
        @Param('userId') userId: string,
        @Query('page') page: string = '1',
        @Query('pageSize') pageSize: string = '10'
    ) {
        const response = await firstValueFrom(
            this.orderService.getUserOrders({
                userId,
                page: parseInt(page, 10),
                pageSize: parseInt(pageSize, 10),
            })
        );
        return {
            orders: response.orders,
            total: response.total,
        };
    }

    @Put(':id/status')
    async updateOrderStatus(@Param('id') orderId: string, @Body() body: { status: OrderStatus }) {
        const response = await firstValueFrom(
            this.orderService.updateOrderStatus({
                orderId,
                status: body.status,
            })
        );
        return response.order;
    }
}
