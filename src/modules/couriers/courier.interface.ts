// Swappable courier abstraction, same pattern as PaymentGatewayService.
// Steadfast is the first implementation; Pathao/RedX can be added by
// implementing this class and swapping the binding in CouriersModule.

export interface CourierCredentials {
  apiKey: string;
  secretKey: string;
}

export interface CreateConsignmentParams {
  invoice: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number;
  note?: string;
}

export interface ConsignmentResult {
  consignmentId: string;
  trackingCode?: string;
  status: string;
  raw?: Record<string, unknown>;
}

export interface TrackingResult {
  status: string;
  delivered: boolean;
  cancelled: boolean;
  raw?: Record<string, unknown>;
}

export abstract class CourierService {
  abstract createConsignment(
    credentials: CourierCredentials,
    params: CreateConsignmentParams,
  ): Promise<ConsignmentResult>;

  abstract getTrackingStatus(
    credentials: CourierCredentials,
    consignmentId: string,
  ): Promise<TrackingResult>;
}
