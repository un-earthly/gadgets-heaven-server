import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './entities/order.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getTenantId } from '../tenants/tenant.context';

@ApiTags('Admin Orders')
@Controller('admin/orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tenant orders with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Returns order list' })
  async getTenantOrders(
    @Query('search') search?: string,
    @Query('status') status?: OrderStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not resolved');
    }
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.ordersService.findAdminOrders(tenantId, {
      search,
      status,
      page: pageNum,
      limit: limitNum,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details for tenant' })
  @ApiResponse({ status: 200, description: 'Returns order details', type: Order })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getTenantOrderDetail(@Param('id') id: string) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not resolved');
    }
    return this.ordersService.findOneAdmin(tenantId, id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update tenant order status' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully', type: Order })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateTenantOrderStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not resolved');
    }
    return this.ordersService.updateStatusAdmin(tenantId, id, status);
  }
}
