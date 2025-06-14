import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { Product } from '../products/entities/product.entity';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { CreateWishlistItemDto } from './dto/create-wishlist-item.dto';
import { PriceAlertType } from './entities/wishlist-item.entity';

@Injectable()
export class WishlistService {
    constructor(
        @InjectRepository(Wishlist)
        private readonly wishlistRepository: Repository<Wishlist>,
        @InjectRepository(WishlistItem)
        private readonly wishlistItemRepository: Repository<WishlistItem>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }

    async createWishlist(userId: string, createWishlistDto: CreateWishlistDto): Promise<Wishlist> {
        const wishlist = this.wishlistRepository.create({
            ...createWishlistDto,
            userId,
        });
        return this.wishlistRepository.save(wishlist);
    }

    async getWishlist(id: string, userId: string): Promise<Wishlist> {
        const wishlist = await this.wishlistRepository.findOne({
            where: { id },
            relations: ['items', 'items.product'],
        });

        if (!wishlist) {
            throw new NotFoundException('Wishlist not found');
        }

        if (wishlist.userId !== userId && !wishlist.isPublic) {
            throw new NotFoundException('Wishlist not found');
        }

        return wishlist;
    }

    async getUserWishlists(userId: string): Promise<Wishlist[]> {
        return this.wishlistRepository.find({
            where: { userId },
            relations: ['items', 'items.product'],
        });
    }

    async addItemToWishlist(
        wishlistId: string,
        userId: string,
        createWishlistItemDto: CreateWishlistItemDto
    ): Promise<WishlistItem> {
        const wishlist = await this.wishlistRepository.findOne({
            where: { id: wishlistId, userId },
            relations: ['items'],
        });

        if (!wishlist) {
            throw new NotFoundException('Wishlist not found');
        }

        const product = await this.productRepository.findOne({
            where: { id: createWishlistItemDto.productId },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        // Check if product already exists in wishlist
        const existingItem = await this.wishlistItemRepository.findOne({
            where: { wishlistId, productId: product.id },
        });

        if (existingItem) {
            throw new BadRequestException('Product already exists in wishlist');
        }

        const wishlistItem = this.wishlistItemRepository.create({
            ...createWishlistItemDto,
            wishlistId,
            addedPrice: product.price,
            currentPrice: product.price,
            lowestPrice: product.price,
        });

        return this.wishlistItemRepository.save(wishlistItem);
    }

    async removeItemFromWishlist(wishlistId: string, itemId: string, userId: string): Promise<void> {
        const wishlist = await this.wishlistRepository.findOne({
            where: { id: wishlistId, userId },
        });

        if (!wishlist) {
            throw new NotFoundException('Wishlist not found');
        }

        const item = await this.wishlistItemRepository.findOne({
            where: { id: itemId, wishlistId },
        });

        if (!item) {
            throw new NotFoundException('Item not found in wishlist');
        }

        await this.wishlistItemRepository.remove(item);
    }

    async updatePrices(): Promise<void> {
        const items = await this.wishlistItemRepository.find({
            relations: ['product'],
        });

        for (const item of items) {
            if (!item.product) continue;

            const newPrice = item.product.price;
            if (newPrice !== item.currentPrice) {
                item.currentPrice = newPrice;
                item.lowestPrice = Math.min(item.lowestPrice, newPrice);

                // Check price alerts
                if (item.priceAlertType !== PriceAlertType.NONE) {
                    const shouldAlert = this.shouldTriggerPriceAlert(item, newPrice);
                    if (shouldAlert) {
                        // TODO: Trigger notification
                        console.log(`Price alert for item ${item.id}: ${newPrice}`);
                    }
                }

                await this.wishlistItemRepository.save(item);
            }
        }
    }

    private shouldTriggerPriceAlert(item: WishlistItem, newPrice: number): boolean {
        switch (item.priceAlertType) {
            case PriceAlertType.FIXED:
                return item.targetPrice && newPrice <= item.targetPrice;
            case PriceAlertType.PERCENTAGE:
                if (!item.priceDropPercentage) return false;
                const dropPercentage = ((item.addedPrice - newPrice) / item.addedPrice) * 100;
                return dropPercentage >= item.priceDropPercentage;
            case PriceAlertType.ANY:
                return newPrice < item.currentPrice;
            default:
                return false;
        }
    }

    async deleteWishlist(id: string, userId: string): Promise<void> {
        const wishlist = await this.wishlistRepository.findOne({
            where: { id, userId },
        });

        if (!wishlist) {
            throw new NotFoundException('Wishlist not found');
        }

        await this.wishlistRepository.remove(wishlist);
    }
} 