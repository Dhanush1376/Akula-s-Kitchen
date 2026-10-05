import { motion } from 'framer-motion';
import { Clock, Truck, XCircle, ChevronRight, Star } from 'lucide-react';
import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { OptimizedImage } from '../ui';

export function OrderCard({ order, item, itemIdx, idx }) {
  const { setSelectedOrderId, setSelectedOrderItemIndex, setReviewingProduct } = useDashboard();

  const isRental =
    order.isRental === true || order.orderType === 'rental' || item.type === 'rental';

  const prodTitle =
    item.title || (typeof item.productId === 'object' ? item.productId?.title : null) || 'Item';

  const prodVariant = item.variant || 'Default';
  const prodPrice =
    item.price || (typeof item.productId === 'object' ? item.productId?.price : 0) || 0;
  const prodImage =
    item.imageSrc ||
    (typeof item.productId === 'object'
      ? item.productId?.imageSrc || item.productId?.images?.[0]
      : null) ||
    '/MainLogo.png';

  const statusLower = (order.orderStatus || order.status || 'confirmed').toLowerCase();

  const getStatusInfo = () => {
    switch (statusLower) {
      case 'delivered':
        return {
          icon: Truck,
          label: 'DELIVERED',
        };
      case 'settled':
      case 'completed':
        return {
          icon: Clock,
          label: 'SETTLED',
        };
      case 'shipped':
      case 'out_for_delivery':
        return {
          icon: Truck,
          label: statusLower === 'out_for_delivery' ? 'OUT FOR DELIVERY' : 'SHIPPED',
        };
      case 'cancelled':
        return {
          icon: XCircle,
          label: 'CANCELLED',
        };
      default:
        return {
          icon: Clock,
          label: statusLower.toUpperCase().replace('_', ' '),
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const orderDate = new Date(order.createdAt || order.orderDate || Date.now()).toLocaleDateString(
    'en-GB',
    { day: 'numeric', month: 'short' },
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, delay: idx * 0.02 }}
      className="bg-white border border-neutral-200/90 rounded-xl overflow-hidden shadow-2xs hover:shadow-xs transition-all text-left font-sans select-none"
    >
      {/* Top Header Row — Clean Off-White Neutral */}
      <div className="px-3.5 py-2 flex items-center justify-between border-b border-neutral-100 bg-[#f9f9f9]">
        <div className="flex items-center gap-1.5 min-w-0">
          <StatusIcon className="w-3.5 h-3.5 text-neutral-700 shrink-0" strokeWidth={2.2} />
          <span className="text-[11.5px] font-bold text-neutral-900 tracking-wide uppercase">
            {statusInfo.label}
          </span>
          <span className="text-neutral-300">•</span>
          <span className="text-[11px] text-neutral-500 font-medium">{orderDate}</span>
        </div>

        {/* Small subtle purchase badge */}
        <span className="text-[9.5px] font-bold tracking-wider uppercase text-neutral-600 bg-white px-2 py-0.5 rounded-md border border-neutral-200/70 shadow-2xs">
          {isRental ? 'Rental' : 'Purchase'}
        </span>
      </div>

      {/* Main Item Row — Compact & Clean */}
      <div
        onClick={() => {
          setSelectedOrderId(order._id || order.id);
          setSelectedOrderItemIndex(itemIdx);
        }}
        className="p-3 sm:p-3.5 flex gap-3 items-center cursor-pointer hover:bg-neutral-50/70 transition-colors group"
      >
        <OptimizedImage
          src={prodImage}
          alt={prodTitle}
          containerClassName="w-13 h-13 sm:w-14 sm:h-14 rounded-md bg-neutral-100 border border-neutral-200/70 shrink-0 overflow-hidden"
          className="w-full h-full object-cover"
        />

        <div className="flex-1 min-w-0 pr-1">
          <h4 className="font-semibold text-neutral-900 text-[13px] sm:text-[13.5px] truncate group-hover:text-black transition-colors leading-tight">
            {prodTitle}
          </h4>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[13.5px] font-bold text-neutral-950">
              ₹{prodPrice.toLocaleString('en-IN')}
            </span>
            {item.originalPrice && item.originalPrice > prodPrice && (
              <span className="text-[10.5px] text-neutral-400 line-through">
                ₹{item.originalPrice.toLocaleString('en-IN')}
              </span>
            )}
            <span className="text-neutral-300">|</span>
            <span className="text-[11px] text-neutral-500 truncate">
              {prodVariant && prodVariant !== 'Default' ? `${prodVariant} · ` : ''}Qty{' '}
              {item.quantity || 1}
            </span>
          </div>
        </div>

        <div className="flex items-center text-neutral-400 group-hover:text-neutral-700 transition-colors shrink-0">
          <ChevronRight
            className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
            strokeWidth={1.8}
          />
        </div>
      </div>

      {/* Interactive Review Action Footer */}
      {!isRental && statusLower === 'delivered' && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setReviewingProduct({
              productId: item.productId?._id || item.productId,
              productTitle: prodTitle,
            });
          }}
          className="px-3.5 py-1.5 bg-[#fdfbf6] border-t border-amber-100/60 flex items-center justify-between cursor-pointer hover:bg-[#faf4e6] transition-colors"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Star className="w-3 h-3 text-[#916a00] fill-[#916a00] shrink-0" />
            <span className="text-[11px] font-medium text-neutral-700 truncate">Rate & Review</span>
          </div>

          <div className="flex items-center gap-0.5 text-[#916a00] shrink-0">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-[#916a00] text-[#916a00]" />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
