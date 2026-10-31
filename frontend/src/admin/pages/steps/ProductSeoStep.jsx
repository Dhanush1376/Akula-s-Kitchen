import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AdminToggle } from '../../components/AdminUIKit';
import { seoService } from '../../../services/domainServices';

/** Admin-overridable SEO fields; anything not customised is generated server-side. */
export const SEO_OVERRIDABLE_FIELDS = [
  'seoTitle',
  'seoDescription',
  'seoFocusKeyword',
  'seoKeywords',
  'seoOgTitle',
  'seoOgDescription',
  'seoOgImage',
  'seoImageAlt',
];

const LIMITS = {
  seoTitle: 60,
  seoDescription: 160,
  seoImageAlt: 125,
  seoOgTitle: 70,
  seoOgDescription: 200,
};
const DESCRIPTION_MIN = 70;

const labelCls =
  'text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block';
const inputCls =
  'w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-[4px] px-3 h-9 text-[12.5px] outline-none transition-all text-[var(--admin-text-primary)]';
const areaCls =
  'w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-[4px] p-3 text-[12.5px] outline-none transition-all resize-none text-[var(--admin-text-primary)]';

const slugify = (value = '') =>
  value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const asText = (v) => (Array.isArray(v) ? v.join(', ') : v || '');

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Counter({ value, max, min }) {
  const len = (value || '').length;
  const tone =
    len > max || (min && len > 0 && len < min)
      ? 'text-[var(--admin-danger,#d93025)]'
      : 'text-[var(--admin-text-tertiary)]';
  return (
    <span className={`text-[10.5px] font-semibold tabular-nums ${tone}`}>
      {len}/{max}
    </span>
  );
}

function ModeBadge({ custom, onReset }) {
  return custom ? (
    <button
      type="button"
      onClick={onReset}
      className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-accent)] hover:underline"
      title="Discard the custom value and generate it automatically"
    >
      Custom · Reset to auto
    </button>
  ) : (
    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
      Auto
    </span>
  );
}

