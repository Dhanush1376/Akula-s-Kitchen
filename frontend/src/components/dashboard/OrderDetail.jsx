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

  const getStatusBadge = () => {
    switch (status) {
      case 'delivered':
        return {
          icon: CheckCircle2,
          label: 'Delivered',
          classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'shipped':
      case 'out_for_delivery':
        return {
          icon: Truck,
          label: status === 'out_for_delivery' ? 'Out for Delivery' : 'Shipped',
          classes: 'bg-blue-50 text-blue-800 border-blue-200',
        };
      case 'cancelled':
        return {
          icon: XCircle,
          label: 'Cancelled',
          classes: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'confirmed':
        return {
          icon: CheckCircle2,
          label: 'Confirmed',
          classes: 'bg-[#283618]/10 text-[#283618] border-[#283618]/25',
        };
      case 'placed':
        return {
          icon: Clock,
          label: 'Placed',
          classes: 'bg-[#283618]/10 text-[#283618] border-[#283618]/25',
        };
      case 'processing':
        return {
          icon: Clock,
          label: 'Processing',
          classes: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      default:
        return {
          icon: Clock,
          label: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
          classes: 'bg-[#283618]/10 text-[#283618] border-[#283618]/25',
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
      <div className="bg-white border border-neutral-300 rounded-lg overflow-hidden shadow-xs">
        {/* Header Strip — Subtle shaded accent with persistent split layout */}
        <div className="px-4 py-3 sm:py-3.5 bg-[#283618]/[0.05] border-b border-neutral-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13.5px] sm:text-[14.5px] font-bold text-neutral-950 font-mono tracking-tight">
                #
                {String(order._id || order.id)
                  .slice(-8)
                  .toUpperCase()}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold tracking-wide uppercase border ${statusBadge.classes}`}
              >
                <StatusIcon className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                <span>{statusBadge.label}</span>
              </span>
            </div>
            <p className="text-[11.5px] text-neutral-500 mt-1 flex items-center gap-1.5 flex-wrap">
              <span>Placed on {orderDate}</span>
              {order.paymentMethod && (
                <>
                  <span className="text-neutral-300">•</span>
                  <span className="font-medium text-neutral-700">
                    Paid via {order.paymentMethod.toUpperCase()}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-neutral-500 block">
              Total Amount
            </span>
            <span className="text-[15.5px] sm:text-[17px] font-bold text-neutral-950 font-mono leading-tight block">
              ₹{(order.total || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Ordered Items List Body */}
        <div className="p-4 sm:p-5">
          <h3 className="text-[12px] sm:text-[12.5px] font-bold uppercase tracking-wider text-neutral-700 pb-2.5 mb-2 border-b border-neutral-200">
            Items Ordered ({itemsList.length})
          </h3>

          <div className="divide-y divide-neutral-200">
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
                <div key={idx} className="py-3 first:pt-1 last:pb-0 flex items-center gap-3">
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
                    {orderItem.selectedOptions && orderItem.selectedOptions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {orderItem.selectedOptions.map((opt, optIdx) => (
                          <span
                            key={optIdx}
                            className="inline-flex items-center text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/70"
                          >
                            <span className="opacity-75 mr-1">{opt.groupName}:</span>
                            <span className="font-bold">{opt.optionLabel}</span>
                            {opt.priceAdjustment > 0 && (
                              <span className="ml-1 text-[9.5px] text-amber-700 font-semibold">
                                (+₹{opt.priceAdjustment})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {itemVariant && itemVariant !== 'Default' ? `Pack: ${itemVariant} • ` : ''}
                      Qty: {itemQty}
                    </p>
                    <div className="text-[12.5px] font-bold text-neutral-950 mt-0.5">
                      ₹{(itemPrice * itemQty).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Review Button for Delivered item */}
                  {isDelivered && (
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
