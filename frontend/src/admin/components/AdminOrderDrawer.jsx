import React from 'react';
import { createPortal } from 'react-dom';
import { m as motion } from 'framer-motion';
import { formatCurrency, AdminStatusPill } from './AdminUIKit';
import { EXTERNAL_URLS } from '../../config/constants';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';
import { DeleteConfirmModal } from './ui/DeleteConfirmModal';
import { OrderSettlement } from '../pages/AdminOrderDetail/OrderSettlement';
import toast from 'react-hot-toast';

const formatOrderDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  if (typeof dateStr === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('-');
    const parsed = new Date(`${y}-${m}-${d}`);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatPhoneNumber = (phoneStr) => {
  if (!phoneStr) return 'N/A';
  const clean = String(phoneStr).trim();
  if (clean.startsWith('+91') && clean.length === 13) {
    return `+91 ${clean.slice(3, 8)} ${clean.slice(8)}`;
  }
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return clean;
};

import { useMobileDrawerEngine, DrawerDragHandle } from '../../components/ui/drawer';

export function AdminOrderDrawer({
  selectedOrder,
  selectedOrderData,
  setIsDrawerOpen,
  allStatuses = [],
  updateOrderStatus,
  deleteOrder,
  refetchOrders,
  navigate,
}) {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [settlementCharges, setSettlementCharges] = React.useState(
    selectedOrderData?.rawOrder?.courierCharges || selectedOrder.courierCharges || 150,
  );
  const [collectedAmount, setCollectedAmount] = React.useState(
    selectedOrderData?.collectedAmount ??
      selectedOrderData?.rawOrder?.collectedAmount ??
      selectedOrderData?.total ??
      selectedOrder.collectedAmount ??
      selectedOrder.total ??
      0,
  );

  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen: true,
    onClose: () => setIsDrawerOpen(false),
  });

  const slideDrawer = {
    hidden: isMobile ? { y: '100%' } : { x: '100%' },
    show: isMobile ? { y: 0 } : { x: 0 },
    exit: isMobile ? { y: '100%' } : { x: '100%' },
  };

  React.useEffect(() => {
    const orderObj = selectedOrderData || selectedOrder;
    if (orderObj) {
      const initialCharges =
        orderObj.courierCharges !== undefined
          ? orderObj.courierCharges
          : orderObj.rawOrder?.courierCharges !== undefined
            ? orderObj.rawOrder.courierCharges
            : 150;
      setSettlementCharges(initialCharges);
      const initialCollected =
        orderObj.collectedAmount !== undefined
          ? orderObj.collectedAmount
          : orderObj.rawOrder?.collectedAmount !== undefined
            ? orderObj.rawOrder.collectedAmount
            : orderObj.total || 0;
      setCollectedAmount(initialCollected);
    }
    // Re-seed only when a different order is opened; refetches of the same order
    // must not overwrite values the admin is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder?.id, selectedOrderData?.id]);

  const handleDelete = async () => {
    const success = await deleteOrder(selectedOrder.id);
    if (success) {
      setShowDeleteModal(false);
      setIsDrawerOpen(false);
    }
  };

  const handleCopy = (text, label = 'Text') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  if (typeof document === 'undefined') return null;

  const isDark =
    typeof document !== 'undefined' &&
    (document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark'));

  return createPortal(
    <div className={`admin-section-root ${isDark ? 'dark' : ''}`}>
      <motion.div
        key="admin-order-drawer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsDrawerOpen(false)}
        className="fixed inset-0 z-[999] cursor-pointer"
        style={{
          background: 'var(--admin-surface-overlay, rgba(60, 54, 42, 0.45))',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      <motion.aside
        key="admin-order-drawer-aside"
        {...dragProps}
        initial="hidden"
        animate="show"
        exit="exit"
        variants={slideDrawer}
        transition={sheetTransition}
        className="fixed z-[1000] flex flex-col overflow-hidden shadow-[var(--admin-shadow-2xl)] border-[var(--admin-border)] sm:inset-y-0 sm:top-0 sm:bottom-0 sm:right-0 sm:left-auto sm:w-[520px] sm:h-full sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0 bottom-0 inset-x-0 max-h-[90dvh] h-auto rounded-t-[14px] sm:rounded-t-none border-t sm:border-t-0 bg-[var(--admin-surface)] text-[var(--admin-text-primary)] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-0"
        style={{ background: 'var(--admin-surface, #ffffff)' }}
      >
        {/* Mobile Pull Handle */}
        {isMobile && (
          <DrawerDragHandle
            onClick={() => setIsDrawerOpen(false)}
            pillClassName="bg-[var(--admin-border-strong)]"
          />
        )}

        {/* Drawer Header */}
        <div className="px-6 py-4 sm:py-5 border-b border-[var(--admin-border-subtle)] flex items-center justify-between shrink-0 text-left bg-[var(--admin-bg-subtle)]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                Order Details Panel
              </h3>
              <AdminStatusPill status={selectedOrder.status} />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] text-[var(--admin-text-secondary)] font-mono font-medium">
                #{selectedOrder.id.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(selectedOrder.id, 'Order ID')}
                className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] transition-colors p-0.5 rounded cursor-pointer"
                title="Copy Order ID"
              >
                <span className="material-symbols-outlined text-[13px]">content_copy</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {['Cancelled', 'Returned', 'Refunded', 'Exchanged', 'Delivered'].includes(
              selectedOrder.status,
            ) && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="admin-btn-icon hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)] !rounded-[4px]"
                title="Move to Recycle Bin"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            )}
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="admin-btn-icon !rounded-[4px]"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Drawer Scroll Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar text-left bg-[var(--admin-bg)] touch-pan-y overscroll-contain">
          {/* 1. Client Card */}
          <div className="bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border-subtle)] shadow-xs p-3 sm:p-3.5 space-y-2.5">
            {/* Customer Profile Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--admin-border-subtle)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[4px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-[12px] flex items-center justify-center shrink-0 border border-emerald-500/20">
                  {selectedOrder.customer
                    ? selectedOrder.customer
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'CU'}
                </div>
                <div className="min-w-0">
                  <span className="text-[9.5px] font-semibold text-[var(--admin-text-tertiary)] uppercase tracking-wider block">
                    Customer Profile
                  </span>
                  <h4 className="text-[13.5px] font-semibold text-[var(--admin-text-primary)] truncate">
                    {selectedOrder.customer || 'Unknown Customer'}
                  </h4>
                </div>
              </div>

              {/* WhatsApp Action Button */}
              {selectedOrder.phone && (
                <a
                  href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${selectedOrder.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 border border-emerald-200/80 transition-colors shrink-0 cursor-pointer"
                  title="Message Customer on WhatsApp"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>

            {/* Meta Information 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              {/* Tile 1: Customer Phone */}
              <div className="bg-[var(--admin-bg-subtle)] p-2 sm:p-2.5 rounded-[4px] border border-[var(--admin-border-subtle)] flex flex-col justify-between">
                <span className="text-[9.5px] font-semibold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-0.5">
                  Customer Phone
                </span>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[11.5px] font-medium text-[var(--admin-text-primary)] flex items-center gap-1 truncate">
                    <span className="material-symbols-outlined text-[13px] text-[var(--admin-text-tertiary)] shrink-0">
                      call
                    </span>
                    <span className="truncate">
                      {formatPhoneNumber(selectedOrder.customerPhone || selectedOrder.phone)}
                    </span>
                  </span>
                  {(selectedOrder.customerPhone || selectedOrder.phone) && (
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          selectedOrder.customerPhone || selectedOrder.phone,
                          'Phone number',
                        )
                      }
                      className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] transition-colors p-0.5 rounded-[2px] cursor-pointer shrink-0"
                      title="Copy phone number"
                    >
                      <span className="material-symbols-outlined text-[12px]">content_copy</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tile 2: Payment Mode */}
              <div className="bg-[var(--admin-bg-subtle)] p-2 sm:p-2.5 rounded-[4px] border border-[var(--admin-border-subtle)] flex flex-col justify-between">
                <span className="text-[9.5px] font-semibold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-0.5">
                  Payment Mode
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[10.5px] font-medium border ${
                      selectedOrder.payment?.toLowerCase().includes('pending') ||
                      selectedOrder.payment?.toLowerCase().includes('cod')
                        ? 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                    }`}
                  >
                    {selectedOrder.payment?.toLowerCase().includes('pending') && (
                      <span className="material-symbols-outlined text-[12px]">schedule</span>
                    )}
                    {selectedOrder.payment}
                  </span>
                  {selectedOrder.codPhoneVerified && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[3px] text-[9.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <span className="material-symbols-outlined text-[11px]">verified</span>
                      Verified
                    </span>
                  )}
                  {selectedOrder.paymentMethod?.toLowerCase() === 'cod' &&
                    !selectedOrder.codPhoneVerified && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[3px] text-[9.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300">
                        Unverified
                      </span>
                    )}
                </div>
              </div>

              {/* Tile 3: Invoice Date */}
              <div className="bg-[var(--admin-bg-subtle)] p-2 sm:p-2.5 rounded-[4px] border border-[var(--admin-border-subtle)] flex flex-col justify-between">
                <span className="text-[9.5px] font-semibold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-0.5">
                  Invoice Date
                </span>
                <span className="text-[11.5px] font-medium text-[var(--admin-text-primary)] flex items-center gap-1 truncate">
                  <span className="material-symbols-outlined text-[13px] text-[var(--admin-text-tertiary)] shrink-0">
                    event
                  </span>
                  <span className="truncate">{formatOrderDate(selectedOrder.date)}</span>
                </span>
              </div>

              {/* Tile 4: Need-By Date */}
              <div className="bg-[var(--admin-bg-subtle)] p-2 sm:p-2.5 rounded-[4px] border border-[var(--admin-border-subtle)] flex flex-col justify-between">
                <span className="text-[9.5px] font-semibold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-0.5">
                  Need-By Date
                </span>
                <span className="text-[11.5px] font-medium text-[var(--admin-text-primary)] flex items-center gap-1 truncate">
                  <span className="material-symbols-outlined text-[13px] text-[var(--admin-text-tertiary)] shrink-0">
                    calendar_today
                  </span>
                  <span className="truncate">
                    {selectedOrder.needByDate
                      ? formatOrderDate(selectedOrder.needByDate)
                      : 'Standard Delivery'}
                  </span>
                </span>
              </div>
            </div>

            {/* Optional Transaction Details (Payment ID / UPI) */}
            {(selectedOrder.razorpayPaymentId ||
              selectedOrder.paymentDetails?.paymentId ||
              selectedOrder.upiVpa) && (
              <div className="bg-[var(--admin-bg-subtle)] p-2 px-2.5 rounded-[4px] border border-[var(--admin-border-subtle)] flex items-center justify-between text-[11px] flex-wrap gap-2">
                {(selectedOrder.razorpayPaymentId || selectedOrder.paymentDetails?.paymentId) && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[9.5px] font-semibold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                      Payment ID:
                    </span>
                    <span className="font-mono text-[11px] font-medium text-[var(--admin-text-primary)] truncate">
                      {selectedOrder.paymentDetails?.paymentId || selectedOrder.razorpayPaymentId}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          selectedOrder.paymentDetails?.paymentId ||
                            selectedOrder.razorpayPaymentId,
                          'Payment ID',
                        )
                      }
                      className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] p-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[12px]">content_copy</span>
                    </button>
                  </div>
                )}
                {selectedOrder.upiVpa && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[9.5px] font-semibold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                      UPI VPA:
                    </span>
                    <span className="font-mono text-[11px] font-medium text-indigo-600 dark:text-indigo-400 truncate">
                      {selectedOrder.upiVpa}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Delivery Address & Shipping Contact Block */}
            <div className="bg-[var(--admin-bg-subtle)] p-2.5 sm:p-3 rounded-[4px] border border-[var(--admin-border-subtle)] space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9.5px] font-semibold text-[var(--admin-text-tertiary)] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px] text-[var(--admin-text-tertiary)]">
                    location_on
                  </span>
                  Delivery Address
                </span>
                {selectedOrder.shippingPhone && (
                  <span className="text-[10.5px] font-medium text-[var(--admin-text-secondary)] flex items-center gap-1 bg-[var(--admin-surface)] px-1.5 py-0.5 rounded-[3px] border border-[var(--admin-border-subtle)]">
                    <span className="material-symbols-outlined text-[11px] text-[var(--admin-text-tertiary)]">
                      local_shipping
                    </span>
                    <span className="font-mono text-[10px]">
                      {formatPhoneNumber(selectedOrder.shippingPhone)}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-[12px] font-normal text-[var(--admin-text-primary)] leading-snug pl-4">
                {selectedOrder.address || 'Address not available'}
              </p>
            </div>
          </div>

          {/* 2. Items List */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] pl-1">
              Items
            </h4>
            <div className="space-y-2">
              {selectedOrder.items.map((item, idx) => {
                const weightOpt = item.selectedOptions?.find(
                  (opt) =>
                    opt.groupName?.toLowerCase() === 'weight' ||
                    opt.groupName?.toLowerCase().includes('weight') ||
                    opt.groupName?.toLowerCase() === 'size',
                );
                const otherOptions = (item.selectedOptions || []).filter(
                  (opt) => opt !== weightOpt,
                );
                const rawWeight = weightOpt?.optionLabel || item.weight;
                const itemTitle = item.name || item.title || 'Item';
                const titleHasWeight =
                  rawWeight && itemTitle.toLowerCase().includes(String(rawWeight).toLowerCase());

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] shadow-[var(--admin-shadow-sm)]"
                  >
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={itemTitle}
                          className="w-12 h-12 rounded-[4px] object-cover border border-[var(--admin-border)] shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-[4px] bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-gray-400">
                            inventory_2
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                            {itemTitle}
                          </p>
                          {rawWeight && !titleHasWeight && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10.5px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 leading-none shrink-0 shadow-2xs">
                              {rawWeight}
                            </span>
                          )}
                        </div>
                        {otherOptions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-0.5 mb-1">
                            {otherOptions.map((opt, optIdx) => (
                              <span
                                key={optIdx}
                                className="text-[10px] text-[var(--admin-text-secondary)] font-normal"
                              >
                                {opt.groupName}:{' '}
                                <strong className="text-[var(--admin-text-primary)]">
                                  {opt.optionLabel}
                                </strong>
                                {opt.priceAdjustment > 0 && ` (+₹${opt.priceAdjustment})`}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-[11px] font-medium text-[var(--admin-text-secondary)] mt-0.5 bg-[var(--admin-surface-muted)] inline-block px-1.5 py-0.5 rounded-[4px] border border-[var(--admin-border-subtle)]">
                          Qty: {item.qty || item.quantity || 1}
                        </p>
                      </div>
                    </div>
                    <span className="text-[12px] font-bold text-[var(--admin-text-primary)] shrink-0 ml-3">
                      {formatCurrency(Number(item.price * (item.qty || item.quantity || 1)))}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between p-4 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-strong)] rounded-[4px]">
              <span className="text-[12px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
                Grand Total
              </span>
              <span className="text-[16px] text-[var(--admin-text-primary)] font-bold">
                {formatCurrency(selectedOrder.total)}
              </span>
            </div>
          </div>

          {/* 3. Transaction Timeline */}
          <div className="admin-card !rounded-[4px] p-5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] mb-5">
              Delivery Timeline
            </h4>
            <div className="relative pl-6 space-y-5 border-l-2 border-[var(--admin-border)] ml-3">
              {allStatuses.slice(0, 4).map((st, sidx) => {
                const isDone = allStatuses.indexOf(selectedOrder.status) >= sidx;
                const isCurrent = selectedOrder.status === st;

                const STATUS_COLORS = {
                  Pending: {
                    border: 'border-amber-500',
                    bg: 'bg-amber-500',
                    text: 'text-amber-600',
                    badgeText: 'text-amber-700',
                    badgeBg: 'bg-amber-100',
                    badgeBorder: 'border-amber-200',
                  },
                  Confirmed: {
                    border: 'border-blue-500',
                    bg: 'bg-blue-500',
                    text: 'text-blue-600',
                    badgeText: 'text-blue-700',
                    badgeBg: 'bg-blue-100',
                    badgeBorder: 'border-blue-200',
                  },
                  Processing: {
                    border: 'border-purple-500',
                    bg: 'bg-purple-500',
                    text: 'text-purple-600',
                    badgeText: 'text-purple-700',
                    badgeBg: 'bg-purple-100',
                    badgeBorder: 'border-purple-200',
                  },
                  Delivered: {
                    border: 'border-emerald-500',
                    bg: 'bg-emerald-500',
                    text: 'text-emerald-600',
                    badgeText: 'text-emerald-700',
                    badgeBg: 'bg-emerald-100',
                    badgeBorder: 'border-emerald-200',
                  },
                };
                const colors = STATUS_COLORS[st] || {
                  border: 'border-[var(--admin-accent)]',
                  bg: 'bg-[var(--admin-accent)]',
                  text: 'text-[var(--admin-accent)]',
                  badgeText: 'text-[var(--admin-accent)]',
                  badgeBg: 'bg-[var(--admin-accent)]/10',
                  badgeBorder: 'border-[var(--admin-accent)]/20',
                };

                return (
                  <div key={st} className="relative flex items-center justify-between">
                    <span
                      className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center transition-all ${
                        isDone ? colors.border : 'border-gray-300'
                      }`}
                    >
                      {isDone && <span className={`w-2 h-2 rounded-full ${colors.bg}`} />}
                    </span>
                    <div>
                      <p
                        className={`text-[12px] font-bold ${
                          isDone ? colors.text : 'text-gray-400'
                        }`}
                      >
                        {st}
                      </p>
                    </div>
                    {isCurrent && (
                      <span
                        className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full animate-pulse border ${colors.badgeText} ${colors.badgeBg} ${colors.badgeBorder}`}
                      >
                        Active State
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Financial Settlement */}
          <OrderSettlement
            order={selectedOrderData || selectedOrder}
            updateOrderStatus={updateOrderStatus}
            settlementCharges={settlementCharges}
            setSettlementCharges={setSettlementCharges}
            collectedAmount={collectedAmount}
            setCollectedAmount={setCollectedAmount}
          />
        </div>

        {/* Fixed Pinned Footer (Does not scroll) */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] space-y-3 z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.25)]">
          <div className="w-full bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-[4px] border border-blue-100 dark:border-blue-900/30">
            <label className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider block mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">edit_note</span>
              Direct Status Override
            </label>
            <div className="relative w-full h-9">
              <select
                value={selectedOrderData?.status || selectedOrder.status}
                onChange={(e) => {
                  updateOrderStatus(selectedOrder.id, e.target.value);
                }}
                style={{ backgroundImage: 'none' }}
                className="admin-no-arrow w-full h-9 !min-h-[36px] !max-h-[36px] !appearance-none !bg-none bg-white dark:bg-stone-800 hover:bg-stone-50 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-[12px] font-bold rounded-[4px] pl-3 pr-8 cursor-pointer shadow-xs outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {allStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                navigate(`/admin/orders/${selectedOrder.id}`);
              }}
              className="admin-btn !rounded-[4px] bg-white border-2 border-[var(--admin-border-strong)] text-[var(--admin-text-primary)] hover:bg-gray-50 flex-1 min-h-[44px] shadow-sm font-bold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              Full Details
            </button>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="admin-btn !rounded-[4px] bg-[var(--admin-accent)] text-white hover:opacity-90 flex-1 min-h-[44px] shadow-md font-bold text-[14px] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Done
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Move Order to Recycle Bin"
        productTitle={`Order #${selectedOrder.id.substring(selectedOrder.id.length - 8).toUpperCase()}`}
        message="This order will be moved to the Recycle Bin. You can restore it within the retention period or permanently delete it."
        confirmText="Move to Recycle Bin"
        isRecycleBinAction={true}
      />
    </div>,
    document.body,
  );
}
