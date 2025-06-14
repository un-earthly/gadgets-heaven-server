import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory, StockStatus } from './entities/inventory.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateStockDto, StockUpdateType } from './dto/update-stock.dto';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class InventoryService {
    constructor(
        @InjectRepository(Inventory)
        private readonly inventoryRepository: Repository<Inventory>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }

    async create(createInventoryDto: CreateInventoryDto): Promise<Inventory> {
        const product = await this.productRepository.findOne({
            where: { id: createInventoryDto.productId },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        const existingInventory = await this.inventoryRepository.findOne({
            where: { productId: createInventoryDto.productId },
        });

        if (existingInventory) {
            throw new BadRequestException('Inventory already exists for this product');
        }

        const inventory = this.inventoryRepository.create({
            ...createInventoryDto,
            status: this.calculateStockStatus(
                createInventoryDto.quantity,
                createInventoryDto.minStockLevel,
                createInventoryDto.maxStockLevel
            ),
            stockMovements: [{
                date: new Date(),
                type: 'in',
                quantity: createInventoryDto.quantity,
                reason: 'Initial stock',
                reference: 'INIT',
            }],
        });

        return this.inventoryRepository.save(inventory);
    }

    private calculateStockStatus(quantity: number, minLevel: number, maxLevel: number): StockStatus {
        if (quantity <= 0) return StockStatus.OUT_OF_STOCK;
        if (quantity <= minLevel) return StockStatus.LOW_STOCK;
        if (quantity > maxLevel) return StockStatus.IN_STOCK;
        return StockStatus.IN_STOCK;
    }

    async findAll(): Promise<Inventory[]> {
        return this.inventoryRepository.find({
            relations: ['product'],
        });
    }

    async findOne(id: string): Promise<Inventory> {
        const inventory = await this.inventoryRepository.findOne({
            where: { id },
            relations: ['product'],
        });

        if (!inventory) {
            throw new NotFoundException('Inventory not found');
        }

        return inventory;
    }

    async findByProduct(productId: string): Promise<Inventory> {
        const inventory = await this.inventoryRepository.findOne({
            where: { productId },
            relations: ['product'],
        });

        if (!inventory) {
            throw new NotFoundException('Inventory not found for this product');
        }

        return inventory;
    }

    async updateStock(id: string, updateStockDto: UpdateStockDto): Promise<Inventory> {
        const inventory = await this.findOne(id);
        let quantityChange = updateStockDto.quantity;

        switch (updateStockDto.type) {
            case StockUpdateType.ADD:
                inventory.quantity += quantityChange;
                inventory.lastRestockDate = new Date();
                break;

            case StockUpdateType.REMOVE:
                if (inventory.quantity - quantityChange < 0) {
                    throw new BadRequestException('Insufficient stock');
                }
                inventory.quantity -= quantityChange;
                break;

            case StockUpdateType.DAMAGE:
                if (inventory.quantity - quantityChange < 0) {
                    throw new BadRequestException('Cannot mark more items as damaged than available');
                }
                inventory.quantity -= quantityChange;
                inventory.damagedQuantity += quantityChange;
                break;

            case StockUpdateType.RETURN:
                inventory.quantity += quantityChange;
                inventory.returnedQuantity += quantityChange;
                break;

            case StockUpdateType.RESERVE:
                if (inventory.quantity - quantityChange < 0) {
                    throw new BadRequestException('Cannot reserve more items than available');
                }
                inventory.quantity -= quantityChange;
                inventory.reservedQuantity += quantityChange;
                break;

            case StockUpdateType.RELEASE:
                if (inventory.reservedQuantity - quantityChange < 0) {
                    throw new BadRequestException('Cannot release more items than reserved');
                }
                inventory.quantity += quantityChange;
                inventory.reservedQuantity -= quantityChange;
                break;
        }

        inventory.status = this.calculateStockStatus(
            inventory.quantity,
            inventory.minStockLevel,
            inventory.maxStockLevel
        );

        inventory.stockMovements = [
            ...(inventory.stockMovements || []),
            {
                date: new Date(),
                type: updateStockDto.type === StockUpdateType.ADD ? 'in' : 'out',
                quantity: quantityChange,
                reason: updateStockDto.reason || updateStockDto.type,
                reference: updateStockDto.reference || `${updateStockDto.type.toUpperCase()}_${Date.now()}`,
            },
        ];

        return this.inventoryRepository.save(inventory);
    }

    async getLowStockProducts(): Promise<Inventory[]> {
        return this.inventoryRepository.find({
            where: { status: StockStatus.LOW_STOCK },
            relations: ['product'],
        });
    }

    async getInventoryStats(): Promise<{
        totalProducts: number;
        lowStockProducts: number;
        outOfStockProducts: number;
        totalValue: number;
    }> {
        const inventories = await this.inventoryRepository.find();

        return {
            totalProducts: inventories.length,
            lowStockProducts: inventories.filter(i => i.status === StockStatus.LOW_STOCK).length,
            outOfStockProducts: inventories.filter(i => i.status === StockStatus.OUT_OF_STOCK).length,
            totalValue: inventories.reduce((sum, i) => sum + (i.quantity * (i.costPerUnit || 0)), 0),
        };
    }

    async getStockMovements(id: string, startDate?: Date, endDate?: Date): Promise<Inventory['stockMovements']> {
        const inventory = await this.findOne(id);
        let movements = inventory.stockMovements || [];

        if (startDate) {
            movements = movements.filter(m => m.date >= startDate);
        }
        if (endDate) {
            movements = movements.filter(m => m.date <= endDate);
        }

        return movements;
    }
} 