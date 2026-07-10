import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductVariantsService } from './product-variants.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from './dto/product.dto';
import {
  CreateProductVariantDto,
  UpdateProductVariantDto,
} from './dto/product-variant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Product } from './entities/product.entity';
import { getTenantId } from '../tenants/tenant.context';

@ApiTags('Admin Products')
@Controller('admin/products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productVariantsService: ProductVariantsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product as admin' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async create(
    @Body() createProductDto: CreateProductDto,
    @Req() req: any,
  ): Promise<Product> {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not resolved');
    }
    return this.productsService.create(createProductDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tenant products as admin' })
  @ApiResponse({ status: 200, description: 'Returns products list' })
  async findAll(@Query() query: ProductQueryDto) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not resolved');
    }
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by id as admin' })
  @ApiResponse({ status: 200, description: 'Returns a product' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not resolved');
    }
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update product as admin' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not resolved');
    }
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete product as admin' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id') id: string) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not resolved');
    }
    return this.productsService.remove(id);
  }

  @Post(':id/variants')
  @ApiOperation({ summary: 'Add a variant to a product as admin' })
  @ApiResponse({ status: 201, description: 'Variant created successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async createVariant(
    @Param('id') id: string,
    @Body() createVariantDto: CreateProductVariantDto,
  ) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not resolved');
    }
    return this.productVariantsService.create(id, createVariantDto);
  }

  @Get(':id/variants')
  @ApiOperation({ summary: 'Get all variants of a product as admin' })
  @ApiResponse({ status: 200, description: 'Returns product variants' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findVariants(@Param('id') id: string) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not resolved');
    }
    return this.productVariantsService.findAllForProduct(id);
  }

  @Put(':id/variants/:variantId')
  @ApiOperation({ summary: 'Update a product variant as admin' })
  @ApiResponse({ status: 200, description: 'Variant updated successfully' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() updateVariantDto: UpdateProductVariantDto,
  ) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not resolved');
    }
    return this.productVariantsService.update(id, variantId, updateVariantDto);
  }

  @Delete(':id/variants/:variantId')
  @ApiOperation({ summary: 'Delete a product variant as admin' })
  @ApiResponse({ status: 200, description: 'Variant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async removeVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context not resolved');
    }
    return this.productVariantsService.remove(id, variantId);
  }
}
