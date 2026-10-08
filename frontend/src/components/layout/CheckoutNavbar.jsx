import { Lock } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { BrandLogo } from '../ui/BrandLogo';
import { useConfig } from '../../context/ConfigContext';

export function CheckoutNavbar() {
  const { storeName } = useConfig();
  const location = useLocation();
  const isCart = location.pathname === '/cart' || location.pathname.startsWith('/cart');

  return (
    <header className="bg-surface-bright border-b border-outline-variant/40 py-2 sm:py-2.5 px-4 sm:px-6 sticky top-0 z-50">
      <div className="max-w-[1240px] mx-auto flex items-center justify-between gap-4">
        {/* Left: Back Button */}
        <div className="flex-1">
          {isCart ? (
            <Link
              to="/collections"
              className="group inline-flex items-center gap-1.5 text-secondary hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">
                keyboard_backspace
              </span>
              <span className="font-label text-[10px] sm:text-[11px] uppercase tracking-widest font-bold">
                Continue Shopping
              </span>
            </Link>
          ) : (
            <Link
              to="/cart"
              className="group inline-flex items-center gap-1.5 text-secondary hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">
                keyboard_backspace
              </span>
              <span className="font-label text-[10px] sm:text-[11px] uppercase tracking-widest font-bold">
                Back to Cart
              </span>
            </Link>
          )}
        </div>

        {/* Center: Branding */}
        <div className="hidden md:block flex-1 text-center">
          <Link to="/" className="inline-block group">
            <BrandLogo size="36px" showSubtitle={false} />
          </Link>
        </div>

        {/* Right: Step Indicator & Badges */}
        <div className="flex-1 flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2 sm:gap-6">
          <div className="flex flex-col items-end">
            <span className="font-label text-[9px] uppercase tracking-widest text-secondary/60">
              {storeName}
            </span>
            <span className="font-body text-[13px] sm:text-[14px] font-bold text-primary">
              Secure Checkout
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold text-secondary border-l border-outline-variant/30 pl-6 h-8">
            <span className="flex items-center gap-1.5">
              <Lock className="text-[16px] text-green-700" strokeWidth={1.5} />
              Secure
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
