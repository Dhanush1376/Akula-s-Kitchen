import { Plus, ArrowRight, MapPin } from 'lucide-react';
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
      <div className="bg-white/90 border border-neutral-200/80 rounded-xl px-3 py-2 flex items-center justify-between shadow-2xs font-sans mb-3 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#283618]/10 text-[#283618] flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5" strokeWidth={2} />
          </div>
          <span className="text-[12px] font-semibold text-neutral-900 tracking-normal font-sans">
            Saved Delivery Addresses
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
          title="Add New Delivery Destination"
        >
          <Plus size={12} strokeWidth={2.4} />
          <span>Add New</span>
        </button>
      </div>

      {isAddressesLoading ? (
        <div
          className={isDrawer ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}
        >
          <div className="h-40 bg-white border border-outline-variant/20 rounded-lg animate-pulse" />
          <div className="h-40 bg-white border border-outline-variant/20 rounded-lg animate-pulse" />
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
        <div className="bg-surface-bright rounded-lg p-8 text-center shadow-sm flex flex-col items-center justify-center min-h-[35vh] relative overflow-hidden border border-black/5">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#000000]/5 rounded-full blur-3xl pointer-events-none" />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-16 h-16 rounded-full bg-[#000000]/5 text-[#000000] flex items-center justify-center mb-5 relative"
          >
            <div
              className="absolute inset-0 rounded-full border border-[#000000]/20 animate-ping"
              style={{ animationDuration: '3s' }}
            />
            <span className="material-symbols-outlined text-[24px] relative z-10">pin_drop</span>
          </motion.div>
          <h3 className="font-display font-medium text-[18px] lg:text-[20px] text-black mb-2">
            No Delivery Sites
          </h3>
          <p className="text-[11px] text-black/40 max-w-[280px] mb-6 leading-normal">
            Configure your delivery locations or event site parameters here.
          </p>
          <div className="flex justify-center mt-6">
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
              className="group flex items-center gap-2 text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.2em] text-[#000000] pb-2 border-b-[1.5px] border-[#000000] transition-all hover:opacity-70 bg-transparent outline-none cursor-pointer"
            >
              Add New Site
              <ArrowRight
                className="text-[16px] transition-transform group-hover:translate-x-1"
                strokeWidth={1.5}
              />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
