import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, FindOptionsWhere, In } from 'typeorm';
import { Product, ProductStatus } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }

    async create(createProductDto: CreateProductDto, vendorId: string): Promise<Product> {
        const product = this.productRepository.create({
            ...createProductDto,
            vendor: { id: vendorId },
        });
        return this.productRepository.save(product);
    }

    async findAll(query: ProductQueryDto): Promise<{ items: Product[]; total: number }> {
        const {
            search,
            categories,
            minPrice,
            maxPrice,
            status,
            brand,
            isFeatured,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
        } = query;

        const where: FindOptionsWhere<Product> = {};

        if (search) {
            where.name = Like(`%${search}%`);
        }

        if (categories?.length) {
            where.categories = In(categories);
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            where.price = Between(minPrice || 0, maxPrice || 999999999);
        }

        if (status) {
            where.status = status;
        }

        if (brand) {
            where.brand = brand;
        }

        if (isFeatured !== undefined) {
            where.isFeatured = isFeatured;
        }

        const [items, total] = await this.productRepository.findAndCount({
            where,
            order: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
            relations: ['vendor'],
        });

        return { items, total };
    }

    async findOne(id: string): Promise<Product> {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: ['vendor'],
        });

        if (!product) {
            throw new NotFoundException(`Product with ID "${id}" not found`);
        }

        return product;
    }

    async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
        const product = await this.findOne(id);
        Object.assign(product, updateProductDto);
        return this.productRepository.save(product);
    }

    async remove(id: string): Promise<void> {
        const result = await this.productRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Product with ID "${id}" not found`);
        }
    }

    async updateStock(id: string, quantity: number): Promise<Product> {
        const product = await this.findOne(id);
        product.stockQuantity += quantity;

        if (product.stockQuantity <= 0) {
            product.status = ProductStatus.OUT_OF_STOCK;
        } else if (product.status === ProductStatus.OUT_OF_STOCK) {
            product.status = ProductStatus.PUBLISHED;
        }

        return this.productRepository.save(product);
    }

    async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
        return this.productRepository.find({
            where: { isFeatured: true, status: ProductStatus.PUBLISHED },
            take: limit,
            order: { createdAt: 'DESC' },
        });
    }

    async searchProducts(term: string, limit: number = 10): Promise<Product[]> {
        return this.productRepository.find({
            where: [
                { name: Like(`%${term}%`) },
                { description: Like(`%${term}%`) },
                { brand: Like(`%${term}%`) },
            ],
            take: limit,
        });
    }
} 