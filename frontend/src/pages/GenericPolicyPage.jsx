import { useEffect, useMemo, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { PolicySidebar, MobilePolicyNav } from '../components/layout/PolicySidebar';
import { SEO } from '../components/seo/SEO';
import { Skeleton } from '../components/ui';
import { policyService } from '../services/domainServices';
import { createSafeHtml } from '../utils/security/sanitize';
import { useConfig } from '../context/ConfigContext';
import { getDefaultPolicy, getPolicyMeta } from '../constants/defaultPolicies';
import { prefersReducedMotion, windBreeze, windGust } from '../components/effects/FallingLeaves';
import '../styles/policy.css';

export function GenericPolicyPage({ slug: propSlug, defaultTitle }) {
  const { storeName } = useConfig();
  const leafRef = useRef(null);
  const leafShadowRef = useRef(null);

  // The leaf drifts in a breeze, like the leaves elsewhere on the site
  useEffect(() => {
    const breeze = windBreeze(leafRef.current, { strength: 0.8 });
    return () => breeze?.cancel();
  }, []);

  // Now and then a gust of wind catches it: once just after it slides in, then every
  // 9-13 seconds while it's on screen, and whenever the visitor scrolls past it
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const leaf = leafRef.current;
    let timer;
    let lastY = window.scrollY;
    const onScreen = () => {
      const r = leaf?.getBoundingClientRect();
      return Boolean(r?.width) && r.bottom > 0 && r.top < window.innerHeight;
    };
    const gust = (direction) =>
      onScreen() && windGust(leaf, { direction, strength: 0.9, shadow: leafShadowRef.current });
    const schedule = (delay) => {
      timer = window.setTimeout(() => {
        gust(Math.random() < 0.5 ? -1 : 1);
        schedule(9000 + Math.random() * 4000);
      }, delay);
    };
    schedule(2000);
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 32) return;
      gust(y > lastY ? 1 : -1);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  const { slug: paramSlug } = useParams();
  const slug = (propSlug || paramSlug || 'shipping-policy').toLowerCase().trim();

  // Fetch policy from backend
  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['policy', slug],
    queryFn: () => policyService.getBySlug(slug),
    retry: 1,
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });

  // Resolve metadata & fallback
  const policyMeta = useMemo(() => getPolicyMeta(slug, defaultTitle), [slug, defaultTitle]);
  const fallbackPolicy = useMemo(() => getDefaultPolicy(slug), [slug]);

  // Construct active policy data
  const rawPolicy = response?.data;
  const policyTitle = rawPolicy?.title || fallbackPolicy?.title || policyMeta.title;
  const policyUpdatedAt =
    rawPolicy?.updatedAt || fallbackPolicy?.updatedAt || new Date().toISOString();

  // Parse sections
  const sections = useMemo(() => {
    if (rawPolicy?.content) {
      try {
        const parsed = JSON.parse(rawPolicy.content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // Handled as raw HTML fallback
      }
    }
    if (fallbackPolicy?.sections) {
      return fallbackPolicy.sections;
    }
    return null;
  }, [rawPolicy, fallbackPolicy]);

  const rawHtmlContent = useMemo(() => {
    if (sections) return null;
    return (
      rawPolicy?.content ||
      fallbackPolicy?.content ||
      '<p>Policy content is currently being updated.</p>'
    );
  }, [sections, rawPolicy, fallbackPolicy]);

  const formattedDate = useMemo(() => {
    try {
      return new Date(policyUpdatedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Recently updated';
    }
  }, [policyUpdatedAt]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="policy-page pt-44 sm:pt-48 lg:pt-52 pb-[calc(var(--bottom-nav-height,65px)+3.5rem)] lg:pb-24 selection:bg-[#f7bb0e]/30 selection:text-[#283618]"
    >
      <SEO
        title={`${policyTitle} | ${storeName || "Akula's Kitchen"}`}
        description={
          policyMeta.description ||
          `Read our official ${policyTitle} at ${storeName || "Akula's Kitchen"}.`
        }
      />

      {/* Decorative Brand Background Ambient Glow */}
      <div className="policy-hero-glow" aria-hidden="true" />

      {/* Banana leaf peeking in from the right edge beside the title, swaying gently */}
      <div className="policy-hero-leaf" aria-hidden="true">
        <div className="policy-hero-leaf__frame">
          <div ref={leafRef} className="policy-hero-leaf__sway">
            <img
              ref={leafShadowRef}
              src="/account/corner-leaf-right.webp"
              alt=""
              className="policy-hero-leaf__shadow"
              draggable="false"
              decoding="async"
            />
            <img
              src="/account/corner-leaf-right.webp"
              alt=""
              className="policy-hero-leaf__img"
              draggable="false"
              decoding="async"
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
        {/* Help Center Header */}
        <header className="mb-8 lg:mb-14">
          {/* Breadcrumb Navigation */}
          <nav
            aria-label="Breadcrumb"
            className="text-[7.5px] sm:text-[8px] uppercase font-medium tracking-[0.14em] text-[#283618]/50 mb-2 flex items-center gap-1.5 select-none"
          >
            <Link to="/" className="hover:text-[#283618] transition-colors">
              Home
            </Link>
            <span className="w-0.5 h-0.5 rounded-full bg-[#283618]/30" />
            <span>Help Center</span>
            <span className="w-0.5 h-0.5 rounded-full bg-[#283618]/30" />
            <span className="text-[#283618]/70 font-semibold truncate max-w-[160px] sm:max-w-none">
              {policyTitle}
            </span>
          </nav>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-[#283618] tracking-tight mb-3">
            {isLoading && !fallbackPolicy ? <Skeleton className="h-12 w-80" /> : policyTitle}
          </h1>

          <p className="text-[9.5px] sm:text-[10px] font-sans font-medium uppercase tracking-[0.16em] text-[#283618]/55 select-none">
            Last updated: {formattedDate}
          </p>
        </header>

        {/* Mobile Navigation Tabs */}
        <MobilePolicyNav />

        {/* Main Grid: Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Desktop Policy Sidebar */}
          <PolicySidebar />

          {/* Policy Main Content */}
          <main className="lg:col-span-8 xl:col-span-8.5 space-y-6">
            {/* Policy Sections Rendering */}
            {isLoading && !fallbackPolicy ? (
              <div className="space-y-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-6 w-1/3 mb-4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-4/5" />
                    {i < 3 && <hr className="border-t border-[#283618]/10 my-8" />}
                  </div>
                ))}
              </div>
            ) : isError && !fallbackPolicy ? (
              <div className="py-12 text-center">
                <p className="text-red-600 font-semibold mb-2">Unable to load policy content.</p>
                <p className="text-sm text-[#4b5563] mb-4">
                  Please check your internet connection or try again.
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="ak-btn ak-btn--dark text-xs"
                >
                  Reload Page
                </button>
              </div>
            ) : sections ? (
              <div className="space-y-8">
                {sections.map((set, index) => {
                  const hasBullets = set.paragraph && set.paragraph.includes('•');

                  return (
                    <div key={index}>
                      <article id={`section-${index + 1}`} className="scroll-mt-48">
                        {/* Section Header */}
                        {set.heading && (
                          <h2 className="text-lg sm:text-xl font-bold font-display text-[#283618] leading-snug mb-3">
                            {set.heading}
                          </h2>
                        )}

                        {/* Section Body */}
                        {hasBullets ? (
                          <div className="text-[13px] sm:text-[14px] text-[#374151] leading-relaxed space-y-2">
                            {set.paragraph
                              .split('\n')
                              .filter((line) => line.trim())
                              .map((line, lIdx) => {
                                if (line.trim().startsWith('•')) {
                                  return (
                                    <div key={lIdx} className="policy-bullet">
                                      {renderClickableText(line.replace(/^•\s*/, ''))}
                                    </div>
                                  );
                                }
                                return (
                                  <p key={lIdx} className="mb-2">
                                    {renderClickableText(line)}
                                  </p>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="text-[13px] sm:text-[14px] text-[#374151] leading-relaxed space-y-3">
                            {set.paragraph
                              ?.split('\n\n')
                              .filter(Boolean)
                              .map((para, pIdx) => (
                                <p key={pIdx}>{renderClickableText(para)}</p>
                              ))}
                          </div>
                        )}

                        {/* Highlight callout note if provided */}
                        {set.highlight && (
                          <div className="policy-note-box mt-4">
                            <Sparkles className="w-4 h-4 text-[#c89611] shrink-0 mt-0.5" />
                            <div className="font-medium">{set.highlight}</div>
                          </div>
                        )}
                      </article>

                      {index < sections.length - 1 && (
                        <hr className="border-t border-[#283618]/10 my-8 sm:my-10" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Fallback for raw HTML content */
              <div
                className="prose prose-sm max-w-none text-[14px] leading-relaxed text-[#374151] [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[#283618] [&_h2]:mt-8 [&_h2:first-child]:mt-0 [&_h2]:mb-3 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-2 [&_hr]:border-[#283618]/10 [&_hr]:my-8"
                dangerouslySetInnerHTML={createSafeHtml(rawHtmlContent)}
              />
            )}
          </main>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Helper to auto-link phone numbers and emails inside text strings
 */
function renderClickableText(text) {
  if (!text) return null;

  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const phoneRegex = /(\+91[\s-]?\d{10}|\+91[\s-]?\d{5}[\s-]?\d{5}|\b\d{10}\b)/g;

  if (!text.match(emailRegex) && !text.match(phoneRegex)) {
    return text;
  }

  const parts = text.split(
    /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+|\+91[\s-]?\d{10}|\+91[\s-]?\d{5}[\s-]?\d{5})/g,
  );

  return parts.map((part, i) => {
    if (part.match(emailRegex)) {
      return (
        <a
          key={i}
          href={`mailto:${part}`}
          className="text-[#283618] font-semibold underline underline-offset-2 decoration-[#f7bb0e] hover:text-[#7a5a00] transition-colors"
        >
          {part}
        </a>
      );
    }
    if (part.match(phoneRegex)) {
      return (
        <a
          key={i}
          href={`tel:${part.replace(/\s+/g, '')}`}
          className="text-[#283618] font-semibold underline underline-offset-2 decoration-[#f7bb0e] hover:text-[#7a5a00] transition-colors"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}
