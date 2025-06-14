import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Transaction } from './entities/transaction.entity';
import { Invoice } from './entities/invoice.entity';
import { Installment } from './entities/installment.entity';
import { Payout } from './entities/payout.entity';

// Services
import { TransactionService } from './services/transaction.service';
import { InvoiceService } from './services/invoice.service';
import { InstallmentService } from './services/installment.service';
import { PayoutService } from './services/payout.service';

// Controllers
import { TransactionController } from './controllers/transaction.controller';
import { InvoiceController } from './controllers/invoice.controller';
import { InstallmentController } from './controllers/installment.controller';
import { PayoutController } from './controllers/payout.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Transaction,
            Invoice,
            Installment,
            Payout,
        ]),
    ],
    providers: [
        TransactionService,
        InvoiceService,
        InstallmentService,
        PayoutService,
    ],
    controllers: [
        TransactionController,
        InvoiceController,
        InstallmentController,
        PayoutController,
    ],
    exports: [
        TransactionService,
        InvoiceService,
        InstallmentService,
        PayoutService,
    ],
})
export class FinanceModule { } 