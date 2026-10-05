import { Phone, Mail, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../ui/BrandLogo';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import { CONTACT_EMAIL, SOCIAL_INSTAGRAM, SOCIAL_PINTEREST } from '../../constants/brandEnv';
import { useQuery } from '@tanstack/react-query';
import storeSettingsService from '../../services/api/storeSettingsService';
import { policyService } from '../../services/domainServices';

import { useConfig } from '../../context/ConfigContext';
import { BRAND, formatPhoneWithCountryCode, cleanPhoneDigits } from '../../config/brand';

export function Footer() {
  const {
    storeName,
    storeNameUpper,
    storeTagline,
    cin: configCin,
    supportEmail: configEmail,
    supportPhone: configPhone,
    alternatePhone: configAltPhone,
    storeSettings,
  } = useConfig();
  const { contact, footer, navigation } = useWebsiteContent();
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

  const logoText = navigation?.logo?.text || storeNameUpper || "AKULA'S KITCHEN";
  const currentYear = new Date().getFullYear();

  const primaryPhone =
    settings?.general?.phone ||
    settings?.contact?.phone ||
    configPhone ||
    contact?.phone ||
    footer?.phone ||
    BRAND.phone;

  const alternatePhone =
    settings?.general?.alternatePhone ||
    settings?.contact?.alternatePhone ||
    configAltPhone ||
    BRAND.alternatePhone;

  const email =
    settings?.general?.supportEmail ||
    settings?.contact?.email ||
    configEmail ||
    contact?.email ||
    footer?.email ||
    BRAND.email ||
    CONTACT_EMAIL;

  const instagramLink =
    settings?.social?.instagramUrl || footer?.socialLinks?.instagram || SOCIAL_INSTAGRAM;
  const pinterestLink =
    settings?.social?.pinterestUrl || footer?.socialLinks?.pinterest || SOCIAL_PINTEREST;

  const businessName =
    settings?.legal?.legalCompanyName ||
    settings?.legal?.companyName ||
    settings?.general?.storeName ||
    storeName ||
    "Akula's Kitchen";

  // Dynamic CMS Link Mappings
  let exploreLinks =
    footer?.exploreLinks?.length > 0
      ? footer.exploreLinks
      : [
          { label: 'All Collections', href: '/collections' },
          { label: 'Special Today', href: '/' },
        ];

  exploreLinks = exploreLinks.filter((link) => {
    const href = (link?.href || link?.link || '').toLowerCase().trim();
    const label = (link?.label || '').toLowerCase().trim();
    return !href.includes('gallery') && !label.includes('gallery');
  });

  const studioLinks = (
    footer?.studioLinks?.length > 0
      ? footer.studioLinks
      : [
          { label: 'Shop Menu', href: '/collections' },
          { label: 'Customer Support', href: '/contact' },
        ]
  ).filter((link) => {
    const href = (link?.href || link?.link || '').toLowerCase().trim();
    const label = (link?.label || '').toLowerCase().trim();
    return (
      href !== '/about' &&
      !href.includes('/about') &&
      label !== 'our story' &&
      label !== 'about us' &&
      label !== 'about'
    );
  });

  const defaultPolicyLinks = [
    { label: 'Shipping Policy', href: '/policy/shipping-policy' },
    { label: 'Terms & Conditions', href: '/policy/terms-and-conditions' },
    { label: 'Refund Policy', href: '/policy/refund-policy' },
    { label: 'Exchange Policy', href: '/policy/exchange-policy' },
    { label: 'Return Policy', href: '/policy/return-policy' },
  ];

  const policyLinks =
    footer?.policyLinks?.length > 0
      ? footer.policyLinks
      : policies.length > 0
        ? policies.map((p) => ({ label: p.title, href: `/policy/${p.slug}` }))
        : defaultPolicyLinks;

  return (
    <footer className="w-full bg-[#1b2510] text-white border-t border-[#283618] relative overflow-hidden">
      {/* Subtle decorative background gradient */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[350px] bg-[#f7bb0e]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Main container */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-12 pb-[calc(var(--bottom-nav-height,65px)+var(--safe-area-bottom,0px)+36px)] lg:pb-12 relative z-10">
        {/* Navigation & Brand Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pb-12 border-b border-white/10">
          {/* Brand Info Column */}
          <div className="lg:col-span-4 flex flex-col items-start gap-4">
            <Link to="/" className="inline-flex items-center gap-3.5 group">
              <BrandLogo
                size="52px"
                className="drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
                variant="default"
              />
              <div className="flex flex-col">
                <span className="font-extrabold text-[17px] tracking-tight text-white group-hover:text-[#f7bb0e] transition-colors">
                  {logoText}
                </span>
                <span className="text-[10px] text-white/60 tracking-wider uppercase font-semibold">
                  Handcrafted & Pure
                </span>
              </div>
            </Link>

            <p className="text-[13px] text-neutral-300 leading-relaxed max-w-sm font-normal">
              {footer?.description ||
                storeTagline ||
                settings?.general?.tagline ||
                'Authentic homemade delicacies, freshly prepared daily with pure traditional ingredients.'}
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-2.5 pt-1">
              {instagramLink && (
                <a
                  aria-label="Follow on Instagram"
                  href={instagramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-[#f7bb0e] hover:text-[#1b2510] text-neutral-200 border border-white/10 flex items-center justify-center transition-all duration-200 shadow-sm"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </a>
              )}
              {pinterestLink && (
                <a
                  aria-label="Follow on Pinterest"
                  href={pinterestLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-[#f7bb0e] hover:text-[#1b2510] text-neutral-200 border border-white/10 flex items-center justify-center transition-all duration-200 shadow-sm"
                >
                  <span className="font-bold text-[14px]">P</span>
                </a>
              )}
            </div>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Explore Column */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#f7bb0e] mb-4">
                Explore
              </h3>
              <ul className="space-y-2.5">
                {exploreLinks.map((link, idx) => (
                  <li key={idx}>
                    <Link
                      to={link.href || '#'}
                      className="text-[13px] text-neutral-300 hover:text-white transition-colors flex items-center gap-1 group font-medium"
                    >
                      <span>{link.label}</span>
                      <ArrowUpRight
                        size={12}
                        className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#f7bb0e]"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kitchen Column */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#f7bb0e] mb-4">
                Kitchen
              </h3>
              <ul className="space-y-2.5">
                {studioLinks.map((link, idx) => (
                  <li key={idx}>
                    <Link
                      to={link.href || '#'}
                      className="text-[13px] text-neutral-300 hover:text-white transition-colors flex items-center gap-1 group font-medium"
                    >
                      <span>{link.label}</span>
                      <ArrowUpRight
                        size={12}
                        className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#f7bb0e]"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Direct Contact Column */}
            <div className="col-span-2 sm:col-span-1">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#f7bb0e] mb-4">
                Help & Contact
              </h3>
              <div className="space-y-3">
                {primaryPhone && (
                  <a
                    href={`tel:${cleanPhoneDigits(primaryPhone)}`}
                    className="flex items-center gap-2.5 text-[13px] text-neutral-300 hover:text-white transition-colors group font-medium"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 text-[#f7bb0e]">
                      <Phone size={13} strokeWidth={2.2} />
                    </div>
                    <span className="truncate">{formatPhoneWithCountryCode(primaryPhone)}</span>
                  </a>
                )}
                {alternatePhone &&
                  formatPhoneWithCountryCode(alternatePhone) !==
                    formatPhoneWithCountryCode(primaryPhone) && (
                    <a
                      href={`tel:${cleanPhoneDigits(alternatePhone)}`}
                      className="flex items-center gap-2.5 text-[13px] text-neutral-300 hover:text-white transition-colors group font-medium"
                      title="Alternate support number"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 text-[#f7bb0e]">
                        <Phone size={13} strokeWidth={2.2} />
                      </div>
                      <span className="truncate">{formatPhoneWithCountryCode(alternatePhone)}</span>
                    </a>
                  )}
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-2.5 text-[13px] text-neutral-300 hover:text-white transition-colors group font-medium"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 text-[#f7bb0e]">
                      <Mail size={13} strokeWidth={2.2} />
                    </div>
                    <span className="truncate">{email}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legal & Policies Row */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-neutral-400">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              {footer?.copyright?.replace('{year}', currentYear.toString()) ||
                `© ${currentYear} ${businessName}. All rights reserved.`}
            </span>
            {(settings?.legal?.cin || configCin) && (
              <span className="text-neutral-500 font-mono text-[11px]">
                • CIN: {settings?.legal?.cin || configCin}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
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
