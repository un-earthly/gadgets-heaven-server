import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Product } from './entities/product.entity';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new product' })
    @ApiResponse({ status: 201, description: 'Product created successfully' })
    async create(@Body() createProductDto: CreateProductDto, @Req() req: any): Promise<Product> {
        return this.productsService.create(createProductDto, req.user.id);
    }

    @Get()
    @ApiOperation({ summary: 'Get all products with filters' })
    @ApiResponse({ status: 200, description: 'Returns products list' })
    async findAll(@Query() query: ProductQueryDto) {
        return this.productsService.findAll(query);
    }

    @Get('featured')
    @ApiOperation({ summary: 'Get featured products' })
    @ApiResponse({ status: 200, description: 'Returns featured products' })
    async getFeatured(@Query('limit') limit: number) {
        return this.productsService.getFeaturedProducts(limit);
    }

    @Get('search')
    @ApiOperation({ summary: 'Search products' })
    @ApiResponse({ status: 200, description: 'Returns search results' })
    async search(@Query('term') term: string, @Query('limit') limit: number) {
        return this.productsService.searchProducts(term, limit);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get product by id' })
    @ApiResponse({ status: 200, description: 'Returns a product' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update product' })
    @ApiResponse({ status: 200, description: 'Product updated successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
        return this.productsService.update(id, updateProductDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete product' })
    @ApiResponse({ status: 200, description: 'Product deleted successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }

    @Put(':id/stock')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update product stock' })
    @ApiResponse({ status: 200, description: 'Stock updated successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async updateStock(
        @Param('id') id: string,
        @Body('quantity') quantity: number,
    ) {
        return this.productsService.updateStock(id, quantity);
    }
} 