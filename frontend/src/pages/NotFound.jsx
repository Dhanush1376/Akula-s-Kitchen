import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SEO } from '../components/seo/SEO';
export function NotFound() {
  return (
    <div className="min-h-[80vh] relative flex flex-col items-center justify-center px-4 overflow-hidden pt-24 lg:pt-32 pb-24 lg:pb-32">
      <SEO
        title="Page Not Found"
        description="The page you are looking for has moved or is no longer available."
        robots="noindex, follow"
      />

      <div className="relative z-10 text-center">
        <h2 className="font-display text-[120px] lg:text-[180px] leading-none text-primary/10 select-none">
          404
        </h2>
        <div className="mt-[-40px] lg:mt-[-60px]">
          <h2 className="font-display text-3xl lg:text-5xl mb-4 text-on-surface">Page Not Found</h2>
          <p className="text-on-surface-variant max-w-md mx-auto mb-10 font-body-md">
            The page you are looking for doesn't exist or has moved.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center justify-between gap-3.5 pl-6 pr-2 py-1.5 min-h-[48px] rounded-full bg-[#283618] hover:bg-[#1f2b13] text-white font-extrabold text-[12.5px] uppercase tracking-wider transition-all shadow-sm hover:shadow-md active:scale-[0.98] border border-[#283618] group select-none min-w-[210px]"
            >
              <span>Return Home</span>
              <span className="w-8 h-8 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              </span>
            </Link>
            <Link
              to="/collections"
              className="inline-flex items-center justify-center px-6 min-h-[48px] rounded-full border border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-900 font-extrabold text-[12.5px] uppercase tracking-wider transition-all active:scale-[0.98] min-w-[210px]"
            >
              Browse Collections
            </Link>
          </div>
        </div>
      </div>

      {/* Quick links for better UX */}
      <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 border-t border-outline-variant/20 pt-10">
        <div className="text-center">
          <h3 className="font-label-sm mb-3">Shop</h3>
          <Link
            to="/collections"
            className="text-on-surface-variant hover:text-primary transition-colors text-sm"
          >
            All Products
          </Link>
        </div>
        <div className="text-center">
          <h3 className="font-label-sm mb-3">Services</h3>
          <Link
            to="/collections"
            className="text-on-surface-variant hover:text-primary transition-colors text-sm"
          >
            Browse Collections
          </Link>
        </div>
        <div className="text-center">
          <h3 className="font-label-sm mb-3">Support</h3>
          <Link
            to="/contact"
            className="text-on-surface-variant hover:text-primary transition-colors text-sm"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
