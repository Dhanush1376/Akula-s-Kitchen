import { Plus, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { AddressCard } from '../../components/dashboard/AddressCard';

export function AddressesSection({ isDrawer = false }) {
  const {
    isAddressesLoading,
    addresses,
    setEditingAddressId,
    setAddressFormData,
    setIsAddressModalOpen,
    user,
  } = useDashboard();

  return (
    <motion.div
      id="panel-addresses"
      role="tabpanel"
      key="tab-addresses"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className={`space-y-3.5 text-left ${isDrawer ? 'pb-2' : ''}`}
    >
      {/* Header Bar — Compact, clean font, reduced padding */}
      <div className="bg-white/90 border border-neutral-200/80 rounded-xl px-3 py-2 flex items-center justify-between shadow-2xs font-sans backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-[#283618]/10 text-[#283618] flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5" strokeWidth={2} />
          </div>
          <span className="text-[12px] font-semibold text-neutral-900 tracking-normal font-sans">
            Delivery Addresses
          </span>
          <span className="text-[10px] font-semibold text-neutral-600 bg-neutral-100/90 px-1.5 py-0.5 rounded-full border border-neutral-200/50">
            {addresses?.length || 0}
          </span>
        </div>
        <button
          onClick={() => {
            setEditingAddressId('new');
            setAddressFormData({
              id: 'new',
              name: user?.name || '',
              phone: user?.phone || '',
              alternatePhone: '',
              email: user?.email || '',
              pincode: '',
              locality: '',
              addressString: '',
              landmark: '',
              city: '',
              state: '',
              country: 'India',
              tag: 'Home',
              deliveryInstructions: '',
              latitude: null,
              longitude: null,
            });
            setIsAddressModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white bg-[#283618] hover:bg-[#1f2b13] transition-all tracking-normal cursor-pointer shadow-2xs active:scale-95 group shrink-0"
          title="Add New Address"
        >
          <Plus size={12} strokeWidth={2.4} />
          <span>Add New</span>
        </button>
      </div>

      {isAddressesLoading ? (
        <div
          className={isDrawer ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}
        >
          <div className="h-40 bg-white border border-outline-variant/20 rounded-xl animate-pulse" />
          <div className="h-40 bg-white border border-outline-variant/20 rounded-xl animate-pulse" />
        </div>
      ) : (
        <div
          className={isDrawer ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}
        >
          <AnimatePresence>
            {[...addresses]
              .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
              .map((addr) => (
                <AddressCard key={addr._id || addr.id} addr={addr} />
              ))}
          </AnimatePresence>
        </div>
      )}

      {addresses.length === 0 && !isAddressesLoading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={`bg-white border border-neutral-200/80 rounded-2xl ${
            isDrawer ? 'p-6 py-8 min-h-[250px]' : 'p-8 sm:p-10 min-h-[290px]'
          } text-center shadow-2xs flex flex-col items-center justify-center relative overflow-hidden`}
        >
          {/* Subtle warm ambient glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#fae182]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Refined Brand Icon Badge */}
          <div className="w-16 h-16 rounded-full bg-[#fef9e7] border border-[#fae182] flex items-center justify-center mb-4 relative shadow-xs">
            <MapPin className="w-7 h-7 text-[#283618] relative z-10" strokeWidth={1.8} />
          </div>

          <h3 className="font-bold text-[17px] sm:text-[19px] text-neutral-900 tracking-tight mb-2">
            No Saved Addresses
          </h3>
          <p className="font-body text-[12.5px] sm:text-[13px] text-neutral-500 font-medium max-w-[320px] mx-auto leading-relaxed mb-6">
            Add your address for 1-click checkout delivery.
          </p>

          <button
            type="button"
            onClick={() => {
              setEditingAddressId('new');
              setAddressFormData({
                id: 'new',
                name: user?.name || '',
                phone: user?.phone || '',
                alternatePhone: '',
                email: user?.email || '',
                pincode: '',
                locality: '',
                addressString: '',
                landmark: '',
                city: '',
                state: '',
                country: 'India',
                tag: 'Home',
                deliveryInstructions: '',
                latitude: null,
                longitude: null,
              });
              setIsAddressModalOpen(true);
            }}
            className="inline-flex items-center justify-between gap-3.5 pl-5 pr-1.5 py-1 min-h-[44px] rounded-full bg-[#283618] hover:bg-[#1f2b13] text-white font-extrabold text-[12px] uppercase tracking-wider transition-all shadow-sm hover:shadow-md active:scale-[0.98] border border-[#283618] group select-none cursor-pointer"
          >
            <span>Add Delivery Address</span>
            <span className="w-8 h-8 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
              <Plus
                className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </span>
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
