import { motion } from 'framer-motion';
import { Clock, Truck, XCircle, ChevronRight, Star } from 'lucide-react';
import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { OptimizedImage } from '../ui';

export function OrderCard({ order, item, itemIdx, idx = 0 }) {
  const { setSelectedOrderId, setSelectedOrderItemIndex, setReviewingProduct } = useDashboard();

  if (!order) return null;

  const rawItems =
    Array.isArray(order.items) && order.items.length > 0 ? order.items : item ? [item] : [];
  const items = rawItems.length > 0 ? rawItems : [order];

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

  const orderIdShort = String(order._id || order.id || '')
    .slice(-8)
    .toUpperCase();

  const orderTotal = Number(order.total || order.totalAmount || 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, delay: idx * 0.02 }}
      className="bg-white border border-neutral-300 rounded-lg overflow-hidden shadow-xs hover:border-neutral-400 hover:shadow-sm transition-all text-left font-sans select-none"
    >
      {/* Top Header Row — Subtle Olive Green Shaded Strip */}
      <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-neutral-200 bg-[#283618]/[0.06] backdrop-blur-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <StatusIcon className="w-3.5 h-3.5 text-[#283618] shrink-0" strokeWidth={2.2} />
          <span className="text-[11.5px] font-bold text-[#283618] tracking-wide uppercase">
            {statusInfo.label}
          </span>
          <span className="text-neutral-300">•</span>
          <span className="text-[11px] text-neutral-600 font-medium">{orderDate}</span>
          {orderIdShort && (
            <>
              <span className="text-neutral-300 hidden sm:inline">•</span>
              <span className="text-[11px] text-neutral-600 font-mono hidden sm:inline">
                #{orderIdShort}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {items.length > 1 && (
            <span className="text-[10px] font-semibold text-[#283618] bg-[#283618]/10 border border-[#283618]/20 px-1.5 py-0.5 rounded">
              {items.length} items
            </span>
          )}
          {orderTotal > 0 && (
            <span className="text-[12.5px] font-bold text-neutral-950 font-mono">
              ₹{orderTotal.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>

      {/* Main Single-Row Item Area (Maintains 1 card size with stacked photos) */}
      <div
        onClick={() => {
          setSelectedOrderId(order._id || order.id);
          setSelectedOrderItemIndex(0);
        }}
        className="p-3 sm:p-3.5 flex gap-3.5 items-center cursor-pointer hover:bg-neutral-50/70 transition-colors group"
      >
        {/* Pictures stacked 1 by 1 */}
        <div className="flex items-center shrink-0 pr-1">
          {items.length > 1 ? (
            <div className="flex items-center -space-x-7 sm:-space-x-8">
              {items.slice(0, 3).map((orderItem, iIdx) => {
                const prodImage =
                  orderItem.imageSrc ||
                  (typeof orderItem.productId === 'object'
                    ? orderItem.productId?.imageSrc || orderItem.productId?.images?.[0]
                    : null) ||
                  '/MainLogo.png';
                const itemTitle =
                  orderItem.title ||
                  (typeof orderItem.productId === 'object' ? orderItem.productId?.title : null) ||
                  orderItem.name ||
                  'Item';

                return (
                  <div
                    key={iIdx}
                    className="w-13 h-13 sm:w-14 sm:h-14 rounded-lg bg-neutral-100 border-2 border-white ring-1 ring-neutral-200 shadow-xs overflow-hidden shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                    style={{ zIndex: 10 - iIdx }}
                    title={itemTitle}
                  >
                    <OptimizedImage
                      src={prodImage}
                      alt={itemTitle}
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover"
                    />
                  </div>
                );
              })}
              {items.length > 3 && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-900 text-white text-[10px] font-bold border-2 border-white shadow-xs flex items-center justify-center shrink-0 -ml-3 z-20">
                  +{items.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-md bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0">
              <OptimizedImage
                src={
                  items[0]?.imageSrc ||
                  (typeof items[0]?.productId === 'object'
                    ? items[0]?.productId?.imageSrc || items[0]?.productId?.images?.[0]
                    : null) ||
                  '/MainLogo.png'
                }
                alt={items[0]?.title || 'Delicacy'}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0 pr-1">
          <h4 className="font-semibold text-neutral-900 text-[13px] sm:text-[13.5px] truncate group-hover:text-black transition-colors leading-tight">
            {items.length > 1
              ? items
                  .map(
                    (i) =>
                      i.title ||
                      (typeof i.productId === 'object' ? i.productId?.title : null) ||
                      i.name ||
                      'Item',
                  )
                  .join(', ')
              : items[0]?.title ||
                (typeof items[0]?.productId === 'object' ? items[0]?.productId?.title : null) ||
                items[0]?.name ||
                'Delicacy'}
          </h4>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[13.5px] font-bold text-neutral-950 font-mono">
              ₹
              {(
                order.total ||
                items.reduce(
                  (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1),
                  0,
                )
              ).toLocaleString('en-IN')}
            </span>
            <span className="text-neutral-300">|</span>
            <span className="text-[11px] text-neutral-500 truncate">
              {items.length > 1
                ? `${items.length} items (${items.reduce((sum, i) => sum + (Number(i.quantity) || Number(i.qty) || 1), 0)} units)`
                : `${items[0]?.variant && items[0]?.variant !== 'Default' ? `${items[0].variant} · ` : ''}Qty ${items[0]?.quantity || 1}`}
            </span>
          </div>

          {items.length > 1 ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {items.map((i, idx) => {
                const name =
                  i.title ||
                  (typeof i.productId === 'object' ? i.productId?.title : null) ||
                  i.name ||
                  'Item';
                const variant = i.variant && i.variant !== 'Default' ? ` · ${i.variant}` : '';
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center text-[9.5px] font-medium px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700 border border-neutral-200/80 truncate max-w-[190px]"
                  >
                    {name}
                    {variant}
                  </span>
                );
              })}
            </div>
          ) : (
            items[0]?.selectedOptions &&
            items[0].selectedOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {items[0].selectedOptions.map((opt, optIdx) => (
                  <span key={optIdx} className="text-[10px] text-neutral-500 font-normal">
                    <span className="text-neutral-400">{opt.groupName}:</span>{' '}
                    <span className="font-medium text-neutral-700">{opt.optionLabel}</span>
                  </span>
                ))}
              </div>
            )
          )}
        </div>

        <div className="flex items-center text-neutral-400 group-hover:text-neutral-700 transition-colors shrink-0">
          <ChevronRight
            className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
            strokeWidth={1.8}
          />
        </div>
      </div>

      {/* Interactive Review Action Footer */}
      {statusLower === 'delivered' && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="px-3.5 py-2.5 bg-[#fdfbf6] border-t border-amber-100/60"
        >
          {items.length <= 1 ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                const singleItem = items[0];
                const pId =
                  singleItem?.productId?._id ||
                  (typeof singleItem?.productId === 'string' ? singleItem?.productId : null) ||
                  (singleItem?.productId && typeof singleItem.productId === 'object'
                    ? singleItem.productId.id
                    : null) ||
                  singleItem?.id ||
                  singleItem?._id;
                const pTitle =
                  singleItem?.title ||
                  (typeof singleItem?.productId === 'object'
                    ? singleItem?.productId?.title
                    : null) ||
                  singleItem?.name ||
                  'Delicacy Item';

                setReviewingProduct({
                  productId: pId,
                  productTitle: pTitle,
                  orderItems: items,
                });
              }}
              className="flex items-center justify-between cursor-pointer hover:opacity-85 transition-opacity"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Star className="w-3.5 h-3.5 text-[#916a00] fill-[#916a00] shrink-0" />
                <span className="text-[11px] font-medium text-neutral-700 truncate">
                  Rate & Review
                </span>
              </div>

              <div className="flex items-center gap-0.5 text-[#916a00] shrink-0">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-[#916a00] text-[#916a00]" />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Star className="w-3.5 h-3.5 text-[#916a00] fill-[#916a00] shrink-0" />
                  <span className="text-[11px] font-semibold text-neutral-800 truncate">
                    Rate & Review ({items.length} Products)
                  </span>
                </div>
                <span className="text-[9.5px] font-medium text-amber-800/80">Choose product</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {items.map((it, iIdx) => {
                  const itId =
                    it?.productId?._id ||
                    (typeof it?.productId === 'string' ? it?.productId : null) ||
                    (it?.productId && typeof it.productId === 'object' ? it.productId.id : null) ||
                    it?.id ||
                    it?._id;
                  const itTitle =
                    it?.title ||
                    (typeof it?.productId === 'object' ? it?.productId?.title : null) ||
                    it?.name ||
                    'Item';
                  const itImg =
                    it?.imageSrc ||
                    (typeof it?.productId === 'object'
                      ? it.productId?.imageSrc || it.productId?.images?.[0]
                      : null) ||
                    '/MainLogo.png';

                  return (
                    <button
                      key={iIdx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewingProduct({
                          productId: itId,
                          productTitle: itTitle,
                          orderItems: items,
                        });
                      }}
                      className="group/item inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-amber-200/90 shadow-2xs hover:border-amber-400 hover:bg-amber-50 active:scale-95 transition-all text-neutral-800 text-[11px] font-medium cursor-pointer"
                      title={`Rate & Review ${itTitle}`}
                    >
                      <img
                        src={itImg}
                        alt=""
                        className="w-3.5 h-3.5 rounded-full object-cover shrink-0 border border-neutral-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <span className="max-w-[120px] sm:max-w-[160px] truncate">{itTitle}</span>
                      <Star className="w-2.5 h-2.5 text-[#916a00] fill-[#916a00] shrink-0 group-hover/item:scale-110 transition-transform" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
