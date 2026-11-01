// ═══════════════════════════════════════════════════════════
// AKULA'S KITCHEN - STOREFRONT FOOTER (SETTINGS-DRIVEN)
// ═══════════════════════════════════════════════════════════
import { Phone, Mail, ArrowUpRight, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../ui/BrandLogo';
import { CONTACT_EMAIL, SOCIAL_INSTAGRAM, SOCIAL_PINTEREST } from '../../constants/brandEnv';
import { useQuery } from '@tanstack/react-query';
import storeSettingsService from '../../services/api/storeSettingsService';
import { policyService } from '../../services/domainServices';

import { useConfig } from '../../context/ConfigContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { BRAND, formatPhoneWithCountryCode, cleanPhoneDigits } from '../../config/brand';
import { usePwa } from '../../context/PwaContext';

export function Footer() {
  const {
    storeName,
    storeNameUpper,
    storeTagline,
    supportEmail: configEmail,
    supportPhone: configPhone,
    alternatePhone: configAltPhone,
    storeSettings,
  } = useConfig();
  const { openInstallDrawer, isStandalone, isInstalled } = usePwa();
  const { data: settings } = useQuery({
    queryKey: ['storeSettings', 'public'],
    queryFn: () => storeSettingsService.getPublicSettings(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: policiesResponse } = useQuery({
    queryKey: ['public-policies'],
    queryFn: () => policyService.getPublicPolicies(),
    staleTime: 5 * 60 * 1000,
  });
  const policies = policiesResponse?.data || [];

  const logoText =
    settings?.general?.storeName ||
    storeSettings?.general?.storeName ||
    storeNameUpper ||
    "AKULA'S KITCHEN";
  const currentYear = new Date().getFullYear();

  const primaryPhone =
    settings?.contact?.phone ||
    settings?.general?.phone ||
    storeSettings?.contact?.phone ||
    storeSettings?.general?.phone ||
    configPhone ||
    BRAND.phone;

  const alternatePhone =
    settings?.contact?.alternatePhone ||
    settings?.general?.alternatePhone ||
    storeSettings?.contact?.alternatePhone ||
    storeSettings?.general?.alternatePhone ||
    configAltPhone ||
    BRAND.alternatePhone;

  const email =
    settings?.contact?.email ||
    settings?.general?.supportEmail ||
    storeSettings?.contact?.email ||
    storeSettings?.general?.supportEmail ||
    configEmail ||
    BRAND.email ||
    CONTACT_EMAIL;

  const instagramLink =
    settings?.contact?.instagram ||
    storeSettings?.contact?.instagram ||
    settings?.social?.instagramUrl ||
    SOCIAL_INSTAGRAM;

  const facebookLink =
    settings?.contact?.facebook ||
    storeSettings?.contact?.facebook ||
    settings?.social?.facebookUrl ||
    '';

  const pinterestLink =
    settings?.contact?.pinterest ||
    storeSettings?.contact?.pinterest ||
    settings?.social?.pinterestUrl ||
    SOCIAL_PINTEREST;

  const youtubeLink =
    settings?.contact?.youtube ||
    storeSettings?.contact?.youtube ||
    settings?.social?.youtubeUrl ||
    '';

  const businessName =
    settings?.legal?.legalCompanyName ||
    settings?.legal?.companyName ||
    settings?.general?.storeName ||
    storeSettings?.legal?.companyName ||
    storeSettings?.general?.storeName ||
    storeName ||
    "Akula's Kitchen";

  // Real site storefront pages
  const exploreLinks = [
    { label: 'Home', href: '/' },
    { label: 'Shop Menu', href: '/menu' },
    { label: 'All Products', href: '/shop' },
    { label: 'Special Today', href: '/' },
  ];

  const quickLinks = [
    { label: 'Customer Support', href: '/contact' },
    { label: 'Track Order', href: '/track-order' },
    { label: 'My Orders', href: '/dashboard/orders' },
    { label: 'Wishlist', href: '/wishlist' },
  ];

  const defaultPolicyLinks = [
    { label: 'Shipping Policy', href: '/policy/shipping-policy' },
    { label: 'Terms & Conditions', href: '/policy/terms-and-conditions' },
    { label: 'Refund Policy', href: '/policy/refund-policy' },
    { label: 'Exchange Policy', href: '/policy/exchange-policy' },
    { label: 'Return Policy', href: '/policy/return-policy' },
    { label: 'Cancellation Policy', href: '/policy/cancellation-policy' },
    { label: 'Privacy Policy', href: '/policy/privacy-policy' },
  ];

  // Dynamic policy links generated directly from policy pages database
  const policyLinks =
    policies.length > 0
      ? policies.map((p) => ({ label: p.title, href: `/policy/${p.slug}` }))
      : defaultPolicyLinks;

  const isMobile = useMediaQuery('(max-width: 767px)');

  return (
    <footer className="w-full bg-[#1b2510] text-white border-t border-[#283618] relative overflow-hidden">
      {/* Subtle decorative background gradient */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[350px] bg-[#f7bb0e]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Main container */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-5 sm:pt-9 lg:pt-12 pb-[calc(var(--bottom-nav-height,65px)+var(--safe-area-bottom,0px)+34px)] sm:pb-[calc(var(--bottom-nav-height,65px)+var(--safe-area-bottom,0px)+24px)] lg:pb-12 relative z-10">
        {/* Navigation & Brand Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-12 pb-5 sm:pb-8 lg:pb-12 border-b border-white/10">
          {/* Brand Info Column */}
          <div className="lg:col-span-4 flex flex-col items-start gap-2 sm:gap-4">
            <div className="w-full flex items-center justify-between gap-3">
              <Link to="/" className="inline-flex items-center gap-2.5 sm:gap-3.5 group shrink-0">
                <BrandLogo
                  size={isMobile ? '36px' : '50px'}
                  className="drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
                  variant="default"
                />
                <div className="flex flex-col">
                  <span className="font-extrabold text-[15px] sm:text-[17px] tracking-tight text-white group-hover:text-[#f7bb0e] transition-colors leading-tight">
                    {logoText}
                  </span>
                  <span className="text-[9.5px] sm:text-[10px] text-white/60 tracking-wider uppercase font-semibold">
                    Fresh · Tasty · Healthy
                  </span>
                </div>
              </Link>

              {/* Compact Install App Button aligned at the End */}
              {!isStandalone && !isInstalled && (
                <button
                  type="button"
                  onClick={openInstallDrawer}
                  className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-[#F7BB0E] text-neutral-200 hover:text-black border border-white/15 hover:border-[#F7BB0E] text-[11px] font-bold transition-all duration-200 cursor-pointer shadow-xs shrink-0 ml-auto"
                >
                  <Smartphone
                    size={12}
                    className="text-[#F7BB0E] group-hover:text-black transition-colors shrink-0"
                  />
                  <span>Install App</span>
                </button>
              )}
            </div>

            <p className="text-[11.5px] sm:text-[13px] text-neutral-300 leading-snug sm:leading-relaxed max-w-sm font-normal line-clamp-2 sm:line-clamp-none">
              {settings?.general?.tagline ||
                storeSettings?.general?.tagline ||
                storeTagline ||
                'Authentic homemade delicacies, freshly prepared daily with pure traditional ingredients.'}
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-2 pt-0.5 sm:pt-1">
              {instagramLink && (
                <a
                  aria-label="Follow on Instagram"
                  href={instagramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/[0.06] hover:bg-[#f7bb0e] hover:text-[#1b2510] text-neutral-200 border border-white/10 flex items-center justify-center transition-all duration-200 shadow-sm"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="sm:w-[17px] sm:h-[17px]"
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </a>
              )}
              {facebookLink && (
                <a
                  aria-label="Follow on Facebook"
                  href={facebookLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/[0.06] hover:bg-[#f7bb0e] hover:text-[#1b2510] text-neutral-200 border border-white/10 flex items-center justify-center transition-all duration-200 shadow-sm"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="sm:w-[16px] sm:h-[16px]"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              )}
              {pinterestLink && (
                <a
                  aria-label="Follow on Pinterest"
                  href={pinterestLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/[0.06] hover:bg-[#f7bb0e] hover:text-[#1b2510] text-neutral-200 border border-white/10 flex items-center justify-center transition-all duration-200 shadow-sm"
                >
                  <span className="font-bold text-[12px] sm:text-[14px]">P</span>
                </a>
              )}
              {youtubeLink && (
                <a
                  aria-label="Follow on YouTube"
                  href={youtubeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/[0.06] hover:bg-[#f7bb0e] hover:text-[#1b2510] text-neutral-200 border border-white/10 flex items-center justify-center transition-all duration-200 shadow-sm"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="sm:w-[16px] sm:h-[16px]"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Explore Column */}
            <div>
              <h3 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#f7bb0e] mb-1.5 sm:mb-4">
                Explore
              </h3>
              <ul className="space-y-1 sm:space-y-2.5">
                {exploreLinks.map((link, idx) => (
                  <li key={idx}>
                    <Link
                      to={link.href || '#'}
                      className="text-[11.5px] sm:text-[13px] text-neutral-300 hover:text-white transition-colors flex items-center gap-1 group font-medium"
                    >
                      <span>{link.label}</span>
                      <ArrowUpRight
                        size={11}
                        className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#f7bb0e]"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Links Column */}
            <div>
              <h3 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#f7bb0e] mb-1.5 sm:mb-4">
                Pages & Help
              </h3>
              <ul className="space-y-1 sm:space-y-2.5">
                {quickLinks.map((link, idx) => (
                  <li key={idx}>
                    <Link
                      to={link.href || '#'}
                      className="text-[11.5px] sm:text-[13px] text-neutral-300 hover:text-white transition-colors flex items-center gap-1 group font-medium"
                    >
                      <span>{link.label}</span>
                      <ArrowUpRight
                        size={11}
                        className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#f7bb0e]"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Direct Contact Column */}
            <div className="col-span-2 sm:col-span-1 pt-0.5 sm:pt-0">
              <h3 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#f7bb0e] mb-1.5 sm:mb-4">
                Help & Contact
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 sm:flex-col sm:space-y-2.5">
                {primaryPhone && (
                  <a
                    href={`tel:${cleanPhoneDigits(primaryPhone)}`}
                    className="flex items-center gap-1.5 sm:gap-2.5 text-[11.5px] sm:text-[13px] text-neutral-300 hover:text-white transition-colors group font-medium"
                  >
                    <div className="w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 text-[#f7bb0e]">
                      <Phone size={11} className="sm:hidden" strokeWidth={2.2} />
                      <Phone size={13} className="hidden sm:block" strokeWidth={2.2} />
                    </div>
                    <span className="truncate">{formatPhoneWithCountryCode(primaryPhone)}</span>
                  </a>
                )}
                {alternatePhone &&
                  formatPhoneWithCountryCode(alternatePhone) !==
                    formatPhoneWithCountryCode(primaryPhone) && (
                    <a
                      href={`tel:${cleanPhoneDigits(alternatePhone)}`}
                      className="flex items-center gap-1.5 sm:gap-2.5 text-[11.5px] sm:text-[13px] text-neutral-300 hover:text-white transition-colors group font-medium"
                      title="Alternate support number"
                    >
                      <div className="w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 text-[#f7bb0e]">
                        <Phone size={11} className="sm:hidden" strokeWidth={2.2} />
                        <Phone size={13} className="hidden sm:block" strokeWidth={2.2} />
                      </div>
                      <span className="truncate">{formatPhoneWithCountryCode(alternatePhone)}</span>
                    </a>
                  )}
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-1.5 sm:gap-2.5 text-[11.5px] sm:text-[13px] text-neutral-300 hover:text-white transition-colors group font-medium"
                  >
                    <div className="w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 text-[#f7bb0e]">
                      <Mail size={11} className="sm:hidden" strokeWidth={2.2} />
                      <Mail size={13} className="hidden sm:block" strokeWidth={2.2} />
                    </div>
                    <span className="truncate">{email}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legal & Policies Row */}
        <div className="pt-3.5 sm:pt-6 lg:pt-8 flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4 text-[10.5px] sm:text-[12px] text-neutral-400">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2 text-center md:text-left">
            <span>{`© ${currentYear} ${businessName}. All rights reserved.`}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-3 sm:gap-x-5 gap-y-1">
            {policyLinks.map((link, idx) => (
              <Link
                key={idx}
                to={link.href || '#'}
                className="hover:text-neutral-200 transition-colors text-neutral-400 font-medium whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
