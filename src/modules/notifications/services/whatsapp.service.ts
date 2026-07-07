import { Injectable, Logger } from '@nestjs/common';

export interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
}

// WhatsApp Business (Cloud) API sender. Stateless: credentials are resolved
// per tenant by the caller and passed in, matching the module's pattern of
// provider services that carry no tenant state of their own.
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  private get baseUrl(): string {
    return (
      process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com/v19.0'
    );
  }

  async sendTextMessage(
    credentials: WhatsAppCredentials,
    recipientPhone: string,
    body: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${encodeURIComponent(credentials.phoneNumberId)}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: recipientPhone,
            type: 'text',
            text: { body },
          }),
        },
      );

      const data = (await response.json()) as Record<string, any>;
      if (!response.ok) {
        this.logger.warn(
          `WhatsApp send failed (${response.status}): ${JSON.stringify(data.error || data)}`,
        );
        return { success: false, error: data.error?.message || 'send failed' };
      }

      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (error) {
      this.logger.warn(`WhatsApp send error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