export function ProductSeoStep({ formData, setFormData }) {
  const productId = formData._id || formData.id;
  const overrides = useMemo(() => formData.seoOverrides || [], [formData.seoOverrides]);
  const isCustom = (field) => overrides.includes(field);

  // ── Live server preview (exactly what the storefront will emit) ──
  const draft = useMemo(
    () => ({
      title: formData.title,
      description: formData.description,
      price: Number(formData.price) || 0,
      stock: formData.stock === '' ? 999999 : Number(formData.stock),
      isActive: formData.isActive !== false,
      optionGroups: formData.optionGroups,
      tags:
        typeof formData.tags === 'string'
          ? formData.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : formData.tags,
      imageSrc: formData.imageSrc || formData.images?.[0],
      images: formData.images,
      slug: formData.slug || slugify(formData.title),
      categoryName: formData.primaryCategory || formData.category,
      sku: formData.sku,
      seoIndexable: formData.seoIndexable !== false,
    }),
    [formData],
  );
  const debouncedDraft = useDebounced(draft, 450);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    if (!debouncedDraft.title) return undefined;
    let active = true;
    seoService
      .previewProduct(debouncedDraft)
      .then((data) => {
        if (!active) return;
        setPreview(data);
        setPreviewError('');
      })
      .catch(() => {
        if (active) setPreviewError('Live preview unavailable (backend offline).');
      });
    return () => {
      active = false;
    };
  }, [debouncedDraft]);

  const generated = preview?.generated || {};
  const valueOf = (field) => (isCustom(field) ? asText(formData[field]) : asText(generated[field]));

  const setField = (field, value) =>
    setFormData((prev) => {
      const current = prev.seoOverrides || [];
      return {
        ...prev,
        [field]: value,
        seoOverrides: current.includes(field) ? current : [...current, field],
      };
    });
  const resetField = (field) =>
    setFormData((prev) => ({
      ...prev,
      [field]: '',
      seoOverrides: (prev.seoOverrides || []).filter((f) => f !== field),
    }));

  // ── Slug availability ──
  const slugValue = formData.slug || slugify(formData.title);
  const debouncedSlug = useDebounced(slugValue, 500);
  const [slugStatus, setSlugStatus] = useState(null);
  const lastChecked = useRef('');

  useEffect(() => {
    if (!debouncedSlug || lastChecked.current === `${debouncedSlug}:${productId}`) return undefined;
    let active = true;
    lastChecked.current = `${debouncedSlug}:${productId}`;
    seoService
      .checkSlug(debouncedSlug, productId)
      .then((res) => {
        if (!active) return;
        setSlugStatus(res);
        const error = !res?.valid
          ? 'URL slug is invalid'
          : !res.available
            ? `URL slug "${res.slug}" is already used`
            : '';
        setFormData((prev) =>
          prev._seoSlugError === error ? prev : { ...prev, _seoSlugError: error },
        );
      })
      .catch(() => {
        if (active) setSlugStatus(null);
      });
    return () => {
      active = false;
    };
  }, [debouncedSlug, productId, setFormData]);

  const originalSlug = useRef(formData.slug);
  const slugChangedOnEdit = Boolean(
    productId && originalSlug.current && slugValue !== originalSlug.current,
  );

  // ── Derived values for previews and warnings ──
  const title = valueOf('seoTitle');
  const description = valueOf('seoDescription');
  const focus = valueOf('seoFocusKeyword').toLowerCase();
  const ogImage = valueOf('seoOgImage') || preview?.resolved?.seoOgImage || '';
  const indexable = formData.seoIndexable !== false;
  const ld = preview?.jsonLd;
  const offers = ld?.hasVariant
    ? ld.hasVariant.map((v) => v.offers)
    : ld?.offers
      ? [ld.offers]
      : [];
  const prices = offers.map((o) => Number(o.price)).filter((n) => !Number.isNaN(n));
  const inStock = offers.some((o) => /InStock$/.test(o.availability));

  const warnings = [];
  if (!formData.description || formData.description.trim().length < 40)
    warnings.push('Product description is short; search snippets are built from it.');
  if (!formData.imageSrc && !formData.images?.length)
    warnings.push('No product image: no image in search or social previews.');
  if (title.length > LIMITS.seoTitle)
    warnings.push(`SEO title is longer than ${LIMITS.seoTitle} characters and may be cut off.`);
  if (description.length > LIMITS.seoDescription)
    warnings.push(`Meta description is longer than ${LIMITS.seoDescription} characters.`);
  if (description && description.length < DESCRIPTION_MIN)
    warnings.push(`Meta description is shorter than ${DESCRIPTION_MIN} characters.`);
  if (focus && !title.toLowerCase().includes(focus.split(' ')[0]))
    warnings.push('The focus keyword does not appear in the SEO title.');
  if (!indexable)
    warnings.push(
      'Search indexing is off: this product will be noindex and left out of the sitemap.',
    );
  if (formData.isActive === false)
    warnings.push('Product is a draft: it is not public, so it cannot be indexed yet.');
  if (formData._seoSlugError) warnings.push(formData._seoSlugError);

  const host = 'akulas.kitchen';

  const renderTextField = (field, label, { area = false, rows = 2, placeholder } = {}) => (
    <div>
      <div className="flex justify-between items-center mb-1.5 gap-2">
        <label htmlFor={`seo-${field}`} className={labelCls}>
          {label}
        </label>
        <div className="flex items-center gap-3">
          {LIMITS[field] && (
            <Counter
              value={valueOf(field)}
              max={LIMITS[field]}
              min={field === 'seoDescription' ? DESCRIPTION_MIN : 0}
            />
          )}
          <ModeBadge custom={isCustom(field)} onReset={() => resetField(field)} />
        </div>
      </div>
      {area ? (
        <textarea
          id={`seo-${field}`}
          rows={rows}
          value={valueOf(field)}
          placeholder={placeholder}
          onChange={(e) => setField(field, e.target.value)}
          className={areaCls}
        />
      ) : (
        <input
          id={`seo-${field}`}
          type="text"
          value={valueOf(field)}
          placeholder={placeholder}
          onChange={(e) => setField(field, e.target.value)}
          className={inputCls}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">SEO & Search</h2>
        <p className="text-[11px] text-[var(--admin-text-secondary)]">
          Every field is generated from the product automatically and kept in sync with title,
          description, price and image changes. Edit a field to customise it; custom values are kept
          until you reset them.
        </p>
        {previewError && (
          <p className="text-[11px] mt-1 text-[var(--admin-danger,#d93025)]">{previewError}</p>
        )}
      </div>

      {/* Google search preview */}
      <div className="p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] shadow-xs space-y-1 text-left font-sans">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] mb-2">
          Google search preview
        </p>
        <div className="flex items-center gap-1.5 text-[12px] text-[#202124]">
          <span>{host}</span>
          <span className="text-[#5f6368]">› product › {slugValue || 'product-name'}</span>
        </div>
        <h4 className="text-[#1a0dab] text-[18px] leading-snug font-normal truncate">
          {title || 'SEO title'}
        </h4>
        <p className="text-[#4d5156] text-[13px] leading-relaxed line-clamp-2">
          {description || 'Meta description'}
        </p>
        {prices.length > 0 && (
          <p className="text-[12px] text-[#4d5156]">
            {prices.length > 1
              ? `₹${Math.min(...prices)} – ₹${Math.max(...prices)}`
              : `₹${prices[0]}`}
            {' · '}
            <span className={inStock ? 'text-[#188038]' : 'text-[#d93025]'}>
              {inStock ? 'In stock' : 'Out of stock'}
            </span>
          </p>
        )}
      </div>

      {warnings.length > 0 && (
        <ul className="p-3 rounded-[4px] border border-amber-300 bg-amber-50 text-[11.5px] text-amber-900 space-y-1 list-disc pl-6">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-4">
        {renderTextField('seoTitle', 'SEO title')}
        {renderTextField('seoDescription', 'Meta description', { area: true, rows: 3 })}

        {/* Slug */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="seo-slug" className={labelCls}>
              URL slug
            </label>
            {slugStatus && (
              <span
                className={`text-[10.5px] font-semibold ${
                  slugStatus.available ? 'text-[#188038]' : 'text-[var(--admin-danger,#d93025)]'
                }`}
              >
                {slugStatus.available
                  ? 'Available'
                  : slugStatus.valid
                    ? 'Already in use'
                    : 'Invalid'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[var(--admin-text-tertiary)] whitespace-nowrap">
              /product/
            </span>
            <input
              id="seo-slug"
              type="text"
              value={slugValue}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, slug: slugify(prev.title) }))}
              className="h-9 px-3 shrink-0 rounded-[4px] border border-[var(--admin-border)] text-[11px] font-bold text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-subtle)]"
            >
              From title
            </button>
          </div>
          {slugStatus && !slugStatus.available && slugStatus.suggestion && (
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, slug: slugStatus.suggestion }))}
              className="mt-1.5 text-[11px] font-semibold text-[var(--admin-accent)] hover:underline"
            >
              Use “{slugStatus.suggestion}”
            </button>
          )}
          {slugChangedOnEdit && (
            <p className="mt-1.5 text-[11px] text-[var(--admin-text-secondary)]">
              The old URL /product/{originalSlug.current} will permanently redirect to the new one.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {renderTextField('seoFocusKeyword', 'Focus keyword')}
          {renderTextField('seoKeywords', 'Secondary keywords (comma separated)')}
        </div>
        {renderTextField('seoImageAlt', 'Primary image alt text')}

        <div className="p-3.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] flex items-center justify-between gap-4">
          <div>
            <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
              Allow search indexing
            </p>
            <p className="text-[11px] text-[var(--admin-text-secondary)]">
              Off = noindex and excluded from the sitemap and Merchant feed.
            </p>
          </div>
          <AdminToggle
            checked={indexable}
            onChange={() => setFormData((prev) => ({ ...prev, seoIndexable: !indexable }))}
          />
        </div>
      </div>

      {/* Social sharing */}
      <div className="space-y-4 pt-2 border-t border-[var(--admin-border)]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] pt-3">
          Social sharing (WhatsApp, Facebook, X)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_260px] gap-4 items-start">
          <div className="space-y-4">
            {renderTextField('seoOgTitle', 'Share title')}
            {renderTextField('seoOgDescription', 'Share description', { area: true, rows: 2 })}
            {renderTextField('seoOgImage', 'Share image URL (1200×630 recommended)')}
          </div>
          <div className="border border-[var(--admin-border)] rounded-[6px] overflow-hidden bg-[var(--admin-surface)]">
            <div className="aspect-[1200/630] bg-[var(--admin-bg-subtle)]">
              {ogImage ? (
                <img src={ogImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[11px] text-[var(--admin-text-tertiary)]">
                  No image
                </div>
              )}
            </div>
            <div className="p-2.5 space-y-0.5">
              <p className="text-[10px] uppercase text-[var(--admin-text-tertiary)]">{host}</p>
              <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)] line-clamp-1">
                {valueOf('seoOgTitle') || title}
              </p>
              <p className="text-[11px] text-[var(--admin-text-secondary)] line-clamp-2">
                {valueOf('seoOgDescription') || description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced */}
      <details className="pt-2 border-t border-[var(--admin-border)]">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] pt-3">
          Advanced
        </summary>
        <div className="space-y-4 pt-4">
          <div>
            <label htmlFor="seo-content" className={`${labelCls} mb-1.5`}>
              SEO content (shown on the product page as “About this product”)
            </label>
            <textarea
              id="seo-content"
              rows={4}
              value={formData.seoContent || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, seoContent: e.target.value }))}
              placeholder="Optional. Only write facts that are true for this product."
              className={areaCls}
            />
          </div>
          <div>
            <label htmlFor="seo-canonical" className={`${labelCls} mb-1.5`}>
              Canonical URL override
            </label>
            <input
              id="seo-canonical"
              type="text"
              value={formData.seoCanonicalUrl || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, seoCanonicalUrl: e.target.value }))
              }
              placeholder={`Leave empty to use https://${host}/product/${slugValue}`}
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-[var(--admin-text-secondary)]">
              Only same-site URLs are accepted. Leave empty unless this product duplicates another.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}
