export interface IWhatsAppAdapter {
  /**
   * Send a plain text message to a phone number.
   */
  sendText(to: string, body: string): Promise<{ messageId?: string }>;

  /**
   * Send an interactive button message.
   */
  sendButtons(
    to: string,
    body: string,
    buttons: { id: string; title: string }[],
  ): Promise<{ messageId?: string }>;

  /**
   * Send a message using a pre-approved template.
   */
  sendTemplate(
    to: string,
    templateName: string,
    language: string,
    components?: Record<string, any>[],
  ): Promise<{ messageId?: string }>;

  /**
   * Mark a received message as read.
   */
  markRead(messageId: string): Promise<void>;
}

export const WHATSAPP_ADAPTER = Symbol('WHATSAPP_ADAPTER');
