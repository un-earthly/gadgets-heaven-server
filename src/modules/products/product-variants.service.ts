import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { getTenantId } from '../tenants/tenant.context';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from './entities/product.entity';
import {
  CreateProductVariantDto,
  UpdateProductVariantDto,
} from './dto/product-variant.dto';

@Injectable()
export class ProductVariantsService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  // Resolves the parent product tenant-scoped, so a productId belonging to
  // another tenant 404s before any variant row is touched.
  private async resolveProduct(productId: string): Promise<Product> {
    const where: FindOptionsWhere<Product> = { id: productId };
    const tenantId = getTenantId();
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const product = await this.productRepository.findOne({ where });
    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }
    return product;
  }

  async create(
    productId: string,
    createVariantDto: CreateProductVariantDto,
  ): Promise<ProductVariant> {
    const product = await this.resolveProduct(productId);

    const tenantId = getTenantId();
    const duplicateWhere: FindOptionsWhere<ProductVariant> = {
      sku: createVariantDto.sku,
    };
    if (tenantId) {
      duplicateWhere.tenantId = tenantId;
    }
    const duplicate = await this.variantRepository.findOne({
      where: duplicateWhere,
    });
    if (duplicate) {
      throw new BadRequestException(
        `A variant with SKU "${createVariantDto.sku}" already exists`,
      );
    }

    const variant = this.variantRepository.create({
      ...createVariantDto,
      productId: product.id,
    });
    return this.variantRepository.save(variant);
  }

  async findAllForProduct(productId: string): Promise<ProductVariant[]> {
    await this.resolveProduct(productId);

    const where: FindOptionsWhere<ProductVariant> = { productId };
    const tenantId = getTenantId();
    if (tenantId) {
      where.tenantId = tenantId;
    }

    return this.variantRepository.find({
      where,
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(productId: string, id: string): Promise<ProductVariant> {
    const where: FindOptionsWhere<ProductVariant> = { id, productId };
    const tenantId = getTenantId();
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const variant = await this.variantRepository.findOne({ where });
    if (!variant) {
      throw new NotFoundException(`Variant with ID "${id}" not found`);
    }
    return variant;
  }

  async update(
    productId: string,
    id: string,
    updateVariantDto: UpdateProductVariantDto,
  ): Promise<ProductVariant> {
    const variant = await this.findOne(productId, id);

    if (updateVariantDto.sku && updateVariantDto.sku !== variant.sku) {
      const tenantId = getTenantId();
      const duplicateWhere: FindOptionsWhere<ProductVariant> = {
        sku: updateVariantDto.sku,
      };
      if (tenantId) {
        duplicateWhere.tenantId = tenantId;
      }
      const duplicate = await this.variantRepository.findOne({
        where: duplicateWhere,
      });
      if (duplicate) {
        throw new BadRequestException(
          `A variant with SKU "${updateVariantDto.sku}" already exists`,
        );
      }
    }

    Object.assign(variant, updateVariantDto);
    return this.variantRepository.save(variant);
  }

  async remove(productId: string, id: string): Promise<void> {
    const variant = await this.findOne(productId, id);
    await this.variantRepository.remove(variant);
  }
}
