import logger from '../config/logger';
import { getActiveAdminEmailsFromDB } from '../config/adminConfig';
import crypto from 'crypto';
import {
  buildOrderConfirmationCustomerEmail,
  buildOrderConfirmationAdminEmail,
  buildOrderStatusChangeEmail,
  buildPaymentFailedEmail,
  buildInquiryCustomerEmail,
  buildInquiryAdminEmail,
} from '../utils/email/transactionalEmailTemplates';

import { sendDirectEmailProcessor } from './notificationService';

export class TransactionalEmailService {
  /**
   * Safe wrapper to enqueue an email for persistent delivery.
   * Uses outbox/queue so failures don't block the main thread.
   */
  private static async enqueueEmail(
    to: string,
    subject: string,
    html: string,
    type: 'order' | 'system' | 'engagement',
    action: string,
    notificationKey: string,
    attachments?: { filename: string; content: Buffer | string; contentType?: string }[],
  ) {
    if (!to) {
      logger.warn(`[EMAIL TRACE][ENQUEUE] skipped — no recipient for action=${action}`);
      return;
    }

    const emailOptions: any = {
      email: to,
      subject,
      customHtml: html,
      type,
      action,
      notificationKey, // For DB-level idempotency
    };

    if (attachments && attachments.length > 0) {
      emailOptions.attachments = attachments;
    }

    logger.info(`[EMAIL TRACE] Sending email directly (bypassing queue) for ${action} to ${to}`);

    try {
      // Await synchronous delivery to guarantee the mail is pushed to SMTP
      await sendDirectEmailProcessor(emailOptions);
    } catch (err: any) {
      logger.error(
        `[TransactionalEmailService] Failed to send email for ${action}: ${err?.message}`,
        err,
      );
      throw err; // Let OutboxProcessor handle the retry logic
    }
  }

  private static hashEmail(email: string) {
    return crypto.createHash('md5').update(email).digest('hex').substring(0, 8);
  }

  /**
   * Broadcasts an email to all active operational admins
   */
  private static async notifyAllAdmins(
    subject: string,
    html: string,
    action: string,
    outboxEventId: string,
    baseKey: string,
  ) {
    try {
      const adminEmails = await getActiveAdminEmailsFromDB();
      if (!adminEmails || adminEmails.length === 0) {
        logger.warn(`[TransactionalEmailService] No active admins found to notify for ${action}`);
        return;
      }

      for (const email of adminEmails) {
        const adminHash = this.hashEmail(email);
        const notificationKey = `${baseKey}:${outboxEventId}:ADMIN:${adminHash}`;
        await this.enqueueEmail(email, subject, html, 'system', action, notificationKey);
      }
    } catch (err) {
      logger.error(`[TransactionalEmailService] Failed to notify admins for ${action}:`, err);
    }
  }

  // ==========================================
  // ORDER EMAILS (COD & Online)
  // ==========================================

  public static async sendOrderPlacedEmails(order: any, user: any, eventId: string) {
    logger.info(`[TransactionalEmailService] Dispatching order placed emails for ${order._id}`);

    // 1. Notify Customer
    const customerEmail = user?.email || order.shippingAddress?.email;
    if (customerEmail) {
      const { subject, html } = buildOrderConfirmationCustomerEmail(order, user);
      const customerHash = this.hashEmail(customerEmail);
      const notificationKey = `ORDER_CREATED:${eventId}:CUSTOMER:${customerHash}`;

      await this.enqueueEmail(
        customerEmail,
        subject,
        html,
        'order',
        'order_confirmation_customer',
        notificationKey,
      );
    }

    // 2. Notify Admins
    const adminTemplate = buildOrderConfirmationAdminEmail(order);
    await this.notifyAllAdmins(
      adminTemplate.subject,
      adminTemplate.html,
      'order_confirmation_admin',
      eventId,
      'ORDER_CREATED',
    );
  }

  public static async sendPaymentSuccessEmails(order: any, user: any, eventId: string) {
    logger.info(`[TransactionalEmailService] Dispatching payment success emails for ${order._id}`);
    await this.sendOrderPlacedEmails(order, user, eventId);
  }

  public static async sendOrderStatusChangeEmail(
    order: any,
    user: any,
    oldStatus: string,
    newStatus: string,
    eventId: string,
  ) {
    logger.info(`[TransactionalEmailService] Dispatching status change email for ${order._id}`);
    const customerEmail = user?.email || order.shippingAddress?.email;
    if (customerEmail) {
      const { subject, html } = buildOrderStatusChangeEmail(order, oldStatus, newStatus);
      const customerHash = this.hashEmail(customerEmail);
      const notificationKey = `ORDER_STATUS_UPDATED:${eventId}:CUSTOMER:${customerHash}`;
      await this.enqueueEmail(
        customerEmail,
        subject,
        html,
        'order',
        'order_status_change',
        notificationKey,
      );
    }

    // Admins only receive website notifications for status changes to prevent email spam.
    // The notification is handled by the outbox processor.
  }

  public static async sendPaymentFailedEmail(
    order: any,
    user: any,
    reason: string,
    eventId: string,
  ) {
    logger.info(`[TransactionalEmailService] Dispatching payment failed email for ${order._id}`);
    const customerEmail = user?.email || order.shippingAddress?.email;
    if (customerEmail) {
      const { subject, html } = buildPaymentFailedEmail(order, reason);
      const customerHash = this.hashEmail(customerEmail);
      const notificationKey = `PAYMENT_FAILED:${eventId}:CUSTOMER:${customerHash}`;
      await this.enqueueEmail(
        customerEmail,
        subject,
        html,
        'order',
        'payment_failed',
        notificationKey,
      );
    }
  }

  // ==========================================
  // INQUIRY EMAILS
  // ==========================================

  public static async sendInquiryEmails(inquiry: any, eventId: string) {
    logger.info(
      `[EMAIL TRACE][INQUIRY][04] sendInquiryEmails entered eventId=${eventId} customerRecipient=${!!inquiry.email}`,
    );

    // 1. Notify Customer
    if (inquiry.email) {
      const { subject, html } = buildInquiryCustomerEmail(inquiry);
      const customerHash = this.hashEmail(inquiry.email);
      const notificationKey = `INQUIRY_CREATED:${eventId}:CUSTOMER:${customerHash}`;
      logger.info(
        `[EMAIL TRACE][INQUIRY][04a] customer email: subjectLen=${subject?.length ?? 0} htmlLen=${html?.length ?? 0} key=${notificationKey}`,
      );
      await this.enqueueEmail(
        inquiry.email,
        subject,
        html,
        'engagement',
        'inquiry_customer',
        notificationKey,
      );
    }

    // 2. Notify Admins
    const adminEmails = await getActiveAdminEmailsFromDB();
    logger.info(`[EMAIL TRACE][INQUIRY][04b] adminRecipientCount=${adminEmails?.length ?? 0}`);
    const adminTemplate = buildInquiryAdminEmail(inquiry);
    await this.notifyAllAdmins(
      adminTemplate.subject,
      adminTemplate.html,
      'inquiry_admin',
      eventId,
      'INQUIRY_CREATED',
    );
  }
}
