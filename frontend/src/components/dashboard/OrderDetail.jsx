import { BellRing, PackageCheck, Star, ChevronLeft } from 'lucide-react';
import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
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

  const itemsList = order.items && order.items.length > 0 ? order.items : item ? [item] : [];

  return (
    <div className="space-y-3.5 text-left font-sans">
      {/* Main Order Overview Card */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-5 shadow-sm">
        {/* Header Row */}
        <div className="pb-3 mb-3 border-b border-neutral-200 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedOrderId(null)}
              className="inline-flex items-center gap-1 text-[11.5px] font-bold text-neutral-700 hover:text-neutral-950 transition-colors cursor-pointer bg-neutral-100 hover:bg-neutral-200/80 px-2.5 py-1 rounded-md"
            >
              <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-1.5 text-neutral-800">
              <PackageCheck className="w-4 h-4" strokeWidth={2} />
              <span className="text-[13px] font-semibold text-neutral-900 tracking-normal">
                Order Overview
              </span>
            </div>
          </div>
          <span
            onClick={() => {
              const idStr = String(order._id || order.id || '');
              if (idStr) {
                navigator.clipboard?.writeText(idStr);
                toast.success('Order ID copied');
              }
            }}
            className="text-[10px] sm:text-[10.5px] font-mono text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
            title="Click to copy Order ID"
          >
            ID: {String(order._id || order.id || '')}
          </span>
        </div>

        {/* Ordered Items List Body */}
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
              '';
            const itemVariant = orderItem.variant || 'Default';
            const itemQty = orderItem.quantity || 1;
            const itemPrice =
              orderItem.price ||
              (typeof orderItem.productId === 'object' ? orderItem.productId?.price : 0) ||
              0;

            const weightOpt = orderItem.selectedOptions?.find(
              (opt) =>
                opt.groupName?.toLowerCase() === 'weight' ||
                opt.groupName?.toLowerCase().includes('weight') ||
                opt.groupName?.toLowerCase() === 'size',
            );
            const otherOptions = (orderItem.selectedOptions || []).filter(
              (opt) => opt !== weightOpt,
            );
            const rawWeight =
              weightOpt?.optionLabel ||
              orderItem.weight ||
              (typeof orderItem.productId === 'object' ? orderItem.productId?.weight : null);
            const titleHasWeight =
              rawWeight && itemTitle.toLowerCase().includes(String(rawWeight).toLowerCase());

            return (
              <div key={idx} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3 sm:gap-3.5">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-md bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0 shadow-2xs">
                    <OptimizedImage
                      src={itemImage}
                      alt={itemTitle}
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header: Title, Weight Badge, and Total Price (Full Width!) */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                        <h4 className="font-semibold text-neutral-900 text-[13.5px] sm:text-[14px] leading-tight">
                          {itemTitle}
                        </h4>
                        {rawWeight && !titleHasWeight && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10.5px] sm:text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 leading-none shrink-0 shadow-2xs">
                            {rawWeight}
                          </span>
                        )}
                      </div>
                      <div className="text-[13.5px] sm:text-[14px] font-bold text-[#8f7422] shrink-0">
                        ₹{(itemPrice * itemQty).toLocaleString('en-IN')}
                      </div>
                    </div>

                    {otherOptions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {otherOptions.map((opt, optIdx) => (
                          <span key={optIdx} className="text-[11px] text-neutral-500 font-normal">
                            <span className="text-neutral-400">{opt.groupName}:</span>{' '}
                            <span className="font-medium text-neutral-700">{opt.optionLabel}</span>
                            {opt.priceAdjustment > 0 && (
                              <span className="ml-0.5 text-[10px] text-neutral-400">
                                (+₹{opt.priceAdjustment})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta Row: Qty on Left & Rate & Review on Right (Leaves Title Uncluttered) */}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-neutral-100/80">
                      <p className="text-[11.5px] sm:text-[12px] text-neutral-500 font-normal">
                        {itemVariant && itemVariant.toLowerCase() !== 'default'
                          ? `Variant: ${itemVariant} • Qty: ${itemQty}`
                          : `Qty: ${itemQty}`}
                      </p>

                      {isDelivered && (
                        <button
                          type="button"
                          onClick={() => {
                            const pId =
                              orderItem.productId?._id ||
                              (typeof orderItem.productId === 'string'
                                ? orderItem.productId
                                : null) ||
                              (orderItem.productId && typeof orderItem.productId === 'object'
                                ? orderItem.productId.id
                                : null) ||
                              orderItem.id ||
                              orderItem._id;
                            setReviewingProduct({
                              productId: pId,
                              productTitle: itemTitle,
                              orderItems: itemsList,
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-amber-50/80 border border-amber-200 hover:border-amber-300 text-[11px] font-semibold text-neutral-800 hover:text-[#8f7422] transition-all shadow-2xs hover:shadow-xs active:scale-95 shrink-0 cursor-pointer"
                        >
                          <Star className="w-3 h-3 text-[#916a00] fill-[#916a00]" />
                          <span>Rate & Review</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
