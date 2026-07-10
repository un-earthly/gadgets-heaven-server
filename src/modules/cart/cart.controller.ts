import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Cart } from './entities/cart.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly jwtService: JwtService,
  ) {}

  private resolveUserId(req: any): string {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = this.jwtService.verify(token);
        if (decoded && decoded.sub) {
          return decoded.sub;
        }
      } catch (err) {
        // Treat as guest if token is invalid or expired
      }
    }
    const guestSessionId = req.headers['x-guest-session-id'] as string;
    if (!guestSessionId) {
      throw new BadRequestException(
        'Missing user authentication or guest session ID',
      );
    }
    return guestSessionId;
  }

  @Get()
  @ApiOperation({ summary: 'Get active cart' })
  @ApiResponse({
    status: 200,
    description: 'Returns the active cart',
    type: Cart,
  })
  async getActiveCart(@Request() req): Promise<Cart> {
    const userId = this.resolveUserId(req);
    return this.cartService.getActiveCart(userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart', type: Cart })
  async addItem(
    @Request() req,
    @Body() createCartItemDto: CreateCartItemDto,
  ): Promise<Cart> {
    const userId = this.resolveUserId(req);
    return this.cartService.addItem(userId, createCartItemDto);
  }

  @Put('items/:itemId')
  @ApiOperation({ summary: 'Update cart item' })
  @ApiResponse({ status: 200, description: 'Cart item updated', type: Cart })
  async updateItem(
    @Request() req,
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ): Promise<Cart> {
    const userId = this.resolveUserId(req);
    return this.cartService.updateItem(userId, itemId, updateCartItemDto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({
    status: 200,
    description: 'Item removed from cart',
    type: Cart,
  })
  async removeItem(
    @Request() req,
    @Param('itemId') itemId: string,
  ): Promise<Cart> {
    const userId = this.resolveUserId(req);
    return this.cartService.removeItem(userId, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared', type: Cart })
  async clearCart(@Request() req): Promise<Cart> {
    const userId = this.resolveUserId(req);
    return this.cartService.clearCart(userId);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge guest cart into user cart' })
  @ApiResponse({
    status: 200,
    description: 'Carts merged successfully',
    type: Cart,
  })
  async mergeCart(
    @Request() req,
    @Body('guestSessionId') guestSessionId: string,
  ): Promise<Cart> {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required to merge cart');
    }
    const token = authHeader.split(' ')[1];
    let userId: string;
    try {
      const decoded = this.jwtService.verify(token);
      userId = decoded.sub;
    } catch (err) {
      throw new UnauthorizedException('Invalid session');
    }

    if (!guestSessionId) {
      throw new BadRequestException('Missing guestSessionId');
    }

    return this.cartService.mergeCart(userId, guestSessionId);
  }

  @Post('coupon')
  @ApiOperation({ summary: 'Apply coupon to cart' })
  @ApiResponse({
    status: 200,
    description: 'Coupon applied to cart',
    type: Cart,
  })
  async applyCoupon(
    @Request() req,
    @Body('couponCode') couponCode: string,
  ): Promise<Cart> {
    const userId = this.resolveUserId(req);
    return this.cartService.applyCoupon(userId, couponCode);
  }

  @Delete('coupon')
  @ApiOperation({ summary: 'Remove coupon from cart' })
  @ApiResponse({
    status: 200,
    description: 'Coupon removed from cart',
    type: Cart,
  })
  async removeCoupon(@Request() req): Promise<Cart> {
    const userId = this.resolveUserId(req);
    return this.cartService.removeCoupon(userId);
  }
}
