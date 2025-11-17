import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductEntity } from '../entities/product.entity';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [TypeOrmModule.forFeature([ProductEntity]), RedisModule],
    controllers: [ProductController],
    providers: [ProductService],
})
export class ProductModule { }
