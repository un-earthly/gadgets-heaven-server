import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  CourierService,
  CourierCredentials,
  CreateConsignmentParams,
  ConsignmentResult,
  TrackingResult,
} from './courier.interface';

// Steadfast Courier integration (portal.packzy.com API v1).
// Tracking is pull-based: Steadfast's webhook offering is not enabled on
// every merchant account, while the status API is always available, so v1
// refreshes tracking on demand (admin action / schedulable job).
@Injectable()
export class SteadfastCourier extends CourierService {
  private readonly logger = new Logger(SteadfastCourier.name);

  private get baseUrl(): string {
    return process.env.STEADFAST_BASE_URL || 'https://portal.packzy.com/api/v1';
  }

  private headers(credentials: CourierCredentials): Record<string, string> {
    return {
      'Api-Key': credentials.apiKey,
      'Secret-Key': credentials.secretKey,
      'Content-Type': 'application/json',
    };
  }

  async createConsignment(
    credentials: CourierCredentials,
    params: CreateConsignmentParams,
  ): Promise<ConsignmentResult> {
    const response = await fetch(`${this.baseUrl}/create_order`, {
      method: 'POST',
      headers: this.headers(credentials),
      body: JSON.stringify({
        invoice: params.invoice,
        recipient_name: params.recipientName,
        recipient_phone: params.recipientPhone,
        recipient_address: params.recipientAddress,
        cod_amount: params.codAmount,
        note: params.note,
      }),
    });

    if (!response.ok) {
      throw new BadRequestException(
        `Steadfast consignment request failed with HTTP ${response.status}`,
      );
    }

    const data = (await response.json()) as Record<string, any>;
    if (data.status !== 200 || !data.consignment) {
      this.logger.warn(`Steadfast rejected consignment: ${data.message}`);
      throw new BadRequestException(
        data.message || 'Steadfast consignment could not be created',
      );
    }

    return {
      consignmentId: String(data.consignment.consignment_id),
      trackingCode: data.consignment.tracking_code,
      status: data.consignment.status || 'in_review',
      raw: data,
    };
  }

  async getTrackingStatus(
    credentials: CourierCredentials,
    consignmentId: string,
  ): Promise<TrackingResult> {
    const response = await fetch(
      `${this.baseUrl}/status_by_cid/${encodeURIComponent(consignmentId)}`,
      { headers: this.headers(credentials) },
    );

    if (!response.ok) {
      throw new BadRequestException(
        `Steadfast status request failed with HTTP ${response.status}`,
      );
    }

    const data = (await response.json()) as Record<string, any>;
    const status = data.delivery_status || 'unknown';

    return {
      status,
      delivered: status === 'delivered' || status === 'partial_delivered',
      cancelled: status === 'cancelled',
      raw: data,
    };
  }
}
