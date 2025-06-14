import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WishlistService } from './wishlist.service';
import { Wishlist } from './entities/wishlist.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { CreateWishlistItemDto } from './dto/create-wishlist-item.dto';

@ApiTags('wishlist')
@ApiBearerAuth()
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
    constructor(private readonly wishlistService: WishlistService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new wishlist' })
    @ApiResponse({ status: 201, description: 'Wishlist created successfully', type: Wishlist })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async createWishlist(
        @Request() req,
        @Body() createWishlistDto: CreateWishlistDto
    ): Promise<Wishlist> {
        return this.wishlistService.createWishlist(req.user.id, createWishlistDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all wishlists for the current user' })
    @ApiResponse({ status: 200, description: 'Returns all wishlists', type: [Wishlist] })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getUserWishlists(@Request() req): Promise<Wishlist[]> {
        return this.wishlistService.getUserWishlists(req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific wishlist by ID' })
    @ApiResponse({ status: 200, description: 'Returns the wishlist', type: Wishlist })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Wishlist not found' })
    async getWishlist(
        @Request() req,
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<Wishlist> {
        return this.wishlistService.getWishlist(id, req.user.id);
    }

    @Post(':id/items')
    @ApiOperation({ summary: 'Add an item to a wishlist' })
    @ApiResponse({ status: 201, description: 'Item added successfully', type: WishlistItem })
    @ApiResponse({ status: 400, description: 'Invalid input data or item already exists' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Wishlist or product not found' })
    async addItemToWishlist(
        @Request() req,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() createWishlistItemDto: CreateWishlistItemDto
    ): Promise<WishlistItem> {
        return this.wishlistService.addItemToWishlist(id, req.user.id, createWishlistItemDto);
    }

    @Delete(':wishlistId/items/:itemId')
    @ApiOperation({ summary: 'Remove an item from a wishlist' })
    @ApiResponse({ status: 200, description: 'Item removed successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Wishlist or item not found' })
    async removeItemFromWishlist(
        @Request() req,
        @Param('wishlistId', ParseUUIDPipe) wishlistId: string,
        @Param('itemId', ParseUUIDPipe) itemId: string
    ): Promise<void> {
        return this.wishlistService.removeItemFromWishlist(wishlistId, itemId, req.user.id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a wishlist' })
    @ApiResponse({ status: 200, description: 'Wishlist deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Wishlist not found' })
    async deleteWishlist(
        @Request() req,
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<void> {
        return this.wishlistService.deleteWishlist(id, req.user.id);
    }
} 