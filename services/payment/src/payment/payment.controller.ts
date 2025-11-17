import { Controller } from '@nestjs/common';
import { PaymentService } from './payment.service';
import {
    PaymentServiceController,
    PaymentServiceControllerMethods,
    ProcessPaymentRequest,
    ProcessPaymentResponse,
    GetPaymentRequest,
    GetPaymentResponse,
    RefundPaymentRequest,
    RefundPaymentResponse,
    ListPaymentsRequest,
    ListPaymentsResponse,
} from '../proto/payment';

@Controller()
@PaymentServiceControllerMethods()
export class PaymentController implements PaymentServiceController {
    constructor(private readonly paymentService: PaymentService) { }

    async processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResponse> {
        return this.paymentService.processPayment(request);
    }

    async getPayment(request: GetPaymentRequest): Promise<GetPaymentResponse> {
        return this.paymentService.getPayment(request);
    }

    async refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResponse> {
        return this.paymentService.refundPayment(request);
    }

    async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
        return this.paymentService.listPayments(request);
    }
}
