import React from 'react';
import { WeeklyMenuCalendarEditor } from './WeeklyMenuCalendarEditor';

export function MenuPageEditor({ content = {}, onUpdate }) {
  const menuConfig = content.menuPage || {};

  // Menu Page title defaults to "Our Menu" (if it was accidentally set to "Today's Kitchen" from hero, reset to "Our Menu")
  const currentTitle =
    menuConfig.title && menuConfig.title !== "Today's Kitchen" ? menuConfig.title : 'Our Menu';

  const updateMenuField = (field, value) => {
    onUpdate('menuPage', {
      ...menuConfig,
      [field]: value,
    });
  };

  return (
    <div className="admin-card p-3.5 sm:p-6 space-y-4 sm:space-y-5">
      {/* Page title + link to the live page */}
      <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--admin-border-subtle)]">
        <span className="hidden sm:flex w-9 h-9 rounded-[var(--admin-radius-lg,8px)] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
        </span>
        <input
          value={currentTitle}
          onChange={(e) => updateMenuField('title', e.target.value)}
          placeholder="Our Menu"
          aria-label="Menu page title"
          className="flex-1 min-w-0 h-[38px] px-3 rounded-[var(--admin-radius-md,6px)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[14px] font-semibold text-[var(--admin-text-primary)] focus:outline-none focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] transition-colors"
        />
        <a
          href="/menu"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View menu page"
          className="h-[38px] w-[38px] sm:w-auto sm:px-3.5 rounded-[var(--admin-radius-md,6px)] border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] inline-flex items-center justify-center gap-1.5 shrink-0"
        >
          <span className="hidden sm:inline">View page</span>
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
        </a>
      </div>

      <WeeklyMenuCalendarEditor
        sectionKey="menuPage"
        sectionData={menuConfig}
        onUpdate={(key, updatedData) => {
          onUpdate('menuPage', updatedData);
          // Also sync to hero so Homepage Today's Kitchen automatically changes with the calendar!
          onUpdate('hero', {
            ...(content.hero || {}),
            productIds: updatedData.productIds,
            weeklySchedule: updatedData.weeklySchedule,
            cutoffTime: updatedData.cutoffTime,
          });
        }}
        title="Weekly menu"
      />
    </div>
  );
}
