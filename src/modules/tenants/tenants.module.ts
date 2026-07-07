import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { TenantSubscriber } from './tenant.subscriber';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { User } from '../users/entities/user.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, Category, Product, ProductVariant, User]),
  ],
  controllers: [TenantsController],
  providers: [TenantsService, TenantSubscriber],
  exports: [TenantsService, TypeOrmModule],
})
export class TenantsModule {}
