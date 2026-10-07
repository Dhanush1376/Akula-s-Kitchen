import {
  Lock,
  CheckCircle2,
  BadgeCheck,
  MapPin,
  Calendar,
  GitCommit,
  Receipt,
  ShoppingBag,
  ShieldCheck,
  History,
  Clock,
  ArrowRight,
  Ban,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/seo/SEO';
import { InvoiceModal, OrderSuccessSkeleton, OptimizedImage } from '../components/ui';
import { useState, useEffect } from 'react';
import { handleImageError } from '../utils/media/imageUtils';
import { orderService } from '../services/domainServices';
import logger from '../utils/core/logger';
import { useConfig } from '../context/ConfigContext';

const _BarcodeSVG = ({ _val }) => (
  <svg viewBox="0 0 200 40" className="w-full h-9" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="40" fill="#fff" />
    <path
      d="M 10 0 L 10 40 M 13 0 L 13 40 M 15 0 L 15 40 M 18 0 L 18 40 M 22 0 L 22 40 M 26 0 L 26 40 M 30 0 L 30 40 M 34 0 L 34 40 M 36 0 L 36 40 M 40 0 L 40 40 M 44 0 L 44 40 M 48 0 L 48 40 M 52 0 L 52 40 M 55 0 L 55 40 M 58 0 L 58 40 M 62 0 L 62 40 M 65 0 L 65 40 M 68 0 L 68 40 M 72 0 L 72 40 M 76 0 L 76 40 M 80 0 L 80 40 M 84 0 L 84 40 M 88 0 L 88 40 M 90 0 L 90 40 M 94 0 L 94 40 M 98 0 L 98 40 M 102 0 L 102 40 M 105 0 L 105 40 M 108 0 L 108 40 M 112 0 L 112 40 M 116 0 L 116 40 M 120 0 L 120 40 M 122 0 L 122 40 M 126 0 L 126 40 M 130 0 L 130 40 M 134 0 L 134 40 M 138 0 L 138 40 M 142 0 L 142 40 M 144 0 L 144 40 M 148 0 L 148 40 M 152 0 L 152 40 M 155 0 L 155 40 M 158 0 L 158 40 M 162 0 L 162 40 M 166 0 L 166 40 M 170 0 L 170 40 M 174 0 L 174 40 M 178 0 L 178 40 M 182 0 L 182 40 M 186 0 L 186 40 M 190 0 L 190 40"
      stroke="#000"
      strokeWidth="2"
    />
  </svg>
);

const safeFormatNumber = (val) => {
  if (val === undefined || val === null) return '0';
  const num = Number(val);
  return isNaN(num) ? '0' : num.toLocaleString('en-IN');
};

const safeFormatDate = (val, options) => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(
    'en-IN',
    options || {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  );
};

const mapOrderData = (rawOrder) => {
  if (!rawOrder) return null;

  const est = rawOrder.createdAt ? new Date(rawOrder.createdAt) : new Date();
  if (!isNaN(est.getTime())) {
    est.setDate(est.getDate() + 7);
  }
  const defaultDeliveryEstimate = !isNaN(est.getTime())
    ? est.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';

  const items = Array.isArray(rawOrder.items)
    ? rawOrder.items.map((item) => ({
        ...item,
        id: item.productId || item.id || item._id,
        deliveryEstimate: item.deliveryEstimate || defaultDeliveryEstimate,
        price: item.price ?? 0,
        quantity: item.quantity ?? item.qty ?? 1,
        title: item.title || item.name || '',
        variant: item.variant || 'Default',
        imageSrc: item.imageSrc || item.image || '',
      }))
    : [];

  const orderRef = rawOrder.orderId || rawOrder._id || rawOrder.id;
  const trackingToken = rawOrder.publicTrackingToken;
  const trackingPath = trackingToken
    ? `/track/${orderRef}?token=${encodeURIComponent(trackingToken)}`
    : `/track/${orderRef}`;

  const rawPaymentMethod = (rawOrder.paymentMethod || '').toLowerCase();
  const paymentMode =
    rawPaymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Razorpay Secure Online';

  const addr = rawOrder.shippingAddress || rawOrder.deliveryAddress || {};
  const deliveryAddress = {
    name: addr.name || rawOrder.customer || 'Customer',
    phone: addr.phone || rawOrder.phone || '',
    addressString: addr.address || addr.addressString || '',
    locality: addr.locality || '',
    city: addr.city || '',
    state: addr.state || '',
    pincode: addr.pincode || '',
    email: addr.email || rawOrder.email || '',
  };

  const itemsSubtotal = items.reduce(
    (acc, i) => acc + (Number(i.price) || 0) * (Number(i.quantity) || 1),
    0,
  );
  const subtotal = rawOrder.subtotal ?? itemsSubtotal;
  const shippingFee = rawOrder.shippingFee ?? rawOrder.deliveryCharge ?? 0;
  const tax = 0;
  const discount = rawOrder.discount ?? 0;
  const codFee = rawOrder.codFee ?? 0;
  const totalAmount =
    rawOrder.totalAmount ?? rawOrder.total ?? subtotal + shippingFee + codFee - discount;

  return {
    ...rawOrder,
    _id: orderRef,
    orderId: rawOrder.orderId || orderRef,
    trackingPath,
    trackingToken,
    date: safeFormatDate(rawOrder.createdAt || rawOrder.date),
    totalAmount,
    subtotal,
    shippingFee,
    deliveryCharge: shippingFee,
    discount,
    codFee,
    tax,
    paymentMode,
    paymentStatus: rawOrder.paymentStatus || 'paid',
    needByDate: rawOrder.needByDate ? safeFormatDate(rawOrder.needByDate) : undefined,
    deliveryAddress,
    shippingAddress: deliveryAddress,
    items,
  };
};

export function OrderSuccess() {
  const { storeName } = useConfig();
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const urlOrderId = searchParams.get('id');
  const stateOrder = location.state?.orderDetails?.order || location.state?.orderDetails;
  const orderId = stateOrder?._id || stateOrder?.id || urlOrderId;

  const [order, setOrder] = useState(() => mapOrderData(stateOrder));
  const [loading, setLoading] = useState(!stateOrder && !!orderId);
  const [error, setError] = useState('');
  const [showStickerModal, setShowStickerModal] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const confettiKey = `confetti_fired_${orderId}`;
    if (sessionStorage.getItem(confettiKey)) {
      return; // Already fired for this order in this session
    }
    sessionStorage.setItem(confettiKey, 'true');

    // Premium Celebration Blast
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 10000,
      colors: ['var(--color-gold-dark)', '#f7bb0e', '#fef3cc', '#ffffff'],
    };

    import('canvas-confetti').then(({ default: confetti }) => {
      function fire(particleRatio, opts) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      }

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    });
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      if (!order) {
        const timer = setTimeout(() => {
          setError('No valid Order ID has been associated with this payment transaction.');
          setLoading(false);
        }, 0);
        return () => clearTimeout(timer);
      }
      return;
    }

    const fetchOrder = async () => {
      try {
        if (!order) {
          setLoading(true);
        }

        let foundData = null;
        try {
          const res = await orderService.getById(orderId);
          if (res.success && res.data) {
            foundData = res.data;
          }
        } catch (err) {
          logger.error('Error fetching order details:', err);
          throw err;
        }

        if (foundData) {
          setOrder(mapOrderData(foundData));
          setError('');
        } else {
          if (!order) {
            setError('Order not found or authorization failed.');
          }
        }
      } catch (err) {
        logger.error('Error fetching order details:', err);
        if (!order) {
          setError(
            err.response?.data?.message ||
              'Access denied. This order belongs to another user account.',
          );
        }
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchOrder();
    }, 0);
    return () => clearTimeout(timer);
  }, [orderId, order]);

  if (loading) {
    return <OrderSuccessSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-surface-container-low flex flex-col items-center justify-center pt-12 pb-32 px-4">
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-8 max-w-md w-full text-center shadow-xs">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-[28px]" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-bold text-on-surface mb-2">Access Restrained</h2>
          <p className="text-xs text-secondary leading-relaxed mb-6">
            {error || 'Could not retrieve order details.'}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-[#283618] hover:bg-[#1f2b13] text-white font-extrabold text-xs uppercase tracking-wider h-11 pl-5 pr-1.5 py-1 rounded-full transition-all flex items-center justify-between group cursor-pointer border border-[#283618] shadow-sm active:scale-[0.98]"
          >
            <span>Track Active Orders</span>
            <span className="w-8 h-8 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
              <ArrowRight
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                strokeWidth={2.5}
              />
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-surface-container-low min-h-screen relative pt-12 pb-32 font-body selection:bg-primary/20"
    >
      <SEO title="Order Success" noindex />

      {/* CSS Stylesheet Inject for Clean Receipt Printing */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #invoice-print-area, #invoice-print-area * {
              visibility: visible;
            }
            #invoice-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
              color: black;
              font-family: sans-serif;
              display: block !important;
            }
          }
        `}
      </style>

      {/* Progress Header Strip */}
      <div className="bg-surface-bright border-b border-outline-variant/40 py-4 px-4 mb-8 -mt-12 print:hidden">
        <div className="max-w-xl mx-auto flex items-center justify-between text-[11px] font-bold tracking-wider text-green-700 uppercase">
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="w-5 h-5 rounded-full bg-green-700 text-white flex items-center justify-center text-[10px]">
              ✓
            </span>
            <span>BAG</span>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-green-700/30 mx-3" />
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="w-5 h-5 rounded-full bg-green-700 text-white flex items-center justify-center text-[10px]">
              ✓
            </span>
            <span>ADDRESS</span>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-green-700/30 mx-3" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-green-700 text-white flex items-center justify-center text-[10px]">
              ✓
            </span>
            <span>SUCCESS</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10 print:hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Success Details (Main Content) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {/* Success Celebration Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-surface-bright border border-outline-variant/40 rounded-lg p-8 lg:p-12 text-center shadow-xs overflow-hidden relative"
            >
              <div className="w-20 h-20 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-6 border border-green-100">
                <CheckCircle2 className="text-[32px]" strokeWidth={1.5} />
              </div>

              <h2 className="font-display text-2xl lg:text-3xl text-on-surface font-bold mb-3">
                Order Confirmed!
              </h2>
              <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed mb-8">
                Your order has been placed. We&apos;ve sent the order details to your registered
                number and email address.
              </p>

              <div className="w-full max-w-lg mx-auto bg-surface-container-low/40 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-4 text-left border border-outline-variant/20">
                <div className="space-y-0.5 min-w-0">
                  <span
                    className="text-[10px] uppercase font-bold text-secondary tracking-wider block"
                    style={{ fontFamily: 'var(--font-label)' }}
                  >
                    Order ID
                  </span>
                  <strong className="text-xs sm:text-sm text-on-surface font-mono font-semibold tracking-wide block truncate">
                    {order.orderId}
                  </strong>
                </div>
                <div className="w-px h-8 bg-outline-variant/30 shrink-0" />
                <div className="space-y-0.5 text-right shrink-0">
                  <span
                    className="text-[10px] uppercase font-bold text-secondary tracking-wider block"
                    style={{ fontFamily: 'var(--font-label)' }}
                  >
                    Order Date
                  </span>
                  <strong className="text-xs sm:text-sm text-on-surface font-medium block whitespace-nowrap">
                    {order.date}
                  </strong>
                </div>
              </div>
            </motion.div>

            {/* Shipment Items Card */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg shadow-xs overflow-hidden">
              <div className="p-4 border-b border-surface-container flex items-center justify-between bg-surface-container-low/30">
                <div
                  role="heading"
                  aria-level={3}
                  className="text-xs font-bold text-secondary uppercase tracking-wider font-sans"
                  style={{ fontFamily: 'var(--font-label)' }}
                >
                  {`Items in this shipment (${order.items.length})`}
                </div>
                <span className="text-[11px] text-green-700 font-bold flex items-center gap-1">
                  <BadgeCheck className="text-sm" strokeWidth={1.5} />
                  Confirmed
                </span>
              </div>

              <div className="divide-y divide-surface-container">
                {order.items.map((item, idx) => (
                  <div key={item.id || idx} className="p-4 sm:p-6 flex gap-4 sm:gap-6">
                    <div className="w-20 h-24 sm:w-24 sm:h-32 rounded-lg overflow-hidden shrink-0 border border-outline-variant/20 bg-surface-container-lowest">
                      <OptimizedImage
                        onError={handleImageError}
                        src={item.imageSrc}
                        alt={item.title || 'Culinary order item'}
                        className="w-full h-full object-cover"
                        sizes="(max-width: 640px) 96px, 128px"
                      />
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <div
                            role="heading"
                            aria-level={4}
                            className="font-bold text-sm sm:text-base text-on-surface line-clamp-1 font-sans"
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            {item.title}
                          </div>
                          {item.variant && item.variant !== 'Default' && (
                            <span className="text-[11px] text-secondary block mt-1 font-medium italic">
                              Style: {item.variant}
                            </span>
                          )}
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {item.selectedOptions.map((opt, optIdx) => (
                                <span
                                  key={optIdx}
                                  className="inline-flex items-center text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/70"
                                >
                                  <span className="opacity-75 mr-1">{opt.groupName}:</span>
                                  <strong className="font-bold">{opt.optionLabel}</strong>
                                  {opt.priceAdjustment > 0 && (
                                    <span className="ml-1 text-[9.5px] text-amber-700 font-semibold">
                                      (+₹{opt.priceAdjustment})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-sm sm:text-base font-bold text-on-surface shrink-0">
                          ₹{safeFormatNumber(item.price)}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-4 text-[11px] text-secondary">
                        <span className="flex items-center gap-1">
                          Qty: <strong className="text-on-surface">{item.quantity}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Actions & Details */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            {/* Price Summary Card */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs">
              <div
                role="heading"
                aria-level={3}
                className="text-xs font-bold text-secondary uppercase tracking-wider pb-3 border-b border-outline-variant/40 mb-4 font-sans"
                style={{ fontFamily: 'var(--font-label)' }}
              >
                Price Details
              </div>
              <div className="space-y-3 text-xs text-on-surface">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{safeFormatNumber(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between">
                    <span>Promo Discount</span>
                    <span className="text-green-700 font-medium">
                      - ₹{safeFormatNumber(order.discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping Fee</span>
                  <span className="text-green-700 font-bold">
                    {order.shippingFee === 0 ? 'FREE' : `₹${safeFormatNumber(order.shippingFee)}`}
                  </span>
                </div>

                {order.codFee > 0 && (
                  <div className="flex justify-between">
                    <span>COD Collection Fee</span>
                    <span className="font-medium">₹{safeFormatNumber(order.codFee)}</span>
                  </div>
                )}
                <div className="h-[1px] bg-outline-variant/40 my-3" />
                <div className="flex justify-between items-baseline font-bold">
                  <span className="text-sm">Total Paid</span>
                  <span className="text-base text-primary">
                    ₹{safeFormatNumber(order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Address Card */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-variant/40">
                <div
                  role="heading"
                  aria-level={3}
                  className="text-xs font-bold text-secondary uppercase tracking-wider font-sans"
                  style={{ fontFamily: 'var(--font-label)' }}
                >
                  Delivery Address
                </div>
                <MapPin className="text-sm text-secondary" strokeWidth={1.5} />
              </div>
              <div className="text-[12px] space-y-1.5 text-on-surface">
                <p className="font-bold text-sm">{order.deliveryAddress.name}</p>
                <p className="text-secondary leading-relaxed">
                  {order.deliveryAddress.addressString}
                  {order.deliveryAddress.locality ? `, ${order.deliveryAddress.locality}` : ''}
                  <br />
                  {order.deliveryAddress.city}, {order.deliveryAddress.state} —{' '}
                  <strong>{order.deliveryAddress.pincode}</strong>
                </p>
                {order.deliveryAddress.phone && (
                  <p className="pt-2 font-bold text-on-surface">
                    Mobile: {order.deliveryAddress.phone}
                  </p>
                )}
                {order.deliveryAddress.email && (
                  <p className="text-[11px] text-secondary">Email: {order.deliveryAddress.email}</p>
                )}
              </div>
            </div>

            {/* Payment Status Card */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <div
                  role="heading"
                  aria-level={3}
                  className="font-bold text-secondary uppercase tracking-wider font-sans"
                  style={{ fontFamily: 'var(--font-label)' }}
                >
                  Payment Status
                </div>
                <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-bold border border-green-200 uppercase text-[10px]">
                  {order.paymentStatus === 'Pending COD' ? 'Pending COD' : 'Confirmed'}
                </span>
              </div>
              <p className="text-[11px] text-secondary mt-3">
                Via: <strong className="text-on-surface">{order.paymentMode}</strong>
              </p>
            </div>

            {/* Required Timeline / Delivery Deadline Card */}
            {order.needByDate && (
              <div className="bg-surface-bright border border-outline-variant/40 rounded-xl p-4 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--color-gold-dark)]/40 via-[var(--color-gold)]/60 to-transparent" />
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-outline-variant/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-[var(--color-gold-dark)]/10 text-[var(--color-gold-dark)] flex items-center justify-center shrink-0">
                      <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
                    </span>
                    <span
                      role="heading"
                      aria-level={3}
                      className="text-[11px] font-bold text-secondary uppercase tracking-wider truncate font-sans"
                      style={{ fontFamily: 'var(--font-label)' }}
                    >
                      Delivery Deadline
                    </span>
                  </div>
                  <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-wider text-[var(--color-gold-dark)] bg-[var(--color-gold-dark)]/10 px-2 py-0.5 rounded border border-[var(--color-gold-dark)]/20 whitespace-nowrap">
                    Target Date
                  </span>
                </div>
                <div className="mt-3 bg-surface-container-lowest/90 border border-outline-variant/25 rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-semibold text-secondary/70 uppercase tracking-widest block">
                      Required By
                    </span>
                    <p className="text-[15px] font-bold text-on-surface tracking-tight font-display leading-tight">
                      {order.needByDate}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[var(--color-gold-dark)]/5 border border-[var(--color-gold-dark)]/15 flex items-center justify-center text-[var(--color-gold-dark)] shrink-0">
                    <Clock className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-secondary/80 leading-normal">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
                  <span>Scheduling prioritized for this date.</span>
                </div>
              </div>
            )}

            {/* Primary Actions */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() => navigate('/dashboard?tab=orders')}
                className="w-full bg-[#283618] hover:bg-[#1f2b13] text-white h-12 pl-5 pr-1.5 py-1 rounded-full text-[12px] font-extrabold uppercase tracking-wider transition-all shadow-sm flex items-center justify-between group cursor-pointer border border-[#283618] active:scale-[0.98]"
              >
                <span>Track Your Order</span>
                <span className="w-8 h-8 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
                  <ArrowRight
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    strokeWidth={2.5}
                  />
                </span>
              </button>
              <button
                onClick={() => setShowStickerModal(true)}
                className="w-full bg-white border border-neutral-200 text-neutral-900 h-12 rounded-full text-[12px] font-extrabold uppercase tracking-wider hover:bg-neutral-50 transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-[0.98]"
              >
                <Receipt className="w-4 h-4 text-neutral-700" strokeWidth={1.8} />
                <span>View Digital Invoice</span>
              </button>
              <Link
                to="/collections"
                className="w-full bg-surface-bright border border-outline-variant text-secondary h-12 rounded-full text-[12px] font-extrabold uppercase tracking-wider hover:bg-surface-container-low transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <ShoppingBag className="w-4 h-4 text-neutral-700" strokeWidth={1.8} />
                <span>Continue Shopping</span>
              </Link>
            </div>

            {/* Trust Footer */}
            <div className="pt-4 text-center text-[11px] text-secondary flex flex-col items-center gap-3">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="text-[14px] text-green-700 font-bold" strokeWidth={1.5} />
                  Safe
                </span>
                <span className="flex items-center gap-1">
                  <Ban className="text-[14px] text-amber-700 font-bold" strokeWidth={1.5} />
                  Non-Returnable (Perishable)
                </span>
              </div>
              <p className="font-medium tracking-wide">100% Homemade Goodness</p>
            </div>
          </div>
        </div>
      </div>

      {showStickerModal && order && (
        <InvoiceModal
          isOpen={showStickerModal}
          order={order}
          onClose={() => setShowStickerModal(false)}
        />
      )}
    </motion.div>
  );
}
