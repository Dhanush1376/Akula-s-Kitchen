import logger from '../../../../config/logger';
import { IEmailProvider, EmailSendOptions, EmailSendResult } from '../../types';
import nodemailer from 'nodemailer';
import { resolveSender } from '../../../../config/emailSender';

export class SMTPProvider implements IEmailProvider {
  name = 'SMTP';
  private cachedTransporter: any = null;

  isConfigured(): boolean {
    return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    if (!this.isConfigured()) {
      return { success: false, provider: this.name, error: new Error('SMTP is not configured') };
    }

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const configuredPort = Number(process.env.SMTP_PORT);
    const smtpPort = configuredPort || (smtpHost.includes('gmail') ? 465 : 587);
    const isSecure = smtpPort === 465;

    if (!this.cachedTransporter) {
      this.cachedTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: isSecure,
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
        auth: { user: smtpUser, pass: smtpPass },
        tls: { rejectUnauthorized: false },
        family: 4,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 15000,
      } as any);
    }

    const sender = resolveSender({ name: options.from, replyTo: options.replyTo });

    try {
      const info = await this.cachedTransporter.sendMail({
        from: `"${sender.name}" <${sender.email}>`,
        replyTo: sender.replyTo,
        to: options.to,
        subject: options.subject,
        html: options.html,
        headers: options.headers,
        attachments: options.attachments,
      });

      logger.info(`[SMTP SUCCESS] Email sent to ${options.to}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, provider: this.name };
    } catch (error: any) {
      this.cachedTransporter = null;
      logger.error(`[SMTP FAILED] ${error.message}`);
      return { success: false, provider: this.name, error };
    }
  }
}
