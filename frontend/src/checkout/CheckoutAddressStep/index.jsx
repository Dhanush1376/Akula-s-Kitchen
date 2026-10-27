import { motion, AnimatePresence } from 'framer-motion';
import { useCheckout } from '../CheckoutProvider';
import { useAddressForm } from '../useAddressForm';

import { AddAddressModal } from './components/AddAddressModal';
import { AddressList } from './components/AddressList';
import { MainDeliveryView } from './components/MainDeliveryView';

export default function CheckoutAddressStep() {
  const {
    activeItems,
    setActiveStep,
    activeSelectedAddress,
    savedAddresses,
    selectedAddressId,
    setSelectedAddressId,
    isAddingNewAddress,
    setIsAddingNewAddress,
    newAddress,
    setNewAddress,
    addressError,
    isProcessing,
    handleSaveNewAddress,
    PINCODE_MAP,
    checkoutSteps,
    user,
    isAddressesLoading,
  } = useCheckout();

  const {
    isSelectingList,
    setIsSelectingList,
    mapPosition,
    setMapPosition,
    fetchAddressFromCoords,
    handleAutofillLocation,
    isResolvingLocation,
    handleEdit,
    handleAddNew,
    deliveryEstimates,
  } = useAddressForm({ setNewAddress, setIsAddingNewAddress, newAddress, user });

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {isSelectingList ? (
          <motion.div
            key="address-list-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <AddressList
              savedAddresses={savedAddresses}
              selectedAddressId={selectedAddressId}
              setSelectedAddressId={setSelectedAddressId}
              handleEdit={handleEdit}
              handleAddNew={handleAddNew}
              setIsSelectingList={setIsSelectingList}
            />
          </motion.div>
        ) : (
          <motion.div
            key="main-delivery-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <MainDeliveryView
              activeSelectedAddress={activeSelectedAddress}
              setIsSelectingList={setIsSelectingList}
              handleAddNew={handleAddNew}
              activeItems={activeItems}
              deliveryEstimates={deliveryEstimates}
              setActiveStep={setActiveStep}
              checkoutSteps={checkoutSteps}
              isAddressesLoading={isAddressesLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AddAddressModal
        isAddingNewAddress={isAddingNewAddress}
        setIsAddingNewAddress={setIsAddingNewAddress}
        newAddress={newAddress}
        setNewAddress={setNewAddress}
        addressError={addressError}
        isProcessing={isProcessing}
        handleSaveNewAddress={handleSaveNewAddress}
        PINCODE_MAP={PINCODE_MAP}
        mapPosition={mapPosition}
        setMapPosition={setMapPosition}
        fetchAddressFromCoords={fetchAddressFromCoords}
        handleAutofillLocation={handleAutofillLocation}
        isResolvingLocation={isResolvingLocation}
      />
    </>
  );
}
