import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { User } from './modules/users/entities/user.entity';
import { Order } from './modules/orders/entities/order.entity';
import { Review } from './modules/reviews/entities/review.entity';
import { Category } from './modules/categories/entities/category.entity';
import { Cart } from './modules/cart/entities/cart.entity';
import { CartItem } from './modules/cart/entities/cart-item.entity';
import { Product } from './modules/products/entities/product.entity';
import { ProductVariant } from './modules/products/entities/product-variant.entity';
import { Payment } from './modules/payments/entities/payment.entity';
import { CartModule } from './modules/cart/cart.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { Wishlist } from './modules/wishlist/entities/wishlist.entity';
import { WishlistItem } from './modules/wishlist/entities/wishlist-item.entity';
import { Tenant } from './modules/tenants/entities/tenant.entity';
import { TenantsModule } from './modules/tenants/tenants.module';
import { TenantMiddleware } from './modules/tenants/middleware/tenant.middleware';
import { APP_GUARD } from '@nestjs/core';
import { AdminTenantGuard } from './modules/auth/guards/admin-tenant.guard';
import { Inventory } from './modules/inventory/entities/inventory.entity';
import { BulkOrder } from './modules/inventory/entities/bulk-order.entity';
import { FinanceModule } from './modules/finance/finance.module';
import { Transaction } from './modules/finance/entities/transaction.entity';
import { Invoice } from './modules/finance/entities/invoice.entity';
import { Payout } from './modules/finance/entities/payout.entity';
import { Installment } from './modules/finance/entities/installment.entity';
import { NotificationTemplate } from './modules/notifications/entities/notification-template.entity';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [
          Tenant,
          User,
          Order,
          Review,
          Category,
          Cart,
          CartItem,
          Product,
          ProductVariant,
          Payment,
          Wishlist,
          WishlistItem,
          Inventory,
          BulkOrder,
          Transaction,
          Invoice,
          Payout,
          Installment,
          NotificationTemplate,
        ],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    TenantsModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    ReviewsModule,
    CartModule,
    PaymentsModule,
    InventoryModule,
    WishlistModule,
    FinanceModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AdminTenantGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
