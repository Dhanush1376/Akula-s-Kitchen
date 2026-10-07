import { useState, useEffect, useCallback } from 'react';
import { orderService } from '../services/domainServices';
import { playSuccessBeep, playErrorBeep } from '../utils/media/audioUtils';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { isAdminRole } from '../constants/roles';

const trackingSteps = ['Pending', 'Confirmed', 'Processing', 'Delivered'];

/** Short package label printed on parcels; scanners may read it instead of the order id. */
export const packageBarcode = (orderId = '') =>
  `AK-${orderId.substring(orderId.length - 8).toUpperCase()}-IN`;

export function useOrderTracking({ orderId, trackingToken }) {
  const { user } = useAuth();
  // Status updates are authorised server-side by the staff session; the panel is
  // only offered to signed-in staff so customers never see operator controls.
  const isStaff = isAdminRole(user?.role);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Courier Panel State
  const [showOperatorPanel, setShowOperatorPanel] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [operatorNote, setOperatorNote] = useState('');

  const fetchTrackingDetails = useCallback(async () => {
    if (!trackingToken && !user) {
      setError(
        'A valid tracking link with security token is required. Check your order confirmation email or sign in to your account.',
      );
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      let res;
      if (trackingToken) {
        res = await orderService.getPublicTrack(orderId, trackingToken);
      } else {
        res = await orderService.getById(orderId);
      }
      setOrder(res.data || res);
      setError(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to fetch order tracking parameters. Please confirm the tracking ID.',
      );
    } finally {
      setLoading(false);
    }
  }, [orderId, trackingToken, user]);

  const getNextStatus = useCallback((current) => {
    const idx = trackingSteps.indexOf(current);
    if (idx !== -1 && idx < trackingSteps.length - 1) {
      return trackingSteps[idx + 1];
    }
    return null;
  }, []);

  const handleStatusUpdate = useCallback(
    async (newStatus) => {
      setUpdatingStatus(true);
      try {
        await orderService.updatePublicStatus(
          orderId,
          newStatus,
          operatorNote || `Dispatch transit scan: ${newStatus}`,
        );
        toast.success(`Logistics status updated to ${newStatus}`);
        setOperatorNote('');
        await fetchTrackingDetails();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to update logistics status.');
      } finally {
        setUpdatingStatus(false);
      }
    },
    [orderId, operatorNote, fetchTrackingDetails],
  );

  useEffect(() => {
    if (orderId) {
      const timer = setTimeout(() => {
        fetchTrackingDetails();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [orderId, fetchTrackingDetails]);

  // Capture physical barcode scanner keyboard inputs (staff only)
  useEffect(() => {
    if (!order || !isStaff) return;
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyPress = (e) => {
      const currentTime = Date.now();

      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          const scannedCode = buffer.trim().toUpperCase();
          buffer = '';

          const cleanOrderId = order._id.toUpperCase();
          const cleanAWB = (order.trackingNumber || '').toUpperCase();
          const customBarcode = packageBarcode(order._id);

          if (
            scannedCode === cleanOrderId ||
            scannedCode === cleanAWB ||
            scannedCode === customBarcode ||
            scannedCode.includes(cleanOrderId.substring(0, 8))
          ) {
            playSuccessBeep();

            const nextStatus = getNextStatus(order.orderStatus);
            if (nextStatus) {
              handleStatusUpdate(nextStatus);
              toast.success(`Package Verified! Advancing status to ${nextStatus}...`);
            } else {
              toast.success('Package is already delivered!');
            }
          } else {
            playErrorBeep();
            toast.error(`Scan mismatch! Barcode "${scannedCode}" does not match this package.`);
          }
        }
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [order, isStaff, getNextStatus, handleStatusUpdate]);

  return {
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
  };
}
