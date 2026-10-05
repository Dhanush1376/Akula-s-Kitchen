import { ITransaction } from '../types/transaction';
import Order from '../models/Order';

import { IInvoiceLineItem } from '../models/Invoice';
import logger from '../config/logger';

export class TransactionToInvoiceMapper {
  /**
   * Generates or syncs the invoice for a given transaction.
   * Pulls line items and tax breakdown from the underlying domain record.
   */
  public static async syncInvoice(transaction: ITransaction) {
    try {
      let _lineItems: IInvoiceLineItem[] = [];
      let _subtotal = 0;
      let _tax = 0;
      let _discount = 0;
      let _shipping = 0;
      let _totalAmount = transaction.totalAmount;

      switch (transaction.domain) {
        case 'purchase': {
          const order = await Order.findById(transaction.referenceId);
          if (order) {
            _lineItems = order.items.map((item: any) => ({
              description: `${item.title} ${item.variant ? `(${item.variant})` : ''}`.trim(),
              quantity: item.quantity,
              unitPrice: item.price,
              total: item.price * item.quantity,
            }));
            _subtotal = order.subtotal || 0;
            _tax = 0; // Legacy order model didn't heavily separate tax, assuming 0 for now
            _discount = order.discount || 0;
            _shipping = order.shippingFee || 0;
            _totalAmount = order.total || transaction.totalAmount;
          }
          break;
        }
      }

      // const status = transaction.paymentStatus === 'COMPLETED' ? 'PAID' : 'ISSUED';

      // Obsolete: Standalone invoice document generation is replaced by
      // immutable invoice snapshots embedded directly in the Order document.
      // await InvoiceService.generateInvoiceForTransaction(
      //   transaction._id!.toString(),
      //   lineItems,
      //   subtotal,
      //   tax,
      //   discount,
      //   shipping,
      //   totalAmount,
      //   status,
      // );
    } catch (error) {
      logger.error(`Error mapping transaction to invoice: ${transaction._id}`, error);
    }
  }
}
