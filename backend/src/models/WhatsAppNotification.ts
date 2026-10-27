import mongoose, { Schema, Document } from 'mongoose';

/**
 * One row per (logical notification, recipient). The unique dedupeKey makes the
 * WhatsApp admin alert idempotent across outbox retries, duplicate order events
 * and process restarts. Status advances with the provider's webhooks.
 *
 * Status meaning (strongest evidence first):
 *   read / delivered  — reported by Meta's status webhook
 *   sent              — Meta reports the message left its servers
 *   accepted          — the API accepted the request (NOT proof of delivery)
 *   failed            — rejected by the API or reported failed by webhook
 *   pending           — created, not yet attempted (or attempt in progress)
 */
export type WhatsAppNotificationStatus =
  | 'pending'
  | 'accepted'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export interface IWhatsAppNotification extends Document {
  dedupeKey: string;
  kind: string;
  orderId?: string;
  recipientHash: string;
  recipientLast4: string;
  template: string;
  status: WhatsAppNotificationStatus;
  providerMessageId?: string;
  attempts: number;
  lastError?: string;
  statusUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppNotificationSchema: Schema = new Schema(
  {
    dedupeKey: { type: String, required: true, unique: true },
    kind: { type: String, required: true },
    orderId: { type: String, index: true },
    recipientHash: { type: String, required: true },
    recipientLast4: { type: String, required: true },
    template: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending',
      index: true,
    },
    providerMessageId: { type: String, index: true, sparse: true },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
    statusUpdatedAt: { type: Date },
  },
  { timestamps: true },
);

const WhatsAppNotification = mongoose.model<IWhatsAppNotification>(
  'WhatsAppNotification',
  WhatsAppNotificationSchema,
  'whatsappnotifications',
);
export default WhatsAppNotification;
