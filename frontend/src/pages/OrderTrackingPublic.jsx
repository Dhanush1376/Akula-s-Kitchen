import { Truck, PackageCheck, History } from 'lucide-react';
import React from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';
import { OrderTrackingSkeleton } from '../components/ui/Skeleton';
import { useOrderTracking, packageBarcode } from '../hooks/useOrderTracking';
import OrderJourneyTracker from '../features/orders/components/OrderJourneyTracker';
import { TrackingCourierDetails } from '../components/tracking/TrackingCourierDetails';
import { TrackingOperatorPanel } from '../components/tracking/TrackingOperatorPanel';
import { useConfig } from '../context/ConfigContext';

const statusColors = {
  Pending: 'text-amber-600 bg-amber-50 border-amber-200',
  Confirmed: 'text-blue-600 bg-blue-50 border-blue-200',
  Processing: 'text-purple-600 bg-purple-50 border-purple-200',
  Delivered: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  Cancelled: 'text-red-600 bg-red-50 border-red-200',
  Returned: 'text-orange-600 bg-orange-50 border-orange-200',
  Refunded: 'text-gray-600 bg-gray-50 border-gray-200',
};

export function OrderTrackingPublic() {
  const { storeNameUpper, storeSettings } = useConfig();
  const supportPhone = storeSettings?.support?.phone || storeSettings?.contact?.phone || '';
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const trackingToken = searchParams.get('token') || '';

  const {
    order,
    loading,
    error,
    showOperatorPanel,
    setShowOperatorPanel,
    isStaff,
    updatingStatus,
    operatorNote,
    setOperatorNote,
    handleStatusUpdate,
  } = useOrderTracking({ orderId, trackingToken });

  if (loading) {
    return <OrderTrackingSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-surface-bright flex flex-col items-center justify-center p-6 text-center">
        <SEO title="Tracking Error" noindex />
        <Truck className="text-[64px] text-red-400 mb-4 animate-bounce" strokeWidth={1.5} />
        <h2 className="font-body text-xl font-bold text-on-surface mb-2">
          Tracking Record Unreachable
        </h2>
        <p className="text-xs text-secondary max-w-sm mb-6 leading-relaxed">
          {error || 'We could not fetch tracking details for this dispatch token.'}
        </p>
        <Link
          to="/"
          className="btn-primary px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md"
        >
          Return to Store
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8 px-4 sm:px-6 relative overflow-hidden font-sans">
      <SEO title={`Track Dispatch #${order._id.substring(0, 8).toUpperCase()}`} noindex />

      <div className="max-w-[768px] mx-auto space-y-4 relative z-10">
        {/* Top Header Card */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 sm:p-6 shadow-sm text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-md text-[10.5px] font-semibold mb-3">
            <Truck className="w-3.5 h-3.5 text-neutral-600" strokeWidth={1.8} />
            <span>{order.courierPartner || 'Courier'} Tracking</span>
          </div>

          <h2 className="text-[15px] sm:text-[16px] font-bold text-neutral-900 mb-1">
            Live Dispatch Tracking
          </h2>
          <p className="text-[12px] text-neutral-500 leading-relaxed max-w-md mx-auto">
            Order Reference:{' '}
            <strong className="text-neutral-900 font-mono font-semibold">{order._id}</strong>
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-neutral-200 text-left text-[11.5px]">
            <div>
              <span className="text-[10px] font-semibold text-neutral-500 block mb-0.5">
                AWB Tracking No
              </span>
              <strong className="text-neutral-900 font-mono text-[11.5px] font-semibold">
                {order.trackingNumber || packageBarcode(order._id)}
              </strong>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-neutral-500 block mb-0.5">
                Date Dispatched
              </span>
              <strong className="text-neutral-900 font-medium">
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </strong>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-neutral-500 block mb-0.5">
                Payment Method
              </span>
              <strong className="text-neutral-900 font-medium uppercase">
                {order.paymentMethod?.includes('COD') ? 'Cash on Delivery' : 'Prepaid'}
              </strong>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-neutral-500 block mb-0.5">
                Current Status
              </span>
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColors[order.orderStatus] || 'bg-neutral-100 text-neutral-800 border-neutral-200'}`}
              >
                {order.orderStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Multi-Color Timeline Journey */}
        <OrderJourneyTracker
          order={order}
          status={order.orderStatus}
          isDelivered={order.orderStatus?.toLowerCase() === 'delivered'}
          isCancelled={order.orderStatus?.toLowerCase() === 'cancelled'}
          isRefunded={order.orderStatus?.toLowerCase() === 'refunded'}
        />

        {/* Package Level Progress */}
        {order.packages && order.packages.length > 0 && (
          <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-sm mt-4">
            <h2 className="text-[12.5px] font-semibold text-neutral-800 mb-3 flex items-center gap-1.5">
              <PackageCheck className="text-sm" strokeWidth={1.5} />
              <span>Package Tracking ({order.packages.length})</span>
            </h2>
            <div className="space-y-6">
              {order.packages.map((pkg, i) => (
                <div
                  key={pkg.packageId}
                  className="border border-outline-variant/50 rounded-xl p-5 bg-surface/50"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-on-surface text-sm">
                        Package {pkg.packageNumber} of {pkg.totalPackages}
                      </h3>
                      <p className="text-xs text-secondary font-mono mt-1">{pkg.packageId}</p>
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${statusColors[pkg.status] || 'bg-surface'}`}
                    >
                      {pkg.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {pkg.shipment ? (
                    <div className="mb-4 bg-primary/5 p-3 rounded-lg border border-primary/10 text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="text-secondary font-medium">Courier:</span>
                        <span className="font-bold">{pkg.shipment.courierPartner}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-secondary font-medium">AWB / Tracking:</span>
                        <span className="font-bold font-mono text-primary">
                          {pkg.shipment.awbNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary font-medium">Shipment Status:</span>
                        <span className="font-bold uppercase tracking-wider">
                          {pkg.shipment.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 text-xs text-secondary/70 italic">
                      Tracking pending - Currently being processed in warehouse
                    </div>
                  )}

                  <div className="text-[11px] text-secondary">
                    <strong className="block mb-1 text-on-surface">Items:</strong>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {pkg.items.map((item, idx) => (
                        <li key={idx}>
                          {item.sku} (Qty: {item.quantity})
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Shipment Events Timeline if any */}
                  {pkg.events && pkg.events.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-outline-variant/30">
                      <strong className="block text-[11px] text-on-surface uppercase tracking-widest mb-3">
                        Courier Transit Logs
                      </strong>
                      <div className="space-y-3 pl-2">
                        {pkg.events.map((event, idx) => (
                          <div key={idx} className="flex gap-3 text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            <div>
                              <strong className="text-on-surface uppercase block">
                                {event.status.replace(/_/g, ' ')}
                              </strong>
                              <span className="text-secondary">
                                {event.location} •{' '}
                                {new Date(event.timestamp).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Transit History Logs */}
        <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 lg:p-8 shadow-xs">
          <h2 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <History className="text-sm" strokeWidth={1.5} />
            <span>Detailed Activity Log</span>
          </h2>

          <div className="space-y-4">
            {order.statusHistory && order.statusHistory.length > 0 ? (
              <div className="relative pl-6 border-l border-outline-variant/30 space-y-6 text-[12px]">
                {order.statusHistory
                  .slice()
                  .reverse()
                  .map((history, i) => (
                    <div key={i} className="relative">
                      <span className="absolute -left-[30px] top-1.5 w-2 h-2 rounded-full bg-primary ring-4 ring-primary/15" />
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <strong className="text-on-surface uppercase tracking-wider block text-[11px] mb-0.5">
                            {history.status}
                          </strong>
                          <p className="text-secondary leading-relaxed font-light">
                            {history.note || `Order status updated to ${history.status}`}
                          </p>
                        </div>
                        <span className="text-[10px] text-secondary/60 shrink-0 font-medium whitespace-nowrap">
                          {new Date(history.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-6 text-secondary italic text-[11px]">
                No dispatch logs currently entered. Updates will log automatically here.
              </div>
            )}
          </div>
        </div>

        {/* Delivery Address & Package Summary */}
        <TrackingCourierDetails order={order} />

        {/* Courier scanning desk (signed-in staff only) */}
        {isStaff && (
          <TrackingOperatorPanel
            showOperatorPanel={showOperatorPanel}
            setShowOperatorPanel={setShowOperatorPanel}
            operatorNote={operatorNote}
            setOperatorNote={setOperatorNote}
            handleStatusUpdate={handleStatusUpdate}
            updatingStatus={updatingStatus}
          />
        )}

        {/* Footer info */}
        <div className="text-center text-[10px] text-secondary font-medium tracking-wide">
          {storeNameUpper || "AKULA'S KITCHEN"} • KITCHEN DELIVERIES
          {supportPhone && <> • NEED HELP? CALL {supportPhone}</>}
        </div>
      </div>
    </div>
  );
}
