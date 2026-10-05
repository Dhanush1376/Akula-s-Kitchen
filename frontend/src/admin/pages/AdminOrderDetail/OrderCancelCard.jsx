import React, { useState } from 'react';
import toast from 'react-hot-toast';

export function OrderCancelCard({ order, updateOrderStatus }) {
  const [cancelling, setCancelling] = useState(false);
  const status = (order?.status || order?.orderStatus || '').toLowerCase();
  const isCancelled = status === 'cancelled';
  const isDelivered = status === 'delivered';

  if (isCancelled || isDelivered) return null;

  const handleCancel = async () => {
    if (
      !window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')
    ) {
      return;
    }
    setCancelling(true);
    try {
      await updateOrderStatus(order._id || order.id, 'cancelled');
      toast.success('Order cancelled successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="admin-card p-5 border border-red-500/20 bg-red-500/5 rounded-xl">
      <h3 className="text-sm font-bold text-red-700 dark:text-red-400 mb-2">Cancel Order</h3>
      <p className="text-xs text-[var(--admin-text-secondary)] mb-4 leading-relaxed">
        Cancelling this order will stop processing and notify the customer.
      </p>
      <button
        onClick={handleCancel}
        disabled={cancelling}
        className="w-full py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors disabled:opacity-50 cursor-pointer"
      >
        {cancelling ? 'Cancelling...' : 'Cancel Order'}
      </button>
    </div>
  );
}
