import logger from '../../../../config/logger';
import { IEmailProvider, EmailSendOptions, EmailSendResult } from '../../types';
import { resolveSender } from '../../../../config/emailSender';

export class BrevoProvider implements IEmailProvider {
  name = 'Brevo';

  isConfigured(): boolean {
    const key = process.env.BREVO_API_KEY;
    return Boolean(key && !key.startsWith('xsmtpsib-'));
  }

  async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    if (!this.isConfigured()) {
      return { success: false, provider: this.name, error: new Error('Brevo is not configured') };
    }

    const apiKey = process.env.BREVO_API_KEY!;
    // Never fall back to the store's public support email: it may be a personal inbox.
    const sender = resolveSender({ name: options.from, replyTo: options.replyTo });

    const body: any = {
      sender: { name: sender.name, email: sender.email },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
    };

    if (sender.replyTo) {
      body.replyTo = { email: sender.replyTo };
    }

    if (options.headers && Object.keys(options.headers).length > 0) {
      body.headers = options.headers;
    }

    if (options.attachments && options.attachments.length > 0) {
      body.attachment = options.attachments.map((a) => ({
        name: a.filename,
        content:
          typeof a.content === 'string'
            ? Buffer.from(a.content).toString('base64')
            : a.content.toString('base64'),
      }));
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Brevo API error (${response.status}): ${errorText}`);
      }

      const result: any = await response.json();
      logger.info(
        `[BREVO SUCCESS] Email delivered to ${options.to}. MessageId: ${result.messageId}`,
      );
      return { success: true, messageId: result.messageId || 'brevo-sent', provider: this.name };
    } catch (error: any) {
      logger.error(`[BREVO FAILED] ${error.message}`);
      return { success: false, provider: this.name, error };
    }
  }
}
