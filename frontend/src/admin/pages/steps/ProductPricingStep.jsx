import React from 'react';

export function ProductPricingStep({ formData, setFormData }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
          Pricing & Inventory
        </h2>
        <p className="text-[11px] text-[var(--admin-text-secondary)]">
          Define stock and list prices.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px]">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
            Product Price (₹) <span className="text-error">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] text-[13px] font-bold">
              ₹
            </span>
            <input
              type="number"
              required
              min="1"
              inputMode="decimal"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full bg-[var(--admin-surface)] rounded-[4px] pl-7 pr-3 h-9 text-[12.5px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-all"
            />
          </div>
        </div>

        <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px]">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
            Old Striking Price (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)]/50 text-[13px] font-bold">
              ₹
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={formData.oldPrice}
              onChange={(e) => setFormData({ ...formData, oldPrice: e.target.value })}
              placeholder="Optional list price"
              className="w-full bg-[var(--admin-surface)] rounded-[4px] pl-7 pr-3 h-9 text-[12.5px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-all"
            />
          </div>
        </div>

        <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px]">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
            Available Stock <span className="text-error">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] text-[13px] font-bold">
              #
            </span>
            <input
              type="number"
              required
              min="0"
              inputMode="decimal"
              placeholder="Units"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="w-full bg-[var(--admin-surface)] rounded-[4px] pl-7 pr-3 h-9 text-[12.5px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-all"
            />
          </div>
        </div>
      </div>

      {formData.stock !== '' && Number(formData.stock) <= 5 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-[4px] flex items-center gap-2 text-[11px] text-amber-700 font-semibold">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          <span>
            Stock is below threshold. A 'Low Stock' badge will trigger automatically in the catalog.
          </span>
        </div>
      )}
    </div>
  );
}
