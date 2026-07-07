import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  PaymentGatewayService,
  GatewayCredentials,
  InitiatePaymentParams,
  InitiatePaymentResult,
  GatewayValidationResult,
} from './payment-gateway.interface';

// SSLCommerz hosted-checkout integration (v4 API).
// Defaults to the sandbox; set SSLCOMMERZ_BASE_URL to
// https://securepay.sslcommerz.com for live traffic.
@Injectable()
export class SslCommerzGateway extends PaymentGatewayService {
  private readonly logger = new Logger(SslCommerzGateway.name);

  private get baseUrl(): string {
    return (
      process.env.SSLCOMMERZ_BASE_URL || 'https://sandbox.sslcommerz.com'
    );
  }

  async initiatePayment(
    credentials: GatewayCredentials,
    params: InitiatePaymentParams,
  ): Promise<InitiatePaymentResult> {
    const body = new URLSearchParams({
      store_id: credentials.storeId,
      store_passwd: credentials.storePassword,
      total_amount: params.amount.toFixed(2),
      currency: params.currency,
      tran_id: params.transactionId,
      success_url: params.urls.success,
      fail_url: params.urls.fail,
      cancel_url: params.urls.cancel,
      ipn_url: params.urls.ipn,
      product_name: params.productName,
      product_category: 'ecommerce',
      product_profile: 'physical-goods',
      shipping_method: 'Courier',
      cus_name: params.customer.name,
      cus_email: params.customer.email,
      cus_add1: params.customer.address,
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: params.customer.phone,
      ship_name: params.customer.name,
      ship_add1: params.customer.address,
      ship_city: 'Dhaka',
      ship_country: 'Bangladesh',
      ship_postcode: '1000',
      value_a: params.orderId,
    });

    const response = await fetch(`${this.baseUrl}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new BadRequestException(
        `SSLCommerz session request failed with HTTP ${response.status}`,
      );
    }

    const data = (await response.json()) as Record<string, any>;
    if (data.status !== 'SUCCESS' || !data.GatewayPageURL) {
      this.logger.warn(
        `SSLCommerz session rejected: ${data.failedreason || data.status}`,
      );
      throw new BadRequestException(
        data.failedreason || 'SSLCommerz session could not be created',
      );
    }

    return {
      redirectUrl: data.GatewayPageURL,
      sessionKey: data.sessionkey,
      raw: data,
    };
  }

  async validatePayment(
    credentials: GatewayCredentials,
    payload: Record<string, string>,
  ): Promise<GatewayValidationResult> {
    const status = (payload.status || '').toUpperCase();
    if (status === 'FAILED') {
      return { valid: true, status: 'failed', raw: payload };
    }
    if (status === 'CANCELLED') {
      return { valid: true, status: 'cancelled', raw: payload };
    }

    const valId = payload.val_id;
    if (!valId) {
      return { valid: false, status: 'unknown', raw: payload };
    }

    const query = new URLSearchParams({
      val_id: valId,
      store_id: credentials.storeId,
      store_passwd: credentials.storePassword,
      format: 'json',
    });

    const response = await fetch(
      `${this.baseUrl}/validator/api/validationserverAPI.php?${query.toString()}`,
    );
    if (!response.ok) {
      return { valid: false, status: 'unknown', raw: payload };
    }

    const data = (await response.json()) as Record<string, any>;
    const validated =
      data.status === 'VALID' || data.status === 'VALIDATED';

    return {
      valid: validated,
      status: validated ? 'paid' : 'unknown',
      gatewayTransactionId: data.bank_tran_id || data.tran_id,
      amount: data.amount !== undefined ? Number(data.amount) : undefined,
      raw: data,
    };
  }
}
