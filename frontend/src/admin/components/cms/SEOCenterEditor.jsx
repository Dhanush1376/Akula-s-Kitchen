import React from 'react';
import { AdminField, AdminInput, AdminTextarea } from '../AdminUIKit';

const DEFAULT_TITLE = "Akula's Kitchen | Authentic Flavors & Premium Culinary Experiences";
const DEFAULT_DESC =
  "Authentic flavors, premium quality, and exquisite culinary experiences by Akula's Kitchen.";
const DEFAULT_KEYWORDS =
  "Akula's Kitchen, gourmet, authentic recipes, kitchen, food, catering, culinary";

export function SEOCenterEditor({ content, onUpdate }) {
  const seo = content.seo || {};

  const displayTitle = seo.globalTitle || DEFAULT_TITLE;
  const displayDesc = seo.globalDescription || DEFAULT_DESC;

  return (
    <div className="admin-card p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--admin-border-subtle)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[4px] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">search</span>
          </div>
          <h2 className="text-[15px] sm:text-[16px] font-semibold text-[var(--admin-text-primary)]">
            SEO & Search Meta
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <AdminField label="Default Google Page Title">
          <AdminInput
            value={seo.globalTitle || ''}
            onChange={(e) => onUpdate('seo', { globalTitle: e.target.value })}
            placeholder={DEFAULT_TITLE}
          />
        </AdminField>

        <AdminField label="Search Keywords Tag">
          <AdminInput
            value={seo.globalKeywords || ''}
            onChange={(e) => onUpdate('seo', { globalKeywords: e.target.value })}
            placeholder={DEFAULT_KEYWORDS}
          />
        </AdminField>
      </div>

      <AdminField label="Meta Description Block">
        <AdminTextarea
          value={seo.globalDescription || ''}
          onChange={(e) => onUpdate('seo', { globalDescription: e.target.value })}
          rows={3}
          placeholder={DEFAULT_DESC}
        />
      </AdminField>

      {/* Google Search Live Preview */}
      <div className="pt-3 border-t border-[var(--admin-border-subtle)] space-y-2">
        <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
          Live Search Engine Preview
        </h3>
        <div className="border border-[var(--admin-border)] rounded-[4px] bg-[var(--admin-surface)] p-3.5 sm:p-4 max-w-2xl font-sans shadow-2xs">
          <div className="flex items-center gap-2 mb-1.5 text-[var(--admin-text-secondary)]">
            <div className="w-5 h-5 bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] rounded-full flex items-center justify-center text-[10px] font-bold">
              AK
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[var(--admin-text-tertiary)] truncate">
              <span>https://akulas.kitchen</span>
            </div>
          </div>
          <h4 className="text-[15px] sm:text-[16px] text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer leading-snug line-clamp-1">
            {displayTitle}
          </h4>
          <p className="text-[12px] sm:text-[12.5px] text-[var(--admin-text-secondary)] line-clamp-2 leading-relaxed mt-0.5">
            {displayDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
