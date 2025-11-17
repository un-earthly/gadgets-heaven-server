import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { ProductEntity } from '../entities/product.entity';
import { RedisService } from '../redis/redis.service';
import {
    CreateProductRequest,
    CreateProductResponse,
    GetProductRequest,
    GetProductResponse,
    UpdateProductRequest,
    UpdateProductResponse,
    DeleteProductRequest,
    DeleteProductResponse,
    ListProductsRequest,
    ListProductsResponse,
    SearchProductsRequest,
    SearchProductsResponse,
    UpdateInventoryRequest,
    UpdateInventoryResponse,
    CheckInventoryRequest,
    CheckInventoryResponse,
    Product,
} from '../proto/product';

@Injectable()
export class ProductService {
    private readonly CACHE_TTL = 3600; // 1 hour
    private readonly LIST_CACHE_TTL = 900; // 15 minutes

    constructor(
        @InjectRepository(ProductEntity)
        private productRepository: Repository<ProductEntity>,
        private redisService: RedisService,
    ) { }

    async createProduct(request: CreateProductRequest): Promise<CreateProductResponse> {
        try {
            const product = this.productRepository.create({
                name: request.name,
                description: request.description,
                price: request.price,
                category: request.category,
                stockQuantity: request.stockQuantity,
                sku: request.sku,
            });

            const savedProduct = await this.productRepository.save(product);

            return {
                product: this.mapEntityToProto(savedProduct),
            };
        } catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new RpcException({
                    code: status.ALREADY_EXISTS,
                    message: 'Product with this SKU already exists',
                });
            }
            throw new RpcException({
                code: status.INTERNAL,
                message: 'Failed to create product',
            });
        }
    }

    async getProduct(request: GetProductRequest): Promise<GetProductResponse> {
        // Try to get from cache first
        const cacheKey = `product:${request.productId}`;
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            return {
                product: JSON.parse(cached),
            };
        }

        const product = await this.productRepository.findOne({
            where: { id: request.productId },
        });

        if (!product) {
            throw new RpcException({
                code: status.NOT_FOUND,
                message: 'Product not found',
            });
        }

        const productProto = this.mapEntityToProto(product);

        // Cache the product
        await this.redisService.set(
            cacheKey,
            JSON.stringify(productProto),
            this.CACHE_TTL,
        );

        return {
            product: productProto,
        };
    }

    async updateProduct(request: UpdateProductRequest): Promise<UpdateProductResponse> {
        const product = await this.productRepository.findOne({
            where: { id: request.productId },
        });

        if (!product) {
            throw new RpcException({
                code: status.NOT_FOUND,
                message: 'Product not found',
            });
        }

        product.name = request.name;
        product.description = request.description;
        product.price = request.price;
        product.category = request.category;
        product.stockQuantity = request.stockQuantity;

        const updatedProduct = await this.productRepository.save(product);

        // Invalidate cache
        await this.redisService.del(`product:${request.productId}`);
        await this.redisService.delPattern('products:list:*');

        return {
            product: this.mapEntityToProto(updatedProduct),
        };
    }

    async deleteProduct(request: DeleteProductRequest): Promise<DeleteProductResponse> {
        const product = await this.productRepository.findOne({
            where: { id: request.productId },
        });

        if (!product) {
            throw new RpcException({
                code: status.NOT_FOUND,
                message: 'Product not found',
            });
        }

        await this.productRepository.remove(product);

        // Invalidate cache
        await this.redisService.del(`product:${request.productId}`);
        await this.redisService.delPattern('products:list:*');

        return {
            success: true,
        };
    }

    async listProducts(request: ListProductsRequest): Promise<ListProductsResponse> {
        const page = request.page || 1;
        const pageSize = request.pageSize || 10;
        const category = request.category || '';

        // Try to get from cache
        const cacheKey = `products:list:${page}:${pageSize}:${category}`;
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const queryBuilder = this.productRepository.createQueryBuilder('product');

        if (category) {
            queryBuilder.where('product.category = :category', { category });
        }

        const [products, total] = await queryBuilder
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        const response = {
            products: products.map((p) => this.mapEntityToProto(p)),
            total,
        };

        // Cache the result
        await this.redisService.set(
            cacheKey,
            JSON.stringify(response),
            this.LIST_CACHE_TTL,
        );

        return response;
    }

    async searchProducts(request: SearchProductsRequest): Promise<SearchProductsResponse> {
        const page = request.page || 1;
        const pageSize = request.pageSize || 10;
        const query = request.query || '';

        const queryBuilder = this.productRepository.createQueryBuilder('product');

        if (query) {
            queryBuilder.where(
                'product.name ILIKE :query OR product.description ILIKE :query',
                { query: `%${query}%` },
            );
        }

        const [products, total] = await queryBuilder
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        return {
            products: products.map((p) => this.mapEntityToProto(p)),
            total,
        };
    }

    async updateInventory(request: UpdateInventoryRequest): Promise<UpdateInventoryResponse> {
        const product = await this.productRepository.findOne({
            where: { id: request.productId },
        });

        if (!product) {
            throw new RpcException({
                code: status.NOT_FOUND,
                message: 'Product not found',
            });
        }

        product.stockQuantity += request.quantityChange;

        if (product.stockQuantity < 0) {
            throw new RpcException({
                code: status.FAILED_PRECONDITION,
                message: 'Insufficient stock',
            });
        }

        await this.productRepository.save(product);

        // Invalidate cache
        await this.redisService.del(`product:${request.productId}`);

        return {
            newQuantity: product.stockQuantity,
        };
    }

    async checkInventory(request: CheckInventoryRequest): Promise<CheckInventoryResponse> {
        const product = await this.productRepository.findOne({
            where: { id: request.productId },
        });

        if (!product) {
            throw new RpcException({
                code: status.NOT_FOUND,
                message: 'Product not found',
            });
        }

        return {
            availableQuantity: product.stockQuantity,
            inStock: product.stockQuantity > 0,
        };
    }

    private mapEntityToProto(entity: ProductEntity): Product {
        return {
            productId: entity.id,
            name: entity.name,
            description: entity.description,
            price: Number(entity.price),
            category: entity.category,
            stockQuantity: entity.stockQuantity,
            sku: entity.sku,
            createdAt: entity.createdAt.getTime(),
            updatedAt: entity.updatedAt.getTime(),
        };
    }
}
