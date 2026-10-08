import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

const GPSMap = React.lazy(() => import('../../../pages/GPSMapLazy'));

/**
 * Clean split panel showing delivery destination and synced GPS map.
 */
export default function OrderDeliveryAddressCard({ shippingAddress }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 font-sans text-left">
      {/* Address Card */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="pb-3 mb-3 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-neutral-800" strokeWidth={2} />
            <span className="text-[13px] font-semibold text-neutral-900 tracking-normal">
              Delivery Address
            </span>
          </div>
          {shippingAddress?.tag && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
              {shippingAddress.tag}
            </span>
          )}
        </div>

        {shippingAddress ? (
          <div className="text-[12px] space-y-1">
            <p className="font-bold text-neutral-950 text-[13px] capitalize">
              {shippingAddress.name}
            </p>
            <p className="text-neutral-600 leading-relaxed">
              {shippingAddress.addressString || shippingAddress.address}
              {shippingAddress.locality ? `, ${shippingAddress.locality}` : ''}
              <br />
              {shippingAddress.city}, {shippingAddress.state} -{' '}
              <strong className="text-neutral-900 font-semibold">{shippingAddress.pincode}</strong>
            </p>
            {shippingAddress.phone && (
              <p className="text-[11.5px] text-neutral-600 pt-1.5 flex items-center gap-1.5">
                <span>Phone:</span>
                <strong className="text-neutral-900 font-semibold">{shippingAddress.phone}</strong>
              </p>
            )}
          </div>
        ) : (
          <div className="text-[12px] text-neutral-400 italic">Address details unavailable.</div>
        )}
      </div>

      {/* GPS Coordinate Map Panel */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col">
        <div className="pb-3 mb-3 border-b border-neutral-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-neutral-800" strokeWidth={2} />
            <span className="text-[13px] font-semibold text-neutral-900 tracking-normal">
              Destination Location
            </span>
          </div>
          <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            GPS Synced
          </span>
        </div>

        <div className="relative flex-1 rounded-md bg-neutral-100 overflow-hidden border border-neutral-200 min-h-[120px]">
          <React.Suspense fallback={<div className="h-full w-full bg-neutral-100 animate-pulse" />}>
            <GPSMap address={shippingAddress} />
          </React.Suspense>
        </div>
      </div>
    </div>
  );
}
