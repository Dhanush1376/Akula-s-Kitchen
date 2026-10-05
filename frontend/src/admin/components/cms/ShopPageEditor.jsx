import React from 'react';
import { AdminField, AdminInput, AdminTextarea } from '../AdminUIKit';

export function ShopPageEditor({ content, onUpdate }) {
  const sp = content || {};
  const hero = sp.hero || {};

  return (
    <div className="space-y-8">
      {/* Hero Section Banner */}
      <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <span className="material-symbols-outlined text-[150px]">storefront</span>
        </div>
        <div className="relative z-10 space-y-6">
          <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--admin-text-primary)] tracking-tight block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
            1. Hero Section Setup
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AdminField label="Hero Title" description="The primary main headline of the shop page">
              <AdminInput
                value={hero.title || ''}
                onChange={(e) => onUpdate('shopPage', { hero: { ...hero, title: e.target.value } })}
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                placeholder="e.g. Heritage Collection"
              />
            </AdminField>

            <AdminField label="Hero Subtitle" description="A short tagline or category group text">
              <AdminInput
                value={hero.subtitle || ''}
                onChange={(e) =>
                  onUpdate('shopPage', { hero: { ...hero, subtitle: e.target.value } })
                }
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                placeholder="e.g. Fresh • Tasty • Healthy"
              />
            </AdminField>
          </div>

          <AdminField
            label="Hero Description"
            description="Immersive description paragraph detailing the shop collections"
          >
            <AdminTextarea
              value={hero.description || ''}
              onChange={(e) =>
                onUpdate('shopPage', { hero: { ...hero, description: e.target.value } })
              }
              rows={3}
              className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
              placeholder="Describe your collections here..."
            />
          </AdminField>
        </div>
      </div>
    </div>
  );
}
