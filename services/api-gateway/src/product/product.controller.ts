import { Controller, Get, Post, Put, Delete, Body, Param, Query, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
    PRODUCT_SERVICE_NAME,
    ProductServiceClient,
    CreateProductRequest,
    UpdateProductRequest,
} from '../proto/product';
import { AuthGuard } from '../guards/auth.guard';

@Controller('products')
export class ProductController implements OnModuleInit {
    private productService: ProductServiceClient;

    constructor(@Inject(PRODUCT_SERVICE_NAME) private client: ClientGrpc) { }

    onModuleInit() {
        this.productService = this.client.getService<ProductServiceClient>(PRODUCT_SERVICE_NAME);
    }

    @Get()
    async listProducts(
        @Query('page') page: string = '1',
        @Query('pageSize') pageSize: string = '10',
        @Query('category') category: string = ''
    ) {
        const response = await firstValueFrom(
            this.productService.listProducts({
                page: parseInt(page, 10),
                pageSize: parseInt(pageSize, 10),
                category,
            })
        );
        return {
            products: response.products,
            total: response.total,
        };
    }

    @Get(':id')
    async getProduct(@Param('id') productId: string) {
        const response = await firstValueFrom(this.productService.getProduct({ productId }));
        return response.product;
    }

    @Post()
    @UseGuards(AuthGuard)
    async createProduct(@Body() body: CreateProductRequest) {
        const response = await firstValueFrom(this.productService.createProduct(body));
        return response.product;
    }

    @Put(':id')
    @UseGuards(AuthGuard)
    async updateProduct(@Param('id') productId: string, @Body() body: Omit<UpdateProductRequest, 'productId'>) {
        const response = await firstValueFrom(
            this.productService.updateProduct({
                productId,
                ...body,
            })
        );
        return response.product;
    }

    @Delete(':id')
    @UseGuards(AuthGuard)
    async deleteProduct(@Param('id') productId: string) {
        const response = await firstValueFrom(this.productService.deleteProduct({ productId }));
        return { success: response.success };
    }
}
