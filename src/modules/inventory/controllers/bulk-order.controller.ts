import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { BulkOrderService } from '../services/bulk-order.service';
import { CreateBulkOrderDto } from '../dto/create-bulk-order.dto';
import { BulkOrder, BulkOrderStatus, BulkOrderPriority } from '../entities/bulk-order.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('bulk-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BulkOrderController {
    constructor(private readonly bulkOrderService: BulkOrderService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.VENDOR)
    async create(
        @GetUser('id') userId: string,
        @Body() createBulkOrderDto: CreateBulkOrderDto
    ): Promise<BulkOrder> {
        return this.bulkOrderService.create(userId, createBulkOrderDto);
    }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.VENDOR)
    async findAll(
        @GetUser('id') userId: string,
        @GetUser('role') userRole: UserRole,
        @Query('status') status?: BulkOrderStatus,
        @Query('priority') priority?: BulkOrderPriority
    ): Promise<BulkOrder[]> {
        const filters: any = {};

        if (status) filters.status = status;
        if (priority) filters.priority = priority;

        // If not admin, only show own orders
        if (userRole !== UserRole.ADMIN) {
            filters.userId = userId;
        }

        return this.bulkOrderService.findAll(filters);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.VENDOR)
    async findOne(@Param('id') id: string): Promise<BulkOrder> {
        return this.bulkOrderService.findOne(id);
    }

    @Patch(':id/status')
    @Roles(UserRole.ADMIN, UserRole.VENDOR)
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: BulkOrderStatus,
        @Body('note') note?: string
    ): Promise<BulkOrder> {
        return this.bulkOrderService.updateStatus(id, status, note);
    }

    @Patch(':id/shipping')
    @Roles(UserRole.ADMIN, UserRole.VENDOR)
    async updateShippingDetails(
        @Param('id') id: string,
        @Body() shippingDetails: any
    ): Promise<BulkOrder> {
        return this.bulkOrderService.updateShippingDetails(id, shippingDetails);
    }

    @Patch(':id/payment')
    @Roles(UserRole.ADMIN, UserRole.VENDOR)
    async updatePaymentDetails(
        @Param('id') id: string,
        @Body() paymentDetails: any
    ): Promise<BulkOrder> {
        return this.bulkOrderService.updatePaymentDetails(id, paymentDetails);
    }

    @Get('summary/date-range')
    @Roles(UserRole.ADMIN, UserRole.VENDOR)
    async getBulkOrderSummary(
        @GetUser('id') userId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        return this.bulkOrderService.getBulkOrderSummary(
            userId,
            new Date(startDate),
            new Date(endDate)
        );
    }
} 