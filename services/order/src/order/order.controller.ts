import { Controller } from '@nestjs/common';
import { OrderService } from './order.service';
import {
    OrderServiceController,
    OrderServiceControllerMethods,
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
} from '../proto/order';

@Controller()
@OrderServiceControllerMethods()
export class OrderController implements OrderServiceController {
    constructor(private readonly orderService: OrderService) { }

    async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
        return this.orderService.createOrder(request);
    }

    async getOrder(request: GetOrderRequest): Promise<GetOrderResponse> {
        return this.orderService.getOrder(request);
    }

    async updateOrderStatus(request: UpdateOrderStatusRequest): Promise<UpdateOrderStatusResponse> {
        return this.orderService.updateOrderStatus(request);
    }

    async cancelOrder(request: CancelOrderRequest): Promise<CancelOrderResponse> {
        return this.orderService.cancelOrder(request);
    }

    async listOrders(request: ListOrdersRequest): Promise<ListOrdersResponse> {
        return this.orderService.listOrders(request);
    }

    async getUserOrders(request: GetUserOrdersRequest): Promise<GetUserOrdersResponse> {
        return this.orderService.getUserOrders(request);
    }
}
