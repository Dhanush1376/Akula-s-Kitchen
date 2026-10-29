import React from 'react';
import { AdminField, AdminInput } from '../AdminUIKit';

export function ShopPageEditor({ content, onUpdate }) {
  const sp = content || {};
  const hero = sp.hero || {};

  return (
    <div className="admin-card p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--admin-border-subtle)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[4px] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">storefront</span>
          </div>
          <h2 className="text-[15px] sm:text-[16px] font-semibold text-[var(--admin-text-primary)]">
            Shop Page Controller
          </h2>
        </div>
        <a
          href="/collections"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11.5px] font-bold text-[var(--admin-accent)] hover:underline inline-flex items-center gap-1 shrink-0"
        >
          <span>View Live</span>
          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <AdminField label="Hero Title">
          <AdminInput
            value={hero.title || ''}
            onChange={(e) => onUpdate('shopPage', { hero: { ...hero, title: e.target.value } })}
            placeholder="e.g. Shop"
          />
        </AdminField>

        <AdminField label="Hero Subtitle">
          <AdminInput
            value={hero.subtitle || ''}
            onChange={(e) => onUpdate('shopPage', { hero: { ...hero, subtitle: e.target.value } })}
            placeholder="e.g. Fresh • Tasty • Healthy"
          />
        </AdminField>
      </div>
    </div>
  );
}
