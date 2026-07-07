import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

// Public (unauthenticated) endpoints the payment gateway calls back to.
// The tenant is carried in the query string because SSLCommerz cannot send
// our tenant headers; PaymentsService re-enters the tenant context and
// validates with that tenant's own credentials.
@ApiTags('payments')
@Controller('payments')
export class PaymentsWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('ipn')
  @ApiOperation({ summary: 'SSLCommerz IPN endpoint (gateway-to-server)' })
  async ipn(
    @Query('tenant') tenantSlug: string,
    @Body() payload: Record<string, string>,
  ) {
    if (!tenantSlug) {
      throw new BadRequestException('Missing tenant');
    }
    return this.paymentsService.processGatewayNotification(
      tenantSlug,
      payload,
    );
  }

  @Post('callback/:outcome')
  @ApiExcludeEndpoint()
  async callbackPost(
    @Param('outcome') outcome: string,
    @Query('tenant') tenantSlug: string,
    @Query('tran_id') tranId: string,
    @Body() payload: Record<string, string>,
    @Res() res: Response,
  ) {
    // Success/fail/cancel arrive as browser POSTs from the gateway; process
    // the payload (defensive — the IPN is the authoritative signal), then
    // send the customer back to the storefront.
    if (tenantSlug && payload && Object.keys(payload).length > 0) {
      try {
        await this.paymentsService.processGatewayNotification(tenantSlug, {
          ...payload,
          tran_id: payload.tran_id || tranId,
        });
      } catch {
        // The redirect must still happen; the IPN retries independently.
      }
    }
    return res.redirect(this.storefrontUrl(outcome, tranId));
  }

  @Get('callback/:outcome')
  @ApiExcludeEndpoint()
  callbackGet(
    @Param('outcome') outcome: string,
    @Query('tran_id') tranId: string,
    @Res() res: Response,
  ) {
    return res.redirect(this.storefrontUrl(outcome, tranId));
  }

  private storefrontUrl(outcome: string, tranId: string): string {
    const base = process.env.STOREFRONT_URL || 'http://localhost:3001';
    const safeOutcome = ['success', 'fail', 'cancel'].includes(outcome)
      ? outcome
      : 'fail';
    return `${base}/payment/${safeOutcome}?tran_id=${encodeURIComponent(tranId || '')}`;
  }
}
