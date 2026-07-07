// Swappable payment-gateway abstraction. SSLCommerz is the first
// implementation; bKash/Nagad-direct or others can be added later by
// implementing this class and swapping the provider binding — calling code
// (PaymentsService) never talks to a gateway SDK/API directly.

export interface GatewayCredentials {
  storeId: string;
  storePassword: string;
}

export interface InitiatePaymentParams {
  amount: number;
  currency: string;
  transactionId: string;
  orderId: string;
  productName: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  urls: {
    success: string;
    fail: string;
    cancel: string;
    ipn: string;
  };
}

export interface InitiatePaymentResult {
  redirectUrl: string;
  sessionKey?: string;
  raw?: Record<string, unknown>;
}

export interface GatewayValidationResult {
  valid: boolean;
  status: 'paid' | 'failed' | 'cancelled' | 'unknown';
  gatewayTransactionId?: string;
  amount?: number;
  raw?: Record<string, unknown>;
}

export abstract class PaymentGatewayService {
  abstract initiatePayment(
    credentials: GatewayCredentials,
    params: InitiatePaymentParams,
  ): Promise<InitiatePaymentResult>;

  // Validates an IPN/callback payload against the gateway using the
  // tenant's own credentials — never trust the raw POST body alone.
  abstract validatePayment(
    credentials: GatewayCredentials,
    payload: Record<string, string>,
  ): Promise<GatewayValidationResult>;
}
