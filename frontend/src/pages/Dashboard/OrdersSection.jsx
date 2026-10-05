import { ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { OrderCard } from '../../components/dashboard/OrderCard';
import { OrderDetail } from '../../components/dashboard/OrderDetail';
import { OrdersListSkeleton } from '../../components/ui';

export function OrdersSection() {
  const { selectedOrderId, isOrdersLoading, orderItems, setOrderFilter } = useDashboard();

  useEffect(() => {
    // Default to all orders when accessing the orders route
    setOrderFilter('PURCHASE');
  }, [setOrderFilter]);

  return (
    <motion.div
      id="panel-orders"
      role="tabpanel"
      key="tab-orders"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 font-sans text-left"
    >
      {selectedOrderId === null ? (
        /* MAIN LIST VIEW */
        <>
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-neutral-800" strokeWidth={2} />
              <span className="text-[13.5px] sm:text-[14px] font-semibold text-neutral-900 tracking-normal">
                My Orders
              </span>
              <span className="text-[10.5px] font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full ml-1">
                {orderItems.length}
              </span>
            </div>
          </div>

          {/* Orders List */}
          {isOrdersLoading ? (
            <OrdersListSkeleton rows={2} />
          ) : (
            <motion.div layout className="space-y-3">
              <AnimatePresence>
                {orderItems.map(({ order, item, itemIdx }, idx) => (
                  <OrderCard
                    key={`${order._id || idx}-${itemIdx}`}
                    order={order}
                    item={item}
                    itemIdx={itemIdx}
                    idx={idx}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Empty State */}
          {orderItems.length === 0 && !isOrdersLoading && (
            <div className="bg-white border border-neutral-200 rounded-lg p-8 sm:p-10 text-center shadow-sm flex flex-col items-center justify-center min-h-[30vh]">
              <div className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-500 mb-3">
                <ShoppingBag className="w-5 h-5 text-neutral-600" strokeWidth={1.8} />
              </div>

              <h3 className="font-semibold text-[14px] text-neutral-900 mb-1">No Orders Found</h3>
              <p className="text-[12px] text-neutral-500 max-w-[280px] mb-5 leading-normal">
                You don't have any orders in this section yet.
              </p>

              <Link
                to="/collections"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#f7bb0e] hover:bg-[#eab00d] text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-[0.98]"
              >
                <span>Browse Delicacies</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </>
      ) : (
        /* DETAIL VIEW */
        <OrderDetail />
      )}
    </motion.div>
  );
}
