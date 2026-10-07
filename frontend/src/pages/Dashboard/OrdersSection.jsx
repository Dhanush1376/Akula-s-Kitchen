import { ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { OrderCard } from '../../components/dashboard/OrderCard';
import { OrderDetail } from '../../components/dashboard/OrderDetail';
import { OrdersListSkeleton } from '../../components/ui';

export function OrdersSection() {
  const { selectedOrderId, isOrdersLoading, filteredOrders, setOrderFilter } = useDashboard();

  useEffect(() => {
    // Default to all orders when accessing the orders route
    setOrderFilter('PURCHASE');
  }, [setOrderFilter]);

  const ordersList = filteredOrders || [];

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
                {ordersList.length}
              </span>
            </div>
          </div>

          {/* Orders List */}
          {isOrdersLoading ? (
            <OrdersListSkeleton rows={2} />
          ) : (
            <motion.div layout className="space-y-3">
              <AnimatePresence>
                {ordersList.map((order, idx) => (
                  <OrderCard key={order._id || order.id || idx} order={order} idx={idx} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Empty State */}
          {ordersList.length === 0 && !isOrdersLoading && (
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
                className="inline-flex items-center justify-between gap-3.5 pl-6 pr-2 py-1.5 min-h-[46px] rounded-full bg-[#283618] hover:bg-[#1f2b13] text-white font-extrabold text-[12.5px] uppercase tracking-wider transition-all shadow-sm hover:shadow-md active:scale-[0.98] border border-[#283618] group select-none cursor-pointer"
              >
                <span>Browse Delicacies</span>
                <span className="w-8 h-8 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
                  <ArrowRight
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                </span>
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
