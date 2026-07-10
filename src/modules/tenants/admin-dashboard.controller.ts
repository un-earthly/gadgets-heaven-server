import {
  Controller,
  Get,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getTenantId } from './tenant.context';

@ApiTags('Admin Dashboard')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get current dashboard metrics for the tenant' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getMetrics() {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not resolved');
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    // Monday as start of week
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Queries scoped to active tenant
    const todayOrders = await this.orderRepository.find({
      where: {
        tenantId,
        createdAt: MoreThanOrEqual(startOfToday),
      },
    });

    const weekOrders = await this.orderRepository.find({
      where: {
        tenantId,
        createdAt: MoreThanOrEqual(startOfWeek),
      },
    });

    const todayRevenue = todayOrders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const weekRevenue = weekOrders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    // Low stock count (threshold <= 5)
    // We need to count products where stock is <= 5, OR we can also check variants.
    // Let's count products where stockQuantity <= 5 and status is not discontinued,
    // and they don't have variants, or if they have variants, look at the variants.
    // To keep it robust, let's load products with variants.
    const products = await this.productRepository.find({
      where: { tenantId },
      relations: ['variants'],
    });

    let lowStockCount = 0;
    for (const product of products) {
      if (product.variants && product.variants.length > 0) {
        const hasLowStockVariant = product.variants.some((v) => v.stockQuantity <= 5);
        if (hasLowStockVariant) {
          lowStockCount++;
        }
      } else {
        if (product.stockQuantity <= 5) {
          lowStockCount++;
        }
      }
    }

    return {
      todayOrderCount: todayOrders.length,
      weekOrderCount: weekOrders.length,
      todayRevenue,
      weekRevenue,
      lowStockProductCount: lowStockCount,
    };
  }
}
