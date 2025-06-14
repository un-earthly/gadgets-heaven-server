import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Transaction } from './entities/transaction.entity';
import { Invoice } from './entities/invoice.entity';
import { Installment } from './entities/installment.entity';

// Services
import { TransactionService } from './services/transaction.service';
import { InvoiceService } from './services/invoice.service';
import { InstallmentService } from './services/installment.service';

// Controllers
import { TransactionController } from './controllers/transaction.controller';
import { InvoiceController } from './controllers/invoice.controller';
import { InstallmentController } from './controllers/installment.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Transaction,
            Invoice,
            Installment,
        ]),
    ],
    providers: [
        TransactionService,
        InvoiceService,
        InstallmentService,
    ],
    controllers: [
        TransactionController,
        InvoiceController,
        InstallmentController,
    ],
    exports: [
        TransactionService,
        InvoiceService,
        InstallmentService,
    ],
})
export class FinanceModule { } 