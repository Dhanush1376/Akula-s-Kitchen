import logger from '../config/logger';
import Order from '../models/Order';
import * as Sentry from '@sentry/node';

/**
 * MetricsService — Aggregates and reports business health metrics.
 * Designed to be run periodically via CRON and pushes metrics to Sentry/Logs.
 */
export class MetricsService {
  /**
   * Captures and reports key business metrics for the last hour.
   * Can be hooked into CloudWatch, Datadog, or Prometheus later.
   */
  static async reportHourlyMetrics() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Orders
      const newOrders = await Order.countDocuments({ createdAt: { $gte: oneHourAgo } });
      const failedOrders = await Order.countDocuments({
        createdAt: { $gte: oneHourAgo },
        paymentStatus: 'failed',
      });
      const orderFailureRate = newOrders > 0 ? (failedOrders / newOrders) * 100 : 0;

      // Refunds
      const RefundRecord = require('../models/RefundRecord').default;
      const newRefunds = await RefundRecord.countDocuments({ createdAt: { $gte: oneHourAgo } });
      const failedRefunds = await RefundRecord.countDocuments({
        createdAt: { $gte: oneHourAgo },
        status: 'failed',
      });
      const refundFailureRate = newRefunds > 0 ? (failedRefunds / newRefunds) * 100 : 0;

      // Notifications
      const NotificationLog = require('../models/NotificationLog').default;
      const totalNotifs = await NotificationLog.countDocuments({ createdAt: { $gte: oneHourAgo } });
      const failedNotifs = await NotificationLog.countDocuments({
        createdAt: { $gte: oneHourAgo },
        status: 'failed',
      });
      const notifFailureRate = totalNotifs > 0 ? (failedNotifs / totalNotifs) * 100 : 0;

      // Inventory Reservations
      const InventoryReservation = require('../models/InventoryReservation').default;
      const confirmedReservations = await InventoryReservation.countDocuments({
        createdAt: { $gte: oneHourAgo },
        status: 'confirmed',
      });
      const expiredReservations = await InventoryReservation.countDocuments({
        createdAt: { $gte: oneHourAgo },
        status: 'expired',
      });
      const totalReservations = confirmedReservations + expiredReservations;
      const reservationHitRate =
        totalReservations > 0 ? (confirmedReservations / totalReservations) * 100 : 0;

      // Outbox Backlog & Age
      const OutboxEvent = require('../models/OutboxEvent').default;
      const pendingOutbox = await OutboxEvent.countDocuments({
        status: { $in: ['PENDING', 'FAILED'] },
      });
      const oldestOutboxEvent = await OutboxEvent.findOne({
        status: { $in: ['PENDING', 'FAILED'] },
      })
        .sort({ createdAt: 1 })
        .select('createdAt');
      const oldestOutboxAgeMinutes = oldestOutboxEvent
        ? Math.round((Date.now() - oldestOutboxEvent.createdAt.getTime()) / 60000)
        : 0;

      // Webhook Latency (approximated by updatedAt - createdAt for processed events)
      const PaymentWebhookEvent = require('../models/PaymentWebhookEvent').default;
      const processedWebhooks = await PaymentWebhookEvent.find({
        createdAt: { $gte: oneHourAgo },
        status: 'processed',
      }).select('createdAt updatedAt');

      let avgWebhookLatencyMs = 0;
      if (processedWebhooks.length > 0) {
        const totalLatency = processedWebhooks.reduce(
          (acc: number, w: any) => acc + (w.updatedAt.getTime() - w.createdAt.getTime()),
          0,
        );
        avgWebhookLatencyMs = Math.round(totalLatency / processedWebhooks.length);
      }

      const metrics = {
        timestamp: new Date().toISOString(),
        business: { newOrders, newRefunds },
        failures: {
          failedOrders,
          failedRefunds,
          failedNotifs,
        },
        rates: {
          orderFailureRate,
          refundFailureRate,
          notifFailureRate,
          reservationHitRate,
        },
        operations: { pendingOutbox, oldestOutboxAgeMinutes, avgWebhookLatencyMs },
      };

      logger.info(`[METRICS] Hourly Report: ${JSON.stringify(metrics)}`);

      // Alerting Thresholds
      if (process.env.SENTRY_DSN) {
        if (orderFailureRate > 15) {
          Sentry.captureMessage(`High Payment Failure Rate Detected`, {
            level: 'warning',
            tags: { critical: 'metrics' },
            extra: metrics.rates,
          });
        }
        if (refundFailureRate > 5) {
          Sentry.captureMessage(`High Refund Failure Rate Detected`, {
            level: 'error',
            tags: { critical: 'metrics_refunds' },
            extra: metrics.rates,
          });
        }
        if (notifFailureRate > 10) {
          Sentry.captureMessage(`High Notification Failure Rate`, {
            level: 'warning',
            tags: { critical: 'metrics_notifications' },
            extra: { notifFailureRate },
          });
        }
        if (oldestOutboxAgeMinutes > 30) {
          Sentry.captureMessage(`Outbox Backlog Getting Stale (${oldestOutboxAgeMinutes} mins)`, {
            level: 'error',
            tags: { critical: 'metrics_outbox' },
            extra: { pendingOutbox, oldestOutboxAgeMinutes },
          });
        }
        if (avgWebhookLatencyMs > 5000) {
          Sentry.captureMessage(`High Webhook Processing Latency`, {
            level: 'warning',
            tags: { critical: 'metrics_webhooks' },
            extra: { avgWebhookLatencyMs },
          });
        }
      }

      return metrics;
    } catch (error) {
      logger.error('[METRICS] Failed to report hourly metrics:', error);
    }
  }
}
