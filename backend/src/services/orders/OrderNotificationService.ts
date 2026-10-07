import { emailQueue, notificationQueue } from '../../jobs/queues';
import logger from '../../config/logger';
import {
  resolveEmailImageUrl,
  getPublicOrderTrackingUrl,
  getPublicWebsiteUrl,
  resolveOrderGrandTotal,
} from '../../utils/email/emailUrlUtils';

export class OrderNotificationService {
  /**
   * Enqueues the PDF generation and Email dispatch for a successful order.
   */
  static async dispatchOrderConfirmation(order: any, user: any, adminEmails: string[]) {
    try {
      const publicBaseUrl = getPublicWebsiteUrl();
      const grandTotal = resolveOrderGrandTotal(order);
      const trackingUrl = getPublicOrderTrackingUrl(order);

      const itemTitle =
        order.items && order.items.length > 0
          ? order.items[0].title || order.items[0].name || order.items[0].productTitle || 'Product'
          : 'Order';
      const moreCount =
        order.items && order.items.length > 1 ? ` (+${order.items.length - 1} more)` : '';
      const productName = `${itemTitle}${moreCount}`;
      const customerName =
        user?.name ||
        (typeof order.shippingAddress === 'object' ? order.shippingAddress.name : '') ||
        'A customer';
      const displayInvoice =
        order.invoice?.number ||
        order.invoiceNumber ||
        (order._id ? `INV-${String(order._id).slice(-8).toUpperCase()}` : 'Confirmed');

      // Base context for templates
      const context = {
        customerName:
          user?.name ||
          (typeof order.shippingAddress === 'object' ? order.shippingAddress.name : '') ||
          'Customer',
        customerEmail: user?.email,
        customerPhone:
          user?.phone ||
          (typeof order.shippingAddress === 'object' ? order.shippingAddress.phone : ''),
        orderId: displayInvoice,
        rawOrderId: (order._id || '').toString(),
        orderDate: order.createdAt || new Date().toISOString(),
        paymentMethod:
          order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment (Razorpay)',
        items: (order.items || []).map((i: any) => ({
          name: i.title || i.name || 'Item',
          variant: i.variant,
          quantity: i.quantity || 1,
          price: i.price || 0,
          image: resolveEmailImageUrl(i.imageSrc || i.image || i.imageUrl),
        })),
        subtotal: order.subtotal || 0,
        shipping: order.shippingFee || order.courierCharges || 0,
        total: grandTotal,
        grandTotal: grandTotal,
        shippingAddress: order.shippingAddress,
        trackingUrl,
        dashboardUrl: `${publicBaseUrl}/dashboard/orders`,
        websiteUrl: publicBaseUrl,
        currentYear: new Date().getFullYear(),
        invoiceNumber: displayInvoice,
        store: order.store,
        tax: order.tax,
        invoice: order.invoice,
        trackingNumber: order.trackingNumber,
      };

      // Dispatch to customer (only if they have an email)
      if (user?.email) {
        await emailQueue.add('orderConfirmationEmail', {
          to: user.email,
          subject: `Order Confirmed: ${productName} (${displayInvoice})`,
          template: 'order-confirmation',
          context,
        });
      }

      const adminSubject = `[New Order] ${productName} placed by ${customerName} (₹${grandTotal})`;

      // Dispatch to admins
      if (adminEmails && adminEmails.length > 0) {
        await emailQueue.add('adminOrderAlertEmail', {
          to: adminEmails[0],
          subject: adminSubject,
          template: 'order-confirmation',
          context,
        });
      }

      // Admin UI Notification
      await notificationQueue.add('adminNotification', {
        title: adminSubject,
        message: `${user?.name || 'A customer'} placed a new order (₹${grandTotal}).`,
        type: 'order',
        actionLink: `/admin/orders/${order._id}`,
        metadata: {
          image:
            order.items && order.items.length > 0
              ? resolveEmailImageUrl(
                  order.items[0].imageSrc || order.items[0].image || order.items[0].imageUrl,
                )
              : null,
          grandTotal,
        },
      });
    } catch (err) {
      logger.error('Failed to enqueue order confirmation notifications:', err);
    }
  }

  /**
   * Enqueues an email for failed payments or cancelled orders.
   */
  static async dispatchOrderFailure(order: any, user: any, reason: string) {
    try {
      if (!user.email) {
        logger.info(`[ORDER NOTIFICATION] Skipping failure email — user ${user._id} has no email`);
        return;
      }
      const grandTotal = resolveOrderGrandTotal(order);
      await emailQueue.add('orderFailureEmail', {
        to: user.email,
        subject: `Payment Failed for Order #${order._id}`,
        template: 'order-failed',
        context: {
          customerName: user.name,
          orderId: order._id.toString(),
          reason,
          total: grandTotal,
          grandTotal,
        },
      });
    } catch (err) {
      logger.error('Failed to enqueue order failure notifications:', err);
    }
  }
}
