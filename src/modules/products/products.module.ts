import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductVariantsService } from './product-variants.service';
import { ProductsController } from './products.controller';
import { AdminProductsController } from './admin-products.controller';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant])],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService, ProductVariantsService],
  exports: [ProductsService, ProductVariantsService],
})
export class ProductsModule {}
