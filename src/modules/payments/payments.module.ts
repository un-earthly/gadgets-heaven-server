import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { Transaction } from '../finance/entities/transaction.entity';
import { PaymentGatewayService } from './gateways/payment-gateway.interface';
import { SslCommerzGateway } from './gateways/sslcommerz.gateway';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order, Transaction]),
    NotificationsModule,
    OrdersModule,
  ],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [
    PaymentsService,
    // Swap this binding to change the payment gateway implementation.
    { provide: PaymentGatewayService, useClass: SslCommerzGateway },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
