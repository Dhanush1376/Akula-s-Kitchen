import React from 'react';

/**
 * Published snapshot history. No snapshot store exists yet, so this shows an
 * honest empty state rather than sample entries with a restore button that does nothing.
 */
export function PublisherVersionsEditor() {
  return (
    <div className="space-y-8">
      <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <span className="material-symbols-outlined text-[150px]">history</span>
        </div>
        <div className="relative z-10 space-y-6">
          <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--admin-text-primary)] tracking-tight block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
            1. Published Visual Snapshots
          </span>

          <div className="p-5 bg-[var(--admin-surface-muted)]/70 rounded-md border border-dashed border-[var(--admin-border)] text-center">
            <span className="text-[13px] font-bold text-[var(--admin-text-primary)] block leading-snug">
              No saved snapshots yet
            </span>
            <span className="text-[11px] text-[var(--admin-text-tertiary)] block mt-1">
              Published content changes take effect immediately. Snapshot restore is not available
              yet.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
