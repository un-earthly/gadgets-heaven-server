import { Controller, Get, Post, Body, Param, UseGuards, Query, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { InventoryService } from '../services/inventory.service';
import { CreateInventoryDto } from '../dto/create-inventory.dto';
import { UpdateStockDto } from '../dto/update-stock.dto';
import { Inventory } from '../entities/inventory.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Post()
    @Roles('admin')
    @ApiOperation({ summary: 'Create new inventory item' })
    @ApiResponse({ status: 201, description: 'Inventory item created successfully', type: Inventory })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
    create(@Body() createInventoryDto: CreateInventoryDto): Promise<Inventory> {
        return this.inventoryService.create(createInventoryDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all inventory items' })
    @ApiResponse({ status: 200, description: 'Returns all inventory items', type: [Inventory] })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    findAll(): Promise<Inventory[]> {
        return this.inventoryService.findAll();
    }

    @Get('low-stock')
    @Roles('admin')
    @ApiOperation({ summary: 'Get low stock products' })
    @ApiResponse({ status: 200, description: 'Returns low stock products', type: [Inventory] })
    async getLowStockProducts(): Promise<Inventory[]> {
        return this.inventoryService.getLowStockProducts();
    }

    @Get('stats')
    @Roles('admin')
    @ApiOperation({ summary: 'Get inventory statistics' })
    @ApiResponse({ status: 200, description: 'Returns inventory statistics' })
    async getStats(): Promise<{
        totalProducts: number;
        lowStockProducts: number;
        outOfStockProducts: number;
        totalValue: number;
    }> {
        return this.inventoryService.getInventoryStats();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get inventory item by ID' })
    @ApiResponse({ status: 200, description: 'Returns the inventory item', type: Inventory })
    @ApiResponse({ status: 404, description: 'Inventory item not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Inventory> {
        return this.inventoryService.findOne(id);
    }

    @Get('product/:productId')
    @ApiOperation({ summary: 'Get inventory by product ID' })
    @ApiResponse({ status: 200, description: 'Returns the inventory for the product', type: Inventory })
    async findByProduct(@Param('productId', ParseUUIDPipe) productId: string): Promise<Inventory> {
        return this.inventoryService.findByProduct(productId);
    }

    @Post(':id/stock')
    @Roles('admin')
    @ApiOperation({ summary: 'Update stock quantity' })
    @ApiResponse({ status: 200, description: 'Stock updated successfully', type: Inventory })
    @ApiResponse({ status: 400, description: 'Invalid input data or insufficient stock' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
    @ApiResponse({ status: 404, description: 'Inventory item not found' })
    updateStock(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateStockDto: UpdateStockDto
    ): Promise<Inventory> {
        return this.inventoryService.updateStock(id, updateStockDto);
    }

    @Get(':id/movements')
    @Roles('admin')
    @ApiOperation({ summary: 'Get stock movements' })
    @ApiResponse({ status: 200, description: 'Returns stock movements' })
    async getStockMovements(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ): Promise<Inventory['stockMovements']> {
        return this.inventoryService.getStockMovements(
            id,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );
    }
} 