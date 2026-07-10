import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, CartStatus } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';

import { User } from '../users/entities/user.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
  ) {}

  async getActiveCart(id: string): Promise<Cart> {
    const userExists = await this.productRepository.manager.findOne(User, {
      where: { id },
    });

    const where: any = { status: CartStatus.ACTIVE };
    if (userExists) {
      where.userId = id;
    } else {
      where.guestSessionId = id;
    }

    let cart = await this.cartRepository.findOne({
      where,
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      cart = await this.cartRepository.save(
        this.cartRepository.create({
          userId: userExists ? id : null,
          guestSessionId: userExists ? null : id,
          status: CartStatus.ACTIVE,
          isGuestCart: !userExists,
          items: [],
        }),
      );
    }

    return cart!;
  }

  async addItem(
    userId: string,
    createCartItemDto: CreateCartItemDto,
  ): Promise<Cart> {
    const cart = await this.getActiveCart(userId);
    const product = await this.productRepository.findOne({
      where: { id: createCartItemDto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let variant: ProductVariant | null = null;
    if (createCartItemDto.variantId) {
      variant = await this.variantRepository.findOne({
        where: {
          id: createCartItemDto.variantId,
          productId: product.id,
        },
      });
      if (!variant) {
        throw new NotFoundException('Product variant not found');
      }
      if (variant.stockQuantity < createCartItemDto.quantity) {
        throw new BadRequestException('Not enough stock available');
      }
    } else if (product.stockQuantity < createCartItemDto.quantity) {
      throw new BadRequestException('Not enough stock available');
    }

    const unitPrice = variant?.priceOverride ?? product.price;

    const existingItem = cart.items.find(
      (item) =>
        item.productId === createCartItemDto.productId &&
        (item.variantId ?? null) === (createCartItemDto.variantId ?? null),
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + createCartItemDto.quantity;
      const availableStock = variant
        ? variant.stockQuantity
        : product.stockQuantity;
      if (availableStock < newQuantity) {
        throw new BadRequestException('Not enough stock available');
      }
      existingItem.quantity = newQuantity;
      existingItem.subtotal = existingItem.quantity * existingItem.unitPrice;
      await this.cartItemRepository.save(existingItem);
    } else {
      const newItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId: product.id,
        variantId: createCartItemDto.variantId,
        quantity: createCartItemDto.quantity,
        unitPrice,
        subtotal: unitPrice * createCartItemDto.quantity,
        selectedOptions: createCartItemDto.selectedOptions,
      });
      cart.items.push(await this.cartItemRepository.save(newItem));
    }

    await this.recalculateCart(cart);
    return this.cartRepository.save(cart);
  }

  async updateItem(
    userId: string,
    itemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<Cart> {
    const cart = await this.getActiveCart(userId);
    const item = cart.items.find((i) => i.id === itemId);

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (updateCartItemDto.quantity !== undefined) {
      if (item.variantId) {
        const variant = await this.variantRepository.findOne({
          where: { id: item.variantId, productId: item.productId },
        });

        if (!variant) {
          throw new NotFoundException('Product variant not found');
        }

        if (variant.stockQuantity < updateCartItemDto.quantity) {
          throw new BadRequestException('Not enough stock available');
        }
      } else {
        const product = await this.productRepository.findOne({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException('Product not found');
        }

        if (product.stockQuantity < updateCartItemDto.quantity) {
          throw new BadRequestException('Not enough stock available');
        }
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
    const item = cart.items.find((i) => i.id === itemId);

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemRepository.remove(item);
    cart.items = cart.items.filter((i) => i.id !== itemId);
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

  async mergeCart(userId: string, guestSessionId: string): Promise<Cart> {
    const guestCart = await this.cartRepository.findOne({
      where: { guestSessionId, status: CartStatus.ACTIVE },
      relations: ['items'],
    });

    if (!guestCart || !guestCart.items || guestCart.items.length === 0) {
      return this.getActiveCart(userId);
    }

    const customerCart = await this.getActiveCart(userId);

    for (const guestItem of guestCart.items) {
      const existingItem = customerCart.items.find(
        (item) =>
          item.productId === guestItem.productId &&
          (item.variantId ?? null) === (guestItem.variantId ?? null),
      );

      const product = await this.productRepository.findOne({
        where: { id: guestItem.productId },
      });
      if (!product) continue;

      let maxStock = product.stockQuantity;
      if (guestItem.variantId) {
        const variant = await this.variantRepository.findOne({
          where: { id: guestItem.variantId },
        });
        if (variant) {
          maxStock = variant.stockQuantity;
        }
      }

      if (existingItem) {
        const newQty = Math.min(
          existingItem.quantity + guestItem.quantity,
          maxStock,
        );
        existingItem.quantity = newQty;
        existingItem.subtotal = existingItem.quantity * existingItem.unitPrice;
        await this.cartItemRepository.save(existingItem);
      } else {
        const newQty = Math.min(guestItem.quantity, maxStock);
        if (newQty > 0) {
          const newItem = this.cartItemRepository.create({
            cartId: customerCart.id,
            productId: guestItem.productId,
            variantId: guestItem.variantId,
            quantity: newQty,
            unitPrice: guestItem.unitPrice,
            subtotal: guestItem.unitPrice * newQty,
            selectedOptions: guestItem.selectedOptions,
          });
          customerCart.items.push(await this.cartItemRepository.save(newItem));
        }
      }
    }

    // Remove the guest cart items and save the empty guest cart
    await this.cartItemRepository.remove(guestCart.items);
    guestCart.items = [];
    await this.recalculateCart(guestCart);
    await this.cartRepository.save(guestCart);

    // Recalculate customer cart
    await this.recalculateCart(customerCart);
    return this.cartRepository.save(customerCart);
  }
}
