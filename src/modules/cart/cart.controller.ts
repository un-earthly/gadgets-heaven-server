import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CartService } from './cart.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Cart } from './entities/cart.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
    constructor(private readonly cartService: CartService) { }

    @Get()
    @ApiOperation({ summary: 'Get active cart' })
    @ApiResponse({ status: 200, description: 'Returns the active cart', type: Cart })
    async getActiveCart(@GetUser('id') userId: string): Promise<Cart> {
        return this.cartService.getActiveCart(userId);
    }

    @Post('items')
    @ApiOperation({ summary: 'Add item to cart' })
    @ApiResponse({ status: 201, description: 'Item added to cart', type: Cart })
    async addItem(
        @GetUser('id') userId: string,
        @Body() createCartItemDto: CreateCartItemDto,
    ): Promise<Cart> {
        return this.cartService.addItem(userId, createCartItemDto);
    }

    @Put('items/:itemId')
    @ApiOperation({ summary: 'Update cart item' })
    @ApiResponse({ status: 200, description: 'Cart item updated', type: Cart })
    async updateItem(
        @GetUser('id') userId: string,
        @Param('itemId') itemId: string,
        @Body() updateCartItemDto: UpdateCartItemDto,
    ): Promise<Cart> {
        return this.cartService.updateItem(userId, itemId, updateCartItemDto);
    }

    @Delete('items/:itemId')
    @ApiOperation({ summary: 'Remove item from cart' })
    @ApiResponse({ status: 200, description: 'Item removed from cart', type: Cart })
    async removeItem(
        @GetUser('id') userId: string,
        @Param('itemId') itemId: string,
    ): Promise<Cart> {
        return this.cartService.removeItem(userId, itemId);
    }

    @Delete()
    @ApiOperation({ summary: 'Clear cart' })
    @ApiResponse({ status: 200, description: 'Cart cleared', type: Cart })
    async clearCart(@GetUser('id') userId: string): Promise<Cart> {
        return this.cartService.clearCart(userId);
    }

    @Post('coupon')
    @ApiOperation({ summary: 'Apply coupon to cart' })
    @ApiResponse({ status: 200, description: 'Coupon applied to cart', type: Cart })
    async applyCoupon(
        @GetUser('id') userId: string,
        @Body('couponCode') couponCode: string,
    ): Promise<Cart> {
        return this.cartService.applyCoupon(userId, couponCode);
    }

    @Delete('coupon')
    @ApiOperation({ summary: 'Remove coupon from cart' })
    @ApiResponse({ status: 200, description: 'Coupon removed from cart', type: Cart })
    async removeCoupon(@GetUser('id') userId: string): Promise<Cart> {
        return this.cartService.removeCoupon(userId);
    }
} 