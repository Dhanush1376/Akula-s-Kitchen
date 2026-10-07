import { ArrowRight, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import './wishlistEmpty.css';

/**
 * Message shown when the wishlist has nothing saved. The banana leaf above it is
 * rendered by the page (see WishlistLeaf), so it stays in place once items are added.
 */
export function WishlistEmptyState() {
  return (
    <div className="wl-empty">
      {/* Message */}
      <div className="wl-empty__content">
        <div className="mb-4 text-[#283618]" aria-hidden="true">
          <Heart size={38} strokeWidth={1.8} className="text-[#283618]" />
        </div>
        <h2 className="wl-empty__title">Your wishlist is empty</h2>
        <p className="wl-empty__text">
          Explore our batters, fresh podis, and pickles and save your favourites for later.
        </p>
        <Link
          to="/collections"
          className="inline-flex items-center gap-3.5 bg-[#283618] hover:bg-[#1f2b13] text-white pl-6 pr-2 py-1.5 min-h-[48px] rounded-full shadow-md hover:shadow-lg transition-all duration-200 group select-none cursor-pointer active:scale-98"
          style={{ fontFamily: 'var(--font-display, inherit)' }}
        >
          <span className="font-extrabold text-[13.5px] sm:text-[14px] tracking-wide text-white">
            Explore Collections
          </span>
          <span className="w-[34px] h-[34px] rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
            <ArrowRight
              className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </span>
        </Link>
      </div>
    </div>
  );
}
