import { BellRing, CheckCircle2, Clock, Truck, XCircle } from 'lucide-react';
import React, { useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { OptimizedImage } from '../ui/OptimizedImage';
import { useRazorpay } from '../../hooks/useRazorpay';
import { useUserSocket } from '../../context/UserSocketProvider';
import {
  OrderDeliveryAddressCard,
  OrderPricingSummaryCard,
  OrderJourneyTracker,
} from '../../features/orders/components';

export function OrderDetail() {
  const {
    selectedOrder: order,
    selectedItem: item,
    setSelectedOrderId,
    isPriceDetailsOpen,
    setIsPriceDetailsOpen,
    downloadInvoice,
    setReviewingProduct,
    user,
  } = useDashboard();

  const { resumePayment } = useRazorpay();
  const [isResuming, setIsResuming] = React.useState(false);
  const activeStepRef = React.useRef(null);
  const _socket = useUserSocket();

  useEffect(() => {
    if (!order?.statusHistory?.length) return;

    // Update local storage to mark this order as viewed
    const initialViews = JSON.parse(localStorage.getItem('akula_order_views') || '{}');
    initialViews[order._id || order.id] = Date.now();
    localStorage.setItem('akula_order_views', JSON.stringify(initialViews));
    window.dispatchEvent(new Event('akula_order_views_updated'));
  }, [order]);

  if (!order) return null;

  const status = (order.orderStatus || order.status || 'Confirmed').toLowerCase();

  const isDelivered = ['delivered', 'returned', 'refunded', 'settled'].includes(status);
  const isCancelled = status === 'cancelled';
  const isRefunded =
    status === 'refunded' ||
    order.paymentStatus === 'refunded' ||
    order.refundStatus === 'refunded' ||
    status === 'settled';

  const isRental = order.orderType === 'rental' || order.isRental === true;

  const getStatusBadge = () => {
    switch (status) {
      case 'delivered':
        return {
          icon: CheckCircle2,
          label: 'Delivered',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'shipped':
      case 'out_for_delivery':
        return {
          icon: Truck,
          label: status === 'out_for_delivery' ? 'Out for Delivery' : 'Shipped',
          classes: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'cancelled':
        return {
          icon: XCircle,
          label: 'Cancelled',
          classes: 'bg-red-50 text-red-700 border-red-200',
        };
      default:
        return {
          icon: Clock,
          label: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
          classes: 'bg-amber-50 text-amber-800 border-amber-200',
        };
    }
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  const orderDate = new Date(order.createdAt || order.orderDate || Date.now()).toLocaleDateString(
    'en-IN',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );

  const itemsList = order.items && order.items.length > 0 ? order.items : item ? [item] : [];

  return (
    <div className="space-y-3.5 text-left font-sans">
      {/* Main Order Overview Card */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-5 shadow-sm space-y-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] sm:text-[14px] font-bold text-neutral-950 font-mono">
                #
                {String(order._id || order.id)
                  .slice(-8)
                  .toUpperCase()}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold border ${statusBadge.classes}`}
              >
                <StatusIcon className="w-3 h-3" />
                <span>{statusBadge.label}</span>
              </span>
            </div>
            <p className="text-[11.5px] text-neutral-500 mt-0.5">
              Placed on {orderDate}
              {order.paymentMethod && <span> • Paid via {order.paymentMethod.toUpperCase()}</span>}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10.5px] text-neutral-500 block">Total Amount</span>
            <span className="text-[15px] sm:text-[16px] font-bold text-neutral-950">
              ₹{(order.total || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Ordered Items List */}
        <div>
          <h3 className="text-[12.5px] font-semibold text-neutral-800 mb-2.5">
            Items Ordered ({itemsList.length})
          </h3>

          <div className="divide-y divide-neutral-100">
            {itemsList.map((orderItem, idx) => {
              const itemTitle =
                orderItem.title ||
                (typeof orderItem.productId === 'object' ? orderItem.productId?.title : null) ||
                'Delicacy Item';
              const itemImage =
                orderItem.imageSrc ||
                (typeof orderItem.productId === 'object'
                  ? orderItem.productId?.imageSrc || orderItem.productId?.images?.[0]
                  : null) ||
                '/MainLogo.png';
              const itemVariant = orderItem.variant || 'Default';
              const itemQty = orderItem.quantity || 1;
              const itemPrice =
                orderItem.price ||
                (typeof orderItem.productId === 'object' ? orderItem.productId?.price : 0) ||
                0;

              return (
                <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-md bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0">
                    <OptimizedImage
                      src={itemImage}
                      alt={itemTitle}
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-neutral-900 text-[13px] truncate leading-tight">
                      {itemTitle}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {itemVariant && itemVariant !== 'Default' ? `Pack: ${itemVariant} • ` : ''}
                      Qty: {itemQty}
                    </p>
                    <div className="text-[12.5px] font-bold text-neutral-950 mt-0.5">
                      ₹{(itemPrice * itemQty).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Review Button for Delivered item */}
                  {isDelivered && !isRental && (
                    <button
                      type="button"
                      onClick={() =>
                        setReviewingProduct({
                          productId: orderItem.productId?._id || orderItem.productId,
                          productTitle: itemTitle,
                        })
                      }
                      className="px-3 py-1.5 rounded-md border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-[11px] font-semibold text-neutral-700 transition-colors shrink-0 cursor-pointer"
                    >
                      Rate & Review
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dynamic Timeline Tracker */}
      <OrderJourneyTracker
        order={order}
        status={status}
        isDelivered={isDelivered}
        isCancelled={isCancelled}
        isRefunded={isRefunded}
        activeStepRef={activeStepRef}
      />

      {/* Delivery Address & GPS Location Card */}
      <OrderDeliveryAddressCard shippingAddress={order.shippingAddress} />

      {/* Pricing Breakdown & Invoice Card */}
      <OrderPricingSummaryCard
        order={order}
        item={item}
        isPriceDetailsOpen={isPriceDetailsOpen}
        setIsPriceDetailsOpen={setIsPriceDetailsOpen}
        isResuming={isResuming}
        setIsResuming={setIsResuming}
        resumePayment={resumePayment}
        downloadInvoice={downloadInvoice}
      />

      {/* Dispatch Note Footer */}
      <div className="flex items-center gap-2 p-3 bg-neutral-50/80 border border-neutral-200 rounded-lg text-[11px] text-neutral-500">
        <BellRing className="w-3.5 h-3.5 text-neutral-600 shrink-0" strokeWidth={1.8} />
        <span>
          Real-time delivery updates are sent automatically to{' '}
          <strong className="text-neutral-800 font-semibold">{user?.phone || user?.email}</strong>.
        </span>
      </div>
    </div>
  );
}
