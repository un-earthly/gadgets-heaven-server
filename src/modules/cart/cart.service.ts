import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, CartStatus } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class CartService {
    constructor(
        @InjectRepository(Cart)
        private readonly cartRepository: Repository<Cart>,
        @InjectRepository(CartItem)
        private readonly cartItemRepository: Repository<CartItem>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }

    async getActiveCart(userId: string): Promise<Cart> {
        let cart = await this.cartRepository.findOne({
            where: { userId, status: CartStatus.ACTIVE },
            relations: ['items', 'items.product'],
        });

        if (!cart) {
            cart = await this.cartRepository.save({
                userId,
                status: CartStatus.ACTIVE,
                items: [],
            });
        }

        return cart;
    }

    async addItem(userId: string, createCartItemDto: CreateCartItemDto): Promise<Cart> {
        const cart = await this.getActiveCart(userId);
        const product = await this.productRepository.findOne({
            where: { id: createCartItemDto.productId },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        if (product.stockQuantity < createCartItemDto.quantity) {
            throw new BadRequestException('Not enough stock available');
        }

        const existingItem = cart.items.find(item => item.productId === createCartItemDto.productId);

        if (existingItem) {
            existingItem.quantity += createCartItemDto.quantity;
            existingItem.subtotal = existingItem.quantity * existingItem.unitPrice;
            await this.cartItemRepository.save(existingItem);
        } else {
            const newItem = this.cartItemRepository.create({
                cartId: cart.id,
                productId: product.id,
                quantity: createCartItemDto.quantity,
                unitPrice: product.price,
                subtotal: product.price * createCartItemDto.quantity,
                selectedOptions: createCartItemDto.selectedOptions,
            });
            cart.items.push(await this.cartItemRepository.save(newItem));
        }

        await this.recalculateCart(cart);
        return this.cartRepository.save(cart);
    }

    async updateItem(userId: string, itemId: string, updateCartItemDto: UpdateCartItemDto): Promise<Cart> {
        const cart = await this.getActiveCart(userId);
        const item = cart.items.find(i => i.id === itemId);

        if (!item) {
            throw new NotFoundException('Cart item not found');
        }

        if (updateCartItemDto.quantity !== undefined) {
            const product = await this.productRepository.findOne({
                where: { id: item.productId },
            });

            if (!product) {
                throw new NotFoundException('Product not found');
            }

            if (product.stockQuantity < updateCartItemDto.quantity) {
                throw new BadRequestException('Not enough stock available');
            }

            item.quantity = updateCartItemDto.quantity;
            item.subtotal = item.quantity * item.unitPrice;
        }

        if (updateCartItemDto.selectedOptions) {
            item.selectedOptions = updateCartItemDto.selectedOptions;
        }

        await this.cartItemRepository.save(item);
        await this.recalculateCart(cart);
        return this.cartRepository.save(cart);
    }

    async removeItem(userId: string, itemId: string): Promise<Cart> {
        const cart = await this.getActiveCart(userId);
        const item = cart.items.find(i => i.id === itemId);

        if (!item) {
            throw new NotFoundException('Cart item not found');
        }

        await this.cartItemRepository.remove(item);
        cart.items = cart.items.filter(i => i.id !== itemId);
        await this.recalculateCart(cart);
        return this.cartRepository.save(cart);
    }

    async clearCart(userId: string): Promise<Cart> {
        const cart = await this.getActiveCart(userId);
        await this.cartItemRepository.remove(cart.items);
        cart.items = [];
        await this.recalculateCart(cart);
        return this.cartRepository.save(cart);
    }

    private async recalculateCart(cart: Cart): Promise<void> {
        cart.subtotal = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
        cart.tax = cart.subtotal * 0.1; // 10% tax rate - make configurable
        cart.total = cart.subtotal + cart.tax - cart.discount;
        cart.lastActivityAt = new Date();
    }

    async applyCoupon(userId: string, couponCode: string): Promise<Cart> {
        const cart = await this.getActiveCart(userId);
        // TODO: Implement coupon validation and discount calculation
        cart.couponCode = couponCode;
        cart.discount = cart.subtotal * 0.1; // Example 10% discount
        await this.recalculateCart(cart);
        return this.cartRepository.save(cart);
    }

    async removeCoupon(userId: string): Promise<Cart> {
        const cart = await this.getActiveCart(userId);
        cart.couponCode = null;
        cart.discount = 0;
        await this.recalculateCart(cart);
        return this.cartRepository.save(cart);
    }
} 