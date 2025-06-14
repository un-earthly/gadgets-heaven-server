import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './controllers/inventory.controller';
import { InventoryService } from './services/inventory.service';
import { Inventory } from './entities/inventory.entity';
import { Product } from '../products/entities/product.entity';
import { BulkOrder } from './entities/bulk-order.entity';
import { BulkOrderService } from './services/bulk-order.service';
import { BulkOrderController } from './controllers/bulk-order.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([Inventory, Product, BulkOrder]),
    ],
    controllers: [InventoryController, BulkOrderController],
    providers: [InventoryService, BulkOrderService],
    exports: [InventoryService, BulkOrderService],
})
export class InventoryModule { } 