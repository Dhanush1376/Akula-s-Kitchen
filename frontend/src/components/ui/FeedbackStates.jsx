import {
  ArrowRight,
  AlertCircle,
  SearchX,
  FilterX,
  ShoppingBag,
  Heart,
  ReceiptText,
  PackageOpen,
  Inbox,
  MapPin,
  Star,
} from 'lucide-react';

const EMPTY_ICONS = {
  search_off: SearchX,
  filter_list_off: FilterX,
  shopping_bag: ShoppingBag,
  shopping_cart: ShoppingBag,
  favorite: Heart,
  receipt_long: ReceiptText,
  inventory_2: PackageOpen,
  inbox: Inbox,
  location_on: MapPin,
  star: Star,
};
import { m as motion } from 'framer-motion';
import { Button } from './Button';
export function EmptyState({
  title = 'Nothing found',
  description = "We couldn't find what you were looking for.",
  icon = 'search_off',
  actionLabel,
  onAction,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center min-h-[40vh] mt-6 text-center py-16 px-6 max-w-lg mx-auto relative overflow-hidden"
    >
      {(() => {
        const Icon = EMPTY_ICONS[icon] || SearchX;
        return (
          <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-[#f7bb0e] shadow-md flex items-center justify-center mb-6 relative z-10">
            <Icon size={30} strokeWidth={2} className="text-[#283618]" aria-hidden="true" />
          </div>
        );
      })()}

      <h3 className="font-display text-[26px] lg:text-[32px] font-extrabold text-[#283618] mb-3 tracking-tight leading-tight relative z-10">
        {title}
      </h3>

      <p className="text-[#525252] text-[14px] lg:text-[15px] max-w-[320px] mb-8 leading-relaxed relative z-10">
        {description}
      </p>

      {actionLabel && (
        <button
          onClick={onAction}
          className="relative z-10 inline-flex items-center justify-between gap-3.5 pl-6 pr-2 py-1.5 min-h-[46px] rounded-full bg-[#283618] hover:bg-[#1f2b13] text-white font-extrabold text-[12.5px] uppercase tracking-wider transition-all shadow-sm hover:shadow-md active:scale-[0.98] border border-[#283618] group select-none cursor-pointer"
        >
          <span>{actionLabel}</span>
          <span className="w-8 h-8 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
            <ArrowRight
              className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </span>
        </button>
      )}
    </motion.div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = "We're having trouble loading this right now. Please try again later.",
  onRetry,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center text-center py-24 px-6 max-w-lg mx-auto"
    >
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-rose-50/50 border border-rose-100/50 flex items-center justify-center text-rose-500/80 shadow-sm transition-transform duration-500 hover:scale-105">
          <AlertCircle className="text-[42px] font-light" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-rose-500/10 rounded-full blur-xl animate-pulse" />
      </div>
      <h3 className="font-headline-sm text-on-surface mb-3 tracking-tight font-normal text-[20px] lg:text-[24px]">
        {title}
      </h3>
      <p className="font-body-md text-on-surface-variant/60 mb-10 leading-relaxed text-[13px] lg:text-[14px] max-w-sm">
        {description}
      </p>
      {onRetry && (
        <Button
          variant="primary"
          onClick={onRetry}
          className="px-10 rounded-full font-label text-[11px] uppercase tracking-widest font-bold"
        >
          Try Again
        </Button>
      )}
    </motion.div>
  );
}
