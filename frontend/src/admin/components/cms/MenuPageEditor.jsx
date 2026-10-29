import React from 'react';
import { AdminField, AdminInput } from '../AdminUIKit';
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
    // Only mirror daily schedule to hero, never page titles!
    if (['weeklySchedule', 'productIds', 'cutoffTime'].includes(field)) {
      onUpdate('hero', {
        ...(content.hero || {}),
        [field]: value,
      });
    }
  };

  return (
    <div className="admin-card p-4 sm:p-6 space-y-5">
      {/* 1. Header Information Box */}
      <div className="flex items-center justify-between border-b border-[var(--admin-border-subtle)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[4px] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">restaurant_menu</span>
          </div>
          <h2 className="text-[15px] sm:text-[16px] font-semibold text-[var(--admin-text-primary)]">
            Menu Page Controller
          </h2>
        </div>
        <a
          href="/menu"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11.5px] font-bold text-[var(--admin-accent)] hover:underline inline-flex items-center gap-1 shrink-0"
        >
          <span>View Live</span>
          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
        </a>
      </div>

      <div>
        <AdminField label="Menu Title">
          <AdminInput
            value={currentTitle}
            onChange={(e) => updateMenuField('title', e.target.value)}
            placeholder="Our Menu"
          />
        </AdminField>
      </div>

      {/* 2. Weekly Menu Planner */}
      <div className="pt-2 border-t border-[var(--admin-border-subtle)]">
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
          title="Weekly Menu Planner"
        />
      </div>
    </div>
  );
}
