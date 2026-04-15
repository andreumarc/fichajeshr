import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IWhatsAppAdapter } from './whatsapp-adapter.interface';

const META_API_VERSION = 'v19.0';

@Injectable()
export class MetaWhatsAppAdapter implements IWhatsAppAdapter {
  private readonly logger = new Logger(MetaWhatsAppAdapter.name);
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.phoneNumberId = config.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';
    this.accessToken = config.get('WHATSAPP_ACCESS_TOKEN') ?? '';
    this.baseUrl = `https://graph.facebook.com/${META_API_VERSION}/${this.phoneNumberId}`;
  }

  async sendText(to: string, body: string): Promise<{ messageId?: string }> {
    if (!this.accessToken || !this.phoneNumberId) {
      this.logger.warn(`[DEV] WA→${to}: ${body}`);
      return {};
    }
    try {
      const { data } = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body },
        },
        { headers: this.authHeaders() },
      );
      return { messageId: data?.messages?.[0]?.id };
    } catch (err: any) {
      this.logger.error('Error sending WA text', err?.response?.data ?? err.message);
      return {};
    }
  }

  async sendButtons(
    to: string,
    body: string,
    buttons: { id: string; title: string }[],
  ): Promise<{ messageId?: string }> {
    if (!this.accessToken || !this.phoneNumberId) {
      this.logger.warn(`[DEV] WA buttons→${to}: ${body}`);
      return {};
    }
    try {
      const { data } = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: body },
            action: {
              buttons: buttons.slice(0, 3).map((b) => ({
                type: 'reply',
                reply: { id: b.id, title: b.title },
              })),
            },
          },
        },
        { headers: this.authHeaders() },
      );
      return { messageId: data?.messages?.[0]?.id };
    } catch (err: any) {
      this.logger.error('Error sending WA buttons', err?.response?.data ?? err.message);
      return {};
    }
  }

  async sendTemplate(
    to: string,
    templateName: string,
    language = 'es',
    components: Record<string, any>[] = [],
  ): Promise<{ messageId?: string }> {
    if (!this.accessToken || !this.phoneNumberId) {
      this.logger.warn(`[DEV] WA template→${to}: ${templateName}`);
      return {};
    }
    try {
      const { data } = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: { name: templateName, language: { code: language }, components },
        },
        { headers: this.authHeaders() },
      );
      return { messageId: data?.messages?.[0]?.id };
    } catch (err: any) {
      this.logger.error('Error sending WA template', err?.response?.data ?? err.message);
      return {};
    }
  }

  async markRead(messageId: string): Promise<void> {
    if (!this.accessToken || !this.phoneNumberId) return;
    try {
      await axios.post(
        `${this.baseUrl}/messages`,
        { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
        { headers: this.authHeaders() },
      );
    } catch {}
  }

  private authHeaders() {
    return { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' };
  }
}
