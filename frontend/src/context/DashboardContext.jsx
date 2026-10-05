import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Profiler,
} from 'react';
import { logRenderMetrics } from '../utils/performance/profilerLogger';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useWishlist } from './WishlistContext';
import { useCart } from './CartContext';
import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { useDashboardData } from '../hooks/useDashboardData';
import { userService } from '../services/domainServices';
import { useConfirm } from './ConfirmProvider';
import { useConfig } from './ConfigContext';
import { BRAND, formatPhoneWithCountryCode } from '../config/brand';
import toast from 'react-hot-toast';

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const {
    storeSettings,
    storeName,
    storeAddress,
    supportPhone,
    whatsappUrl: configWhatsappUrl,
    whatsappNumber,
  } = useConfig();
  const _navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout, checkAuth, openAuthModal, updateUser } = useAuth();
  const { items: wishlistItems, removeItem: removeFromWishlist } = useWishlist();
  const { cartCount, items: cartItems, updateQuantity, removeItem } = useCart();
  const fileInputRef = useRef(null);

  const { contact } = useWebsiteContent();
  const addressText =
    storeAddress || storeSettings?.contact?.address || contact?.address || BRAND.address || '';
  const phoneText =
    supportPhone ||
    formatPhoneWithCountryCode(
      storeSettings?.general?.phone || storeSettings?.contact?.phone || BRAND.phone,
    );

  const whatsappUrl =
    configWhatsappUrl ||
    BRAND.getWhatsAppUrl(null, whatsappNumber || storeSettings?.general?.whatsappNumber);

  const [activeTab, setActiveTab] = useState('profile');
  const [mobileShowContent, setMobileShowContent] = useState(false);

  const location = useLocation();

  // Sync tab and orderId from URL query params
  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    if (orderIdParam) {
      setActiveTab('orders');
      setSelectedOrderId(orderIdParam);
      setMobileShowContent(true);
      return;
    }

    const tabParam = searchParams.get('tab');
    if (
      tabParam &&
      ['profile', 'orders', 'addresses', 'wishlist', 'preferences', 'loyalty'].includes(tabParam)
    ) {
      const timer = setTimeout(() => {
        setActiveTab(tabParam);
        setMobileShowContent(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Handle path-based mobileShowContent logic
  useEffect(() => {
    if (location.pathname === '/dashboard' || location.pathname === '/dashboard/') {
      setMobileShowContent(false);
    } else if (location.pathname.startsWith('/dashboard/')) {
      setMobileShowContent(true);
    }
  }, [location.pathname]);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrderItemIndex, setSelectedOrderItemIndex] = useState(0);
  const [isPriceDetailsOpen, setIsPriceDetailsOpen] = useState(true);

  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    if (!orderIdParam) {
      setSelectedOrderId(null);
    }
  }, [activeTab, searchParams]);

  const userId = user?._id || user?.id;

  const {
    orders,
    setOrders,
    addresses,
    setAddresses,
    recentlyViewed,
    setRecentlyViewed,
    isOrdersLoading,
    isAddressesLoading,
    isLoadingRecentlyViewed,
    refetch: refetchDashboardData,
  } = useDashboardData(userId);

  // Address forms
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressFormData, setAddressFormData] = useState(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const confirm = useConfirm();
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);
  const [reviewingProduct, setReviewingProduct] = useState(null);

  const _fetchOrdersList = () => refetchDashboardData();
  const fetchAddressesList = () => refetchDashboardData();

  // Sync user data on mount if needed
  useEffect(() => {
    if (user) {
      // Any remaining global sync if needed
    }
  }, [user]);

  const [orderFilter, setOrderFilter] = useState('PURCHASE');

  const [orderViewsUpdated, setOrderViewsUpdated] = useState(0);
  useEffect(() => {
    const handleUpdate = () => setOrderViewsUpdated((prev) => prev + 1);
    window.addEventListener('akula_order_views_updated', handleUpdate);
    return () => window.removeEventListener('akula_order_views_updated', handleUpdate);
  }, []);

  const allOrders = useMemo(() => {
    return [...(orders || [])].sort(
      (a, b) => new Date(b.createdAt || b.orderDate) - new Date(a.createdAt || a.orderDate),
    );
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!allOrders) return [];
    if (orderFilter === 'DELIVERED')
      return allOrders.filter((o) => o.orderStatus === 'delivered' || o.status === 'delivered');
    if (orderFilter === 'ON_THE_WAY')
      return allOrders.filter((o) =>
        ['confirmed', 'processing', 'shipped'].includes((o.orderStatus || o.status)?.toLowerCase()),
      );
    return allOrders;
  }, [allOrders, orderFilter]);

  // Dashboard counts
  const dashboardCounts = useMemo(() => {
    if (!allOrders) return { activeRentals: 0, upcomingReturns: 0, purchaseOrders: 0 };
    return {
      activeRentals: 0,
      upcomingReturns: 0,
      purchaseOrders: allOrders.length,
    };
  }, [allOrders]);

  const orderItems = useMemo(() => {
    const list = [];
    filteredOrders.forEach((order) => {
      order.items?.forEach((item, itemIdx) => {
        list.push({ order, item, itemIdx });
      });
    });
    return list;
  }, [filteredOrders]);

  const selectedOrder = useMemo(() => {
    return allOrders?.find((o) => (o._id || o.id) === selectedOrderId);
  }, [allOrders, selectedOrderId]);

  const selectedItem = useMemo(() => {
    if (!selectedOrder) return null;
    // For normalized rentals (and any single-item order), fall back to items[0]
    return selectedOrder.items?.[selectedOrderItemIndex] || selectedOrder.items?.[0] || null;
  }, [selectedOrder, selectedOrderItemIndex]);

  useEffect(() => {
    if (selectedOrderId && allOrders && !selectedOrder) {
      setSelectedOrderId(null);
    }
  }, [allOrders, selectedOrderId, selectedOrder]);

  // Avatar Upload
  const handleAvatarClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleAvatarChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file format');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image file size should not exceed 2MB');
        return;
      }

      const formData = new FormData();
      formData.append('avatar', file);

      setIsUploadingAvatar(true);
      const toastId = toast.loading('Uploading secure avatar image...');
      try {
        const res = await userService.uploadAvatar(formData);
        if (res.success) {
          toast.success('Profile avatar updated successfully!', { id: toastId });
          await checkAuth();
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to upload avatar', { id: toastId });
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [checkAuth],
  );

  // Address Handlers
  const handleAddressEdit = useCallback((addr) => {
    setEditingAddressId(addr._id || addr.id);
    setIsAddressModalOpen(true);
  }, []);

  const handleDeleteAddress = useCallback(async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Address',
      message: 'Are you sure you want to delete this address?',
      type: 'danger',
    });
    if (!isConfirmed) return;
    const toastId = toast.loading('Removing address...');
    try {
      await userService.deleteAddress(id);
      toast.success('Address deleted successfully!', { id: toastId });
      refetchDashboardData();
    } catch (_err) {
      toast.error('Failed to delete address', { id: toastId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetDefaultAddress = useCallback(async (id) => {
    const toastId = toast.loading('Setting default parameters...');
    try {
      await userService.setDefaultAddress(id);
      toast.success('Default delivery address set!', { id: toastId });
      refetchDashboardData();
    } catch (_err) {
      toast.error('Failed to set default address', { id: toastId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadInvoice = useCallback(
    (orderId) => {
      const targetOrder =
        allOrders?.find((o) => (o._id || o.id) === orderId) ||
        orders?.find((o) => (o._id || o.id) === orderId);
      if (targetOrder) {
        setSelectedInvoiceOrder(targetOrder);
      } else {
        toast.error('Invoice data currently unavailable. Refreshing feed.');
      }
    },
    [allOrders, orders],
  );

  const hasUpdatesForFilter = useCallback(
    (filterFn) => {
      if (!allOrders) return false;
      const now = Date.now();
      let views = {};
      try {
        views = JSON.parse(localStorage.getItem('akula_order_views') || '{}');
      } catch (e) {}

      return allOrders.filter(filterFn).some((order) => {
        if (!order.statusHistory || !order.statusHistory.length) return false;
        const lastUpdate = new Date(
          order.statusHistory[order.statusHistory.length - 1].timestamp,
        ).getTime();
        const lastViewTime = views[order._id || order.id] || 0;
        return now - lastUpdate < 24 * 60 * 60 * 1000 && lastUpdate > lastViewTime;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allOrders, orderViewsUpdated],
  );

  const hasRecentOrderUpdates = useMemo(
    () => hasUpdatesForFilter(() => true),
    [hasUpdatesForFilter],
  );

  const contextValue = useMemo(
    () => ({
      user,
      logout,
      checkAuth,
      openAuthModal,
      wishlistItems,
      removeFromWishlist,
      cartCount,
      cartItems,
      updateQuantity,
      removeItem,
      fileInputRef,
      addressText,
      phoneText,
      whatsappUrl,
      activeTab,
      setActiveTab,
      mobileShowContent,
      setMobileShowContent,

      isUploadingAvatar,

      selectedOrderId,
      setSelectedOrderId,
      selectedOrderItemIndex,
      setSelectedOrderItemIndex,
      isPriceDetailsOpen,
      setIsPriceDetailsOpen,
      orders,
      setOrders,
      addresses,
      setAddresses,
      recentlyViewed,
      setRecentlyViewed,
      isOrdersLoading,
      isAddressesLoading,
      isLoadingRecentlyViewed,
      refetchDashboardData,

      editingAddressId,
      setEditingAddressId,
      addressFormData,
      setAddressFormData,

      isAddressModalOpen,
      setIsAddressModalOpen,
      selectedInvoiceOrder,
      setSelectedInvoiceOrder,
      reviewingProduct,
      setReviewingProduct,

      orderFilter,
      setOrderFilter,
      filteredOrders,
      dashboardCounts,
      orderItems,
      selectedOrder,
      selectedItem,

      handleAvatarClick,
      handleAvatarChange,

      handleAddressEdit,

      handleDeleteAddress,
      handleSetDefaultAddress,
      downloadInvoice,
      hasRecentOrderUpdates,
    }),
    [
      user,
      logout,
      checkAuth,
      openAuthModal,
      wishlistItems,
      removeFromWishlist,
      cartCount,
      cartItems,
      updateQuantity,
      removeItem,
      addressText,
      phoneText,
      whatsappUrl,
      activeTab,
      mobileShowContent,
      isUploadingAvatar,
      selectedOrderId,
      selectedOrderItemIndex,
      isPriceDetailsOpen,
      orders,
      addresses,
      recentlyViewed,
      isOrdersLoading,
      isAddressesLoading,
      isLoadingRecentlyViewed,
      refetchDashboardData,
      editingAddressId,
      addressFormData,
      isAddressModalOpen,
      selectedInvoiceOrder,
      reviewingProduct,
      orderFilter,
      filteredOrders,
      dashboardCounts,
      orderItems,
      selectedOrder,
      selectedItem,
      setOrders,
      setAddresses,
      setRecentlyViewed,
      handleAvatarClick,
      handleAvatarChange,
      handleAddressEdit,
      handleDeleteAddress,
      handleSetDefaultAddress,
      downloadInvoice,
      hasRecentOrderUpdates,
    ],
  );

  return (
    <Profiler id="DashboardContext" onRender={logRenderMetrics}>
      <DashboardContext.Provider value={contextValue}>{children}</DashboardContext.Provider>
    </Profiler>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
