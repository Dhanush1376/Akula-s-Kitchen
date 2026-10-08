import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Heart,
  ShoppingCart,
  LogIn,
  User,
  LogOut,
  Menu,
  ShoppingBag,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  LayoutGrid,
} from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { BrandLogo } from '../ui/BrandLogo';
import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { adminInviteService } from '../../services/domainServices';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import { useSearchOverlay } from '../../hooks/useSearchOverlay';
import { SearchTrigger } from '../search/SearchTrigger';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { productService } from '../../services/api/productService';
import api from '../../services/api';
import { lazyWithRetry as lazy } from '../../utils/performance/lazyWithRetry';
import { useConfig } from '../../context/ConfigContext';

const IntelligentSearchOverlay = lazy(() =>
  import('../search/IntelligentSearchOverlay').then((m) => ({
    default: m.IntelligentSearchOverlay,
  })),
);

// Search caching is now handled by useSearchOverlay hook

export function TopNavbar() {
  const { storeSettings, storeNameUpper, categories: configCategories } = useConfig();
  const { navigation } = useWebsiteContent();
  const logoText = navigation?.logo?.text || storeNameUpper || "AKULA'S KITCHEN";
  const logoWords = logoText.split(' ');
  const _firstWord = logoWords[0] || "AKULA'S";
  const _restWords = logoWords.slice(1).join(' ') || 'KITCHEN';

  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [_scrolled, _setScrolled] = useState(false);
  const location = useLocation();
  const { cartCount, setIsCartOpen } = useCart();
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = React.useRef(null);
  const [categories, setCategories] = useState([]);
  const [openAccordion, setOpenAccordion] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .get('/categories/active')
      .then((res) => {
        if (active && res?.data?.success && Array.isArray(res.data.data)) {
          setCategories(res.data.data);
        }
      })
      .catch(() => {
        // Fallback to distinct product categories if /categories/active fails
        productService
          .getCategories()
          .then((res) => {
            if (active && res?.success && res.data) {
              setCategories(res.data);
            }
          })
          .catch(() => {});
      });
    return () => {
      active = false;
    };
  }, []);

  // Track cart additions for bouncing animation
  const prevCartCount = React.useRef(cartCount);
  const [isCartBouncing, setIsCartBouncing] = useState(false);

  useEffect(() => {
    if (cartCount > prevCartCount.current) {
      setIsCartBouncing(true);
      const timer = setTimeout(() => setIsCartBouncing(false), 500);
      prevCartCount.current = cartCount;
      return () => clearTimeout(timer);
    }
    prevCartCount.current = cartCount;
  }, [cartCount]);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isMobileOrTablet = useMediaQuery('(max-width: 1023px)');
  const [_isMoreOpen, setIsMoreOpen] = useState(false);
  const [hasPendingInvite, setHasPendingInvite] = useState(false);

  const { scrollDirection, isAtTop } = useScrollDirection();
  const hideNavbar = !isAtTop && scrollDirection === 'down';

  const searchParams = new URLSearchParams(location.search);
  const searchParam = searchParams.get('search');

  const isHomePage = location.pathname === '/';
  const isShopPage = location.pathname === '/collections';
  const isWishlistPage = location.pathname === '/wishlist';
  const isCartPage = location.pathname === '/cart';

  // Solid brand header everywhere (the editorial hero is not full-bleed)
  const isTransparent = false;
  const showCategoryChips = isHomePage;
  const activeCategory = searchParams.get('category');
  const [chipsScrolled, setChipsScrolled] = useState(false);

  // Publish the real header height so pages can offset content beneath the fixed bar
  const navRef = React.useRef(null);
  useEffect(() => {
    const el = navRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const publish = () =>
      document.documentElement.style.setProperty('--ak-header-h', `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const adminRoles = [
    'owner',
    'super_admin',
    'main_admin',
    'moderator',
    'support_admin',
    'support',
    'order_manager',
    'content_manager',
    'admin',
    'manager',
    'coordinator',
  ];

  useEffect(() => {
    let active = true;
    if (isAuthenticated && user) {
      adminInviteService
        .getMyPendingInvite()
        .then((res) => {
          if (active && res?.success && res?.data) {
            setHasPendingInvite(true);
          } else if (active) {
            setHasPendingInvite(false);
          }
        })
        .catch(() => {});
    } else {
      setHasPendingInvite(false);
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated, user]);

  // ─── INTELLIGENT SEARCH OVERLAYS ───
  const search = useSearchOverlay();

  // Connect inline search bars across pages to the global search overlay
  useEffect(() => {
    const handleOpenGlobalSearch = (e) => {
      const mode = e.detail?.mode || 'text';
      search.handleOpen(mode);
      if (e.detail?.query != null) {
        search.setQuery(e.detail.query);
      }
    };
    window.addEventListener('open-global-search', handleOpenGlobalSearch);
    return () => window.removeEventListener('open-global-search', handleOpenGlobalSearch);
  }, [search]);

  const mobileMenuRef = React.useRef(null);
  const mobileTriggerRef = React.useRef(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isProfileDropdownOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
    setIsProfileDropdownOpen(false);
  }, [location.pathname]);

  useScrollLock(isOpen && isMobile);

  // Handle mobile menu focus trap and escape key
  useEffect(() => {
    const handleGlobalEscape = (e) => {
      if (e.key === 'Escape') {
        setIsMoreOpen(false);
        setIsProfileDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalEscape);

    if (isOpen && isMobile) {
      mobileTriggerRef.current = document.activeElement;

      const focusableElements = mobileMenuRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setIsOpen(false);
        if (e.key === 'Tab' && focusableElements) {
          const first = focusableElements[0];
          const last = focusableElements[focusableElements.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
          } else if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keydown', handleGlobalEscape);
        if (mobileTriggerRef.current) {
          mobileTriggerRef.current.focus();
        }
      };
    }

    return () => {
      window.removeEventListener('keydown', handleGlobalEscape);
    };
  }, [isOpen, isMobile]);

  // Purely dynamic, CMS-driven links. No hardcoded fallbacks.
  const dbLinks =
    navigation?.mainLinks
      ?.filter((link) => link.isVisible)
      .map((link) => ({
        label: link.label,
        href: link.href || link.link,
      })) || [];

  const navLinks = [
    { label: 'Home', href: '/', mobileOnly: true },
    ...dbLinks,
    { label: 'My Orders', href: '/dashboard/orders', mobileOnly: true },
    { label: 'Contact Us', href: '/contact', mobileOnly: true },
  ];

  const isActive = (href) => location.pathname === href;

  // Real, dynamic categories only — no hardcoded fallbacks
  const displayCategories =
    categories && categories.length > 0
      ? categories
      : configCategories && configCategories.length > 0
        ? configCategories
        : [];

  const categoriesScrollRef = React.useRef(null);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  const checkCategoriesScroll = useCallback(() => {
    if (categoriesScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoriesScrollRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  }, []);

  useEffect(() => {
    checkCategoriesScroll();
    const frame = requestAnimationFrame(checkCategoriesScroll);
    const timer = setTimeout(checkCategoriesScroll, 150);
    const el = categoriesScrollRef.current;
    if (!el) {
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
    el.addEventListener('scroll', checkCategoriesScroll, { passive: true });
    window.addEventListener('resize', checkCategoriesScroll);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      el.removeEventListener('scroll', checkCategoriesScroll);
      window.removeEventListener('resize', checkCategoriesScroll);
    };
  }, [checkCategoriesScroll, displayCategories]);

  const handleScrollRight = () => {
    if (categoriesScrollRef.current) {
      categoriesScrollRef.current.scrollBy({ left: 180, behavior: 'smooth' });
      setTimeout(checkCategoriesScroll, 250);
    }
  };

  const handleScrollLeft = () => {
    if (categoriesScrollRef.current) {
      categoriesScrollRef.current.scrollBy({ left: -180, behavior: 'smooth' });
      setTimeout(checkCategoriesScroll, 250);
    }
  };

  return (
    <>
      <nav
        ref={navRef}
        className={`top-navbar fixed top-0 left-0 right-0 w-full transition-transform duration-300 z-50 pointer-events-none ${
          hideNavbar ? '-translate-y-full' : 'translate-y-0'
        }`}
        style={{ zIndex: 'var(--z-sticky)' }}
      >
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 pt-3.5 sm:pt-4 md:pt-5 pb-1.5 sm:pb-2 pointer-events-auto">
          <div className="bg-white/70 backdrop-blur-2xl backdrop-saturate-180 border border-neutral-200 rounded-2xl sm:rounded-3xl px-3.5 py-2.5 sm:px-5 sm:py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_1.5px_rgba(255,255,255,0.95)] flex items-center gap-3 sm:gap-4 md:gap-5">
            {/* Big Circular Logo spanning full height on left */}
            <Link to="/" className="shrink-0 flex items-center self-center group pl-0.5 sm:pl-1">
              <BrandLogo
                size="64px"
                className="drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
                variant="default"
              />
            </Link>

            {/* Right Content: Top Row (Search + Actions) & Bottom Row (SHOP + Categories) */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-2 sm:gap-2.5">
              {/* Top Row: Pill Search Bar + Actions */}
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                {/* Search pill: opens the search panel (the mic opens it in voice mode) */}
                <SearchTrigger onOpen={search.handleOpen} />

                {/* Right Action Group: Profile (Laptop/Desktop), Cart & Menu Circular Buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Laptop/Desktop Profile Button & Dropdown */}
                  <div ref={profileDropdownRef} className="relative hidden md:block">
                    <button
                      type="button"
                      id="profile-trigger-btn"
                      onClick={() => {
                        if (!isAuthenticated) {
                          openAuthModal();
                        } else {
                          setIsProfileDropdownOpen((prev) => !prev);
                        }
                      }}
                      className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full border flex items-center justify-center shadow-2xs transition-all relative cursor-pointer shrink-0 ${
                        isProfileDropdownOpen
                          ? 'bg-[#f7bb0e] text-neutral-950 border-[#f7bb0e] ring-2 ring-[#f7bb0e]/30'
                          : 'bg-white/60 hover:bg-white/85 backdrop-blur-md border-neutral-200 hover:border-neutral-300 text-neutral-800'
                      }`}
                      aria-label="Account Profile"
                      title={
                        isAuthenticated ? user?.name || user?.email || 'My Account' : 'Sign In'
                      }
                    >
                      <User size={19} strokeWidth={1.8} />
                      {isAuthenticated && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                      )}
                    </button>

                    {/* Profile Dropdown Menu */}
                    <AnimatePresence>
                      {isProfileDropdownOpen && isAuthenticated && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.96 }}
                          transition={{ duration: 0.16 }}
                          className="absolute right-0 top-full mt-2 w-64 bg-white/85 backdrop-blur-2xl rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.95)] border border-neutral-200 p-2 z-50 text-left"
                        >
                          {/* User Header */}
                          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 mb-1.5">
                            <p className="text-[13px] font-bold text-neutral-900 truncate">
                              {user?.name || 'My Account'}
                            </p>
                            <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                              {user?.email || user?.phone || ''}
                            </p>
                            {user?.role && adminRoles.includes(user.role) && (
                              <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#f7bb0e]/20 text-[#a37200] text-[10px] font-bold uppercase tracking-wider">
                                {user.role.replace('_', ' ')}
                              </span>
                            )}
                          </div>

                          {/* Navigation Options */}
                          <div className="py-1 space-y-0.5">
                            <Link
                              to="/dashboard?drawer=profile"
                              onClick={() => setIsProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-neutral-700 hover:text-black hover:bg-neutral-100 transition-colors"
                            >
                              <User size={16} strokeWidth={2} className="text-neutral-500" />
                              <span>My Profile</span>
                            </Link>

                            <Link
                              to="/dashboard/orders"
                              onClick={() => setIsProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-neutral-700 hover:text-black hover:bg-neutral-100 transition-colors"
                            >
                              <ShoppingBag size={16} strokeWidth={2} className="text-neutral-500" />
                              <span>My Orders</span>
                            </Link>

                            <Link
                              to="/wishlist"
                              onClick={() => setIsProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-neutral-700 hover:text-black hover:bg-neutral-100 transition-colors"
                            >
                              <Heart size={16} strokeWidth={2} className="text-neutral-500" />
                              <span>Wishlist</span>
                            </Link>

                            {adminRoles.includes(user?.role) && (
                              <Link
                                to="/admin"
                                onClick={() => setIsProfileDropdownOpen(false)}
                                className="flex items-center justify-between px-3 py-2 rounded-lg text-[12.5px] font-bold text-[#b4820a] hover:bg-[#fff9e6] transition-colors"
                              >
                                <span className="flex items-center gap-2.5">
                                  <LayoutGrid size={16} strokeWidth={2} />
                                  <span>Admin Portal</span>
                                </span>
                                {hasPendingInvite && (
                                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                                )}
                              </Link>
                            )}
                          </div>

                          <div className="my-1 border-t border-neutral-100" />

                          {/* Sign Out */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              logout();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <LogOut size={16} strokeWidth={2} />
                            <span>Sign Out</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Cart Circle Button */}
                  <motion.button
                    type="button"
                    id="cart-trigger-btn"
                    onClick={() => navigate('/cart')}
                    animate={
                      isCartBouncing
                        ? { scale: [1, 1.25, 0.9, 1.1, 1], rotate: [0, 10, -10, 5, 0] }
                        : {}
                    }
                    transition={{ duration: 0.5 }}
                    className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full bg-white/60 hover:bg-white/85 backdrop-blur-md border border-neutral-200 hover:border-neutral-300 flex items-center justify-center text-neutral-800 shadow-2xs transition-all relative cursor-pointer shrink-0"
                    aria-label="View Cart"
                  >
                    <ShoppingCart size={19} strokeWidth={1.8} />
                    {cartCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 min-w-[19px] h-[19px] sm:min-w-[20px] sm:h-[20px] px-1 bg-[#f7bb0e] text-neutral-950 text-[10px] sm:text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-2xs"
                      >
                        {cartCount}
                      </motion.span>
                    )}
                  </motion.button>

                  {/* Menu Hamburger Circle Button (Mobile only) */}
                  <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="md:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/60 hover:bg-white/85 backdrop-blur-md border border-neutral-200 hover:border-neutral-300 flex items-center justify-center text-neutral-800 shadow-2xs transition-all cursor-pointer shrink-0"
                    aria-label="Open Navigation Menu"
                    aria-expanded={isOpen}
                  >
                    <Menu size={20} strokeWidth={2.2} />
                  </button>
                </div>
              </div>

              {/* Bottom Row: Horizontal Scrolling Row (SHOP + Categories) */}
              <div className="flex items-center w-full min-w-0 relative rounded-full overflow-hidden isolate">
                {/* Horizontal Scrolling Categories including SHOP */}
                <div
                  ref={categoriesScrollRef}
                  className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1 min-w-0 py-1 px-0.5 sm:px-3 rounded-full"
                  role="tablist"
                  aria-label="Product Categories"
                >
                  {/* SHOP Pill Button (Dark Olive Green / Active Gold) */}
                  <button
                    type="button"
                    onClick={() => navigate('/collections')}
                    className={`rounded-full px-3.5 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1.5 shrink-0 text-[11px] sm:text-[11.5px] font-bold tracking-wider uppercase whitespace-nowrap transition-all shadow-2xs cursor-pointer border-0 outline-none backdrop-blur-xs ${
                      isShopPage && (!activeCategory || activeCategory.toLowerCase() === 'all')
                        ? 'bg-[#f7bb0e] text-neutral-950 shadow-xs'
                        : 'bg-[#283618]/95 hover:bg-[#1f2b13] text-white'
                    }`}
                    aria-label="Shop all products"
                  >
                    <LayoutGrid size={14} strokeWidth={2.2} className="shrink-0" />
                    <span>SHOP</span>
                  </button>

                  {displayCategories.map((cat, i) => {
                    const catName = typeof cat === 'string' ? cat : cat?.name;
                    if (!catName) return null;
                    const isSelected =
                      isShopPage && activeCategory?.toLowerCase() === catName.toLowerCase();
                    return (
                      <button
                        key={`${catName}-${i}`}
                        type="button"
                        onClick={() =>
                          navigate(`/collections?category=${encodeURIComponent(catName)}`)
                        }
                        className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[11px] sm:text-[11.5px] tracking-wider uppercase whitespace-nowrap shadow-2xs transition-all shrink-0 cursor-pointer border-0 outline-none ${
                          isSelected
                            ? 'bg-[#f7bb0e] text-neutral-950 shadow-xs'
                            : 'bg-white/50 hover:bg-white/80 text-neutral-800 hover:text-black border border-white/60 backdrop-blur-xs'
                        }`}
                      >
                        <span>{catName}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Right Scroll Arrow Button (>) */}
                {canScrollRight && (
                  <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-6 pr-0.5 sm:pr-1 bg-gradient-to-l from-white/95 via-white/80 to-transparent pointer-events-none">
                    <button
                      type="button"
                      onClick={handleScrollRight}
                      className="pointer-events-auto w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-white hover:bg-neutral-50 active:scale-95 text-neutral-900 border border-neutral-200/90 shadow-xs flex items-center justify-center transition-all cursor-pointer"
                      aria-label="Scroll categories right"
                      title="Next categories"
                    >
                      <ChevronRight size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                )}

                {/* Left Scroll Arrow Button (<) */}
                {canScrollLeft && (
                  <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-6 pl-0.5 sm:pl-1 bg-gradient-to-r from-white/95 via-white/80 to-transparent pointer-events-none">
                    <button
                      type="button"
                      onClick={handleScrollLeft}
                      className="pointer-events-auto w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-white hover:bg-neutral-50 active:scale-95 text-neutral-900 border border-neutral-200/90 shadow-xs flex items-center justify-center transition-all cursor-pointer"
                      aria-label="Scroll categories left"
                      title="Previous categories"
                    >
                      <ChevronLeft size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Premium Floating Rounded Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[115] lg:hidden"
            />

            {/* Slide-out Floating Card / Drawer Panel */}
            <motion.div
              ref={mobileMenuRef}
              id="mobile-menu-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation Menu"
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260, mass: 0.8 }}
              className="fixed right-3 top-3 bottom-3 sm:right-4 sm:top-4 sm:bottom-4 w-[78%] max-w-[300px] sm:max-w-[320px] h-[calc(100dvh-24px)] sm:h-[calc(100dvh-32px)] bg-white/85 backdrop-blur-2xl z-[120] lg:hidden p-4 sm:p-5 flex flex-col overflow-y-auto overflow-x-hidden shadow-[0_16px_50px_rgba(0,0,0,0.18),inset_0_1px_1px_rgba(255,255,255,0.9)] rounded-3xl border border-neutral-200"
              style={{
                marginTop: 'env(safe-area-inset-top, 0px)',
                marginBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
            >
              {/* Drawer Header */}
              <div className="flex justify-between items-center pb-4 mb-3 border-b border-black/[0.06]">
                <BrandLogo size="44px" />
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-full bg-neutral-100/80 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 hover:text-black transition-all cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>

              {/* Navigation List */}
              <div className="flex-grow flex flex-col justify-start items-start w-full">
                <ul className="relative z-10 flex flex-col items-start w-full divide-y divide-black/[0.06]">
                  {navLinks.map((link, idx) => {
                    const active = isActive(link.href);
                    const isShopLink =
                      link.label.toLowerCase() === 'shop' ||
                      link.label.toLowerCase() === 'collections' ||
                      link.label.toLowerCase() === 'shop by category';
                    const hasSubMenu = isShopLink;
                    const accordionId = isShopLink ? 'shop' : null;
                    const subItems = isShopLink ? displayCategories : [];

                    return (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.04 + idx * 0.04,
                          duration: 0.3,
                        }}
                        className="w-full flex flex-col items-start"
                      >
                        <div className="flex items-center justify-between w-full group py-1">
                          {hasSubMenu ? (
                            <button
                              onClick={() =>
                                setOpenAccordion(openAccordion === accordionId ? null : accordionId)
                              }
                              className={`flex items-center justify-between font-sans uppercase font-bold tracking-wider text-[13px] sm:text-[14px] transition-all duration-200 w-full text-left py-2.5 px-2 rounded-xl hover:bg-neutral-100/70 ${
                                active || openAccordion === accordionId
                                  ? 'text-primary bg-neutral-100/50'
                                  : 'text-neutral-800'
                              }`}
                            >
                              <span>{link.label}</span>
                              <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                                <ChevronDown
                                  size={15}
                                  strokeWidth={2}
                                  className={`transition-transform duration-200 ${
                                    openAccordion === accordionId
                                      ? 'rotate-180 text-black'
                                      : 'text-neutral-500'
                                  }`}
                                />
                              </div>
                            </button>
                          ) : (
                            <Link
                              onClick={() => setIsOpen(false)}
                              className={`flex items-center justify-between font-sans uppercase font-bold tracking-wider text-[13px] sm:text-[14px] transition-all duration-200 w-full text-left py-2.5 px-2 rounded-xl hover:bg-neutral-100/70 ${
                                active
                                  ? 'text-primary bg-[#f7bb0e]/15 font-extrabold'
                                  : 'text-neutral-800'
                              }`}
                              to={link.href}
                            >
                              <span>{link.label}</span>
                            </Link>
                          )}
                        </div>

                        {/* Accordion Content */}
                        {hasSubMenu && (
                          <AnimatePresence>
                            {openAccordion === accordionId && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden w-full flex flex-col items-start space-y-1 pl-3 pr-1 pb-3 pt-1"
                              >
                                {isShopLink && (
                                  <div className="w-full">
                                    <Link
                                      to={link.href}
                                      onClick={() => setIsOpen(false)}
                                      className="font-sans font-medium text-[13px] text-neutral-600 hover:text-black py-1.5 px-2 rounded-lg hover:bg-neutral-100/60 transition-colors block"
                                    >
                                      All Collections
                                    </Link>
                                  </div>
                                )}
                                {subItems.map((cat, i) => {
                                  const categoryName = typeof cat === 'string' ? cat : cat.name;
                                  return (
                                    <div key={i} className="w-full">
                                      <Link
                                        to={`/collections?category=${encodeURIComponent(categoryName)}`}
                                        onClick={() => setIsOpen(false)}
                                        className="font-sans font-medium text-[13px] capitalize text-neutral-600 hover:text-black py-1.5 px-2 rounded-lg hover:bg-neutral-100/60 transition-colors block"
                                      >
                                        {categoryName.toLowerCase()}
                                      </Link>
                                    </div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        )}
                      </motion.li>
                    );
                  })}
                  {isAuthenticated && adminRoles.includes(user?.role) && (
                    <motion.li
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.04 + navLinks.length * 0.04,
                        duration: 0.3,
                      }}
                      className="w-full py-1"
                    >
                      <Link
                        onClick={() => setIsOpen(false)}
                        className="group flex items-center justify-between font-sans uppercase font-bold tracking-wider text-[13px] sm:text-[14px] transition-all duration-200 w-full text-left py-2.5 px-3 rounded-xl bg-neutral-100/80 hover:bg-neutral-200/80 text-neutral-900"
                        to="/admin"
                      >
                        <span>Admin Portal</span>
                        {hasPendingInvite && (
                          <span className="relative w-2 h-2 rounded-full bg-[#ff4d4f] shadow-xs" />
                        )}
                      </Link>
                    </motion.li>
                  )}
                </ul>
              </div>

              {/* Bottom Quick Actions Footer */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="mt-auto w-full pt-4 border-t border-black/[0.06]"
              >
                <div className="flex items-center justify-between w-full px-1">
                  {/* Left: Utilities */}
                  <div className="flex items-center gap-4 sm:gap-6">
                    <Link
                      to="/wishlist"
                      onClick={() => setIsOpen(false)}
                      className="flex flex-col items-center gap-1.5 text-neutral-700 hover:text-black transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-full bg-neutral-100/80 flex items-center justify-center group-hover:bg-neutral-200/80 transition-colors">
                        <Heart size={18} strokeWidth={1.8} />
                      </div>
                      <span className="text-[10px] font-sans font-semibold tracking-wide text-neutral-600 group-hover:text-black">
                        Wishlist
                      </span>
                    </Link>

                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setIsCartOpen(true);
                      }}
                      className="flex flex-col items-center gap-1.5 text-neutral-700 hover:text-black transition-colors group cursor-pointer"
                    >
                      <div className="relative w-9 h-9 rounded-full bg-neutral-100/80 flex items-center justify-center group-hover:bg-neutral-200/80 transition-colors">
                        <ShoppingBag size={18} strokeWidth={1.8} />
                        {cartCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#f7bb0e] text-black text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                            {cartCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-sans font-semibold tracking-wide text-neutral-600 group-hover:text-black">
                        Bag
                      </span>
                    </button>

                    {isAuthenticated && (
                      <Link
                        to="/dashboard"
                        onClick={() => setIsOpen(false)}
                        className="flex flex-col items-center gap-1.5 text-neutral-700 hover:text-black transition-colors group"
                      >
                        <div className="w-9 h-9 rounded-full bg-neutral-100/80 flex items-center justify-center group-hover:bg-neutral-200/80 transition-colors">
                          <User size={18} strokeWidth={1.8} />
                        </div>
                        <span className="text-[10px] font-sans font-semibold tracking-wide text-neutral-600 group-hover:text-black">
                          Profile
                        </span>
                      </Link>
                    )}
                  </div>

                  {/* Right: Auth Action */}
                  <div>
                    {!isAuthenticated ? (
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          openAuthModal();
                        }}
                        className="flex flex-col items-center gap-1.5 text-neutral-700 hover:text-black transition-colors group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-neutral-100/80 flex items-center justify-center group-hover:bg-neutral-200/80 transition-colors">
                          <LogIn size={18} strokeWidth={1.8} />
                        </div>
                        <span className="text-[10px] font-sans font-semibold tracking-wide text-neutral-600 group-hover:text-black">
                          Sign In
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          logout();
                        }}
                        className="flex flex-col items-center gap-1.5 text-neutral-700 hover:text-red-600 transition-colors group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-neutral-100/80 flex items-center justify-center group-hover:bg-red-50 text-neutral-700 group-hover:text-red-600 transition-colors">
                          <LogOut size={18} strokeWidth={1.8} />
                        </div>
                        <span className="text-[10px] font-sans font-semibold tracking-wide text-neutral-600 group-hover:text-red-600">
                          Sign Out
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {search.isOpen && (
        <Suspense fallback={null}>
          <IntelligentSearchOverlay
            isOpen={search.isOpen}
            initialMode={search.initialMode}
            query={search.query}
            setQuery={search.setQuery}
            suggestions={search.suggestions}
            predictedCategories={search.predictedCategories}
            trendingSearches={search.trendingSearches}
            recentSearches={search.recentSearches}
            discoveryData={search.discoveryData}
            onRemoveRecent={search.removeRecentSearch}
            loading={search.loading}
            activeIndex={search.activeIndex}
            setActiveIndex={search.setActiveIndex}
            onClose={search.handleClose}
            onKeyDown={search.handleKeyDown}
            onSelectSuggestion={search.selectSuggestion}
            onExecuteSearch={search.executeSearch}
            onClearRecent={search.clearRecentSearches}
            correctedQuery={search.correctedQuery}
            searchMeta={search.searchMeta}
            searchError={search.searchError}
          />
        </Suspense>
      )}
    </>
  );
}
