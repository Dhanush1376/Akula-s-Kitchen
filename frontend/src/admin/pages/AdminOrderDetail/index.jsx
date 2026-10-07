import React, { useState, useEffect, useCallback } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { InvoiceModal } from '../../../components/ui';
import { AdminOrderDetailSkeleton, stagger } from '../../components/AdminUIKit';
import { OrderHeader } from './OrderHeader';
import { OrderStatusTimeline } from './OrderStatusTimeline';

import { OrderSettlement } from './OrderSettlement';
import { OrderItems } from './OrderItems';
import { OrderShipping } from './OrderShipping';
import { OrderCancelCard } from './OrderCancelCard';
import { orderService } from '../../../services/domainServices';
import { useOrderScanner } from './hooks/useOrderScanner';

export function AdminOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { orders, dataLoading, updateOrderStatus } = useAdmin();

  // Find from context cache first with resilient ID / code matching
  const matchedOrder = orders.find(
    (o) =>
      o.id === orderId ||
      o._id === orderId ||
      String(o._id) === String(orderId) ||
      o.rawOrder?._id === orderId ||
      o.rawOrder?.id === orderId ||
      o.orderCode === orderId ||
      o.rawOrder?.orderCode === orderId,
  );

  const [directOrder, setDirectOrder] = useState(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [directFailed, setDirectFailed] = useState(false);

  const fetchDirectOrder = useCallback(() => {
    if (!orderId) return;
    setDirectLoading(true);
    setDirectFailed(false);
    orderService
      .getById(orderId)
      .then((res) => {
        const raw = res?.data || res;
        if (raw && (raw.id || raw._id)) {
          const mapped = {
            id: String(raw.id || raw._id),
            customer: raw.shippingAddress?.name || raw.user?.name || 'Customer',
            email: raw.shippingAddress?.email || raw.user?.email || '',
            phone: raw.shippingAddress?.phone || raw.user?.phone || '',
            total: raw.total || raw.totalAmount || 0,
            status: raw.orderStatus || raw.status || 'Confirmed',
            date: raw.createdAt ? new Date(raw.createdAt).toLocaleDateString() : '',
            rawOrder: raw,
            items: (raw.items || []).map((item) => ({
              name: item.title || item.name || 'Item',
              qty: item.quantity || item.qty || 1,
              price: item.price || 0,
              image: item.imageSrc || item.image || item.images?.[0] || item.thumbnail || '',
            })),
            ...raw,
          };
          setDirectOrder(mapped);
        } else {
          setDirectFailed(true);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch order detail directly:', err);
        setDirectFailed(true);
      })
      .finally(() => {
        setDirectLoading(false);
      });
  }, [orderId]);

  useEffect(() => {
    if (!matchedOrder && orderId && !directOrder && !directFailed) {
      fetchDirectOrder();
    }
  }, [matchedOrder, orderId, directOrder, directFailed, fetchDirectOrder]);

  const order = matchedOrder || directOrder;

  const [showStickerModal, setShowStickerModal] = useState(false);
  const [printStickerOnly, setPrintStickerOnly] = useState(false);
  const [settlementCharges, setSettlementCharges] = useState(150);
  const [collectedAmount, setCollectedAmount] = useState(order?.total || 0);

  useEffect(() => {
    if (order) {
      const initialCharges =
        order.courierCharges !== undefined
          ? order.courierCharges
          : order.rawOrder?.courierCharges !== undefined
            ? order.rawOrder.courierCharges
            : 150;
      setSettlementCharges(initialCharges);
      const initialCollected =
        order.collectedAmount !== undefined
          ? order.collectedAmount
          : order.rawOrder?.collectedAmount !== undefined
            ? order.rawOrder.collectedAmount
            : order.total || 0;
      setCollectedAmount(initialCollected);
    }
  }, [order?.id, order]);

  // Hook for hardware barcode scanner
  useOrderScanner(order, updateOrderStatus);

  if (dataLoading || directLoading) {
    return <AdminOrderDetailSkeleton />;
  }

  if (!order) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-tertiary)] mb-4">
          receipt_long
        </span>
        <p className="text-[16px] font-bold text-[var(--admin-text-primary)] mb-2">
          Order not found
        </p>
        <p className="text-xs text-[var(--admin-text-secondary)] mb-4 max-w-sm">
          Unable to locate order &quot;{orderId}&quot;. Please verify the order ID or try reloading.
        </p>
        <div className="flex items-center gap-3">
          <button onClick={fetchDirectOrder} className="admin-btn admin-btn-outline h-10 px-4">
            Retry Search
          </button>
          <button onClick={() => navigate('/admin/orders')} className="admin-btn h-10 px-6">
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const trackingQR = order.rawOrder?.qrCodeData || `${window.location.origin}/track/${order.id}`;

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page { size: ${printStickerOnly ? 'auto' : 'A4 portrait'}; margin: ${printStickerOnly ? '0' : '15mm'}; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white; }
          
          body * {
            visibility: hidden !important;
          }
          .print-only, .print-only *, .sticker-print-only, .sticker-print-only * {
            visibility: visible !important;
          }
          
          /* Force only our printable layouts to print */
          .print-only {
            display: ${printStickerOnly ? 'none' : 'block'} !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          .sticker-print-only {
            display: ${printStickerOnly ? 'block' : 'none'} !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          .no-print { display: none !important; }
          .print-header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        `}
      </style>

      {/* PRINT-ONLY INVOICE LAYOUT */}
      <div className="hidden print-only bg-[var(--admin-surface)] text-black text-[11px] p-0 w-full h-full relative">
        <InvoiceTemplate order={order} isAdmin={true} />
      </div>

      {/* NORMAL SCREEN LAYOUT */}
      <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 no-print">
        <OrderHeader
          order={order}
          navigate={navigate}
          onPrintInvoice={() => {
            setPrintStickerOnly(false);
            setTimeout(() => window.print(), 100);
          }}
          onViewInvoice={() => setShowStickerModal(true)}
        />

        <div className="max-w-[1400px] mx-auto w-auto">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-6 lg:gap-8 items-start">
            {/* LEFT COLUMN: Operations & Timeline (2/3 Width) */}
            <div className="xl:col-span-2 flex flex-col gap-3 sm:gap-6 lg:gap-8">
              {/* Status Timeline */}
              <OrderStatusTimeline order={order} updateOrderStatus={updateOrderStatus} />

              {/* Order Items */}
              <OrderItems order={order} />
            </div>

            {/* RIGHT COLUMN: Customer, Shipping, Financials (1/3 Width Sticky Sidebar) */}
            <div className="xl:col-span-1 flex flex-col gap-3 sm:gap-6 lg:gap-8 sticky top-[88px]">
              {/* Order Shipping / Customer Profile */}
              <OrderShipping order={order} />

              {/* Financials & Settlement */}
              <OrderSettlement
                order={order}
                updateOrderStatus={updateOrderStatus}
                settlementCharges={settlementCharges}
                setSettlementCharges={setSettlementCharges}
                collectedAmount={collectedAmount}
                setCollectedAmount={setCollectedAmount}
              />

              {/* Cancel Order (Danger Zone) - Placed at the very last */}
              <OrderCancelCard order={order} updateOrderStatus={updateOrderStatus} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Invoice Modal */}
      {showStickerModal && order && (
        <InvoiceModal
          isOpen={showStickerModal}
          order={order}
          isAdmin={true}
          onClose={() => setShowStickerModal(false)}
        />
      )}
    </>
  );
}
