import { Controller, Get, Post, Body, Param, Inject, OnModuleInit, UseGuards, Req } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
    PAYMENT_SERVICE_NAME,
    PaymentServiceClient,
    ProcessPaymentRequest,
    RefundPaymentRequest,
} from '../proto/payment';
import { AuthGuard } from '../guards/auth.guard';

@Controller('payments')
@UseGuards(AuthGuard)
export class PaymentController implements OnModuleInit {
    private paymentService: PaymentServiceClient;

    constructor(@Inject(PAYMENT_SERVICE_NAME) private client: ClientGrpc) { }

    onModuleInit() {
        this.paymentService = this.client.getService<PaymentServiceClient>(PAYMENT_SERVICE_NAME);
    }

    @Post('process')
    async processPayment(@Body() body: Omit<ProcessPaymentRequest, 'userId'>, @Req() req: any) {
        const userId = req.user.userId;
        const response = await firstValueFrom(
            this.paymentService.processPayment({
                userId,
                orderId: body.orderId,
                amount: body.amount,
                paymentMethod: body.paymentMethod,
                paymentDetails: body.paymentDetails,
            })
        );
        return response.payment;
    }

    @Get(':orderId')
    async getPayment(@Param('orderId') orderId: string) {
        // Note: In a real implementation, we'd need to get payment by order ID
        // For now, we'll use the orderId as paymentId (this should be adjusted based on actual service implementation)
        const response = await firstValueFrom(this.paymentService.getPayment({ paymentId: orderId }));
        return response.payment;
    }

    @Post('refund')
    async refundPayment(@Body() body: RefundPaymentRequest) {
        const response = await firstValueFrom(this.paymentService.refundPayment(body));
        return response.payment;
    }
}
