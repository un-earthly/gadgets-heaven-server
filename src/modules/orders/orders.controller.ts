import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Order } from './entities/order.entity';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new order' })
    @ApiResponse({ status: 201, description: 'Order created successfully', type: Order })
    create(@Request() req, @Body() createOrderDto: CreateOrderDto) {
        return this.ordersService.create(req.user.id, createOrderDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all orders for the current user' })
    @ApiResponse({ status: 200, description: 'Returns all orders', type: [Order] })
    findAll(@Request() req) {
        return this.ordersService.findAll(req.user.id);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get order statistics for the current user' })
    @ApiResponse({ status: 200, description: 'Returns order statistics' })
    getStats(@Request() req) {
        return this.ordersService.findUserOrderStats(req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific order by ID' })
    @ApiResponse({ status: 200, description: 'Returns the order', type: Order })
    findOne(@Request() req, @Param('id') id: string) {
        return this.ordersService.findOne(req.user.id, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an order' })
    @ApiResponse({ status: 200, description: 'Order updated successfully', type: Order })
    update(
        @Request() req,
        @Param('id') id: string,
        @Body() updateOrderDto: UpdateOrderDto,
    ) {
        return this.ordersService.update(req.user.id, id, updateOrderDto);
    }

    @Delete(':id/cancel')
    @ApiOperation({ summary: 'Cancel an order' })
    @ApiResponse({ status: 200, description: 'Order cancelled successfully', type: Order })
    cancel(@Request() req, @Param('id') id: string) {
        return this.ordersService.cancel(req.user.id, id);
    }
} 