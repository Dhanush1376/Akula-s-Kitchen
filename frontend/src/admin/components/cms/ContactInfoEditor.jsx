import React from 'react';
import { AdminField, AdminInput } from '../AdminUIKit';
import { BRAND } from '../../../config/brand';

export function ContactInfoEditor({ content, onUpdate }) {
  const c = content || {};

  return (
    <div className="admin-card p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--admin-border-subtle)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[4px] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">contact_page</span>
          </div>
          <h2 className="text-[15px] sm:text-[16px] font-semibold text-[var(--admin-text-primary)]">
            Contact Information
          </h2>
        </div>
        <a
          href="/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11.5px] font-bold text-[var(--admin-accent)] hover:underline inline-flex items-center gap-1 shrink-0"
        >
          <span>View Live</span>
          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
        </a>
      </div>

      {/* Contact Fields Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AdminField label="Primary Helpline">
          <AdminInput
            value={c.phone || BRAND.phone}
            onChange={(e) => onUpdate('contact', { phone: e.target.value })}
            placeholder="+91 88007 75528"
          />
        </AdminField>

        <AdminField label="WhatsApp Number">
          <AdminInput
            value={c.whatsapp || BRAND.whatsappUrl}
            onChange={(e) => onUpdate('contact', { whatsapp: e.target.value })}
            placeholder="WhatsApp URL or Phone number"
          />
        </AdminField>

        <AdminField label="Official Support Email">
          <AdminInput
            value={c.email || BRAND.email}
            onChange={(e) => onUpdate('contact', { email: e.target.value })}
            placeholder="support@akulas.kitchen"
          />
        </AdminField>

        <AdminField label="Operating Hours">
          <AdminInput
            value={c.businessHours || 'Mon - Sat: 10 AM - 7 PM'}
            onChange={(e) => onUpdate('contact', { businessHours: e.target.value })}
            placeholder="e.g. Mon - Sat: 10 AM - 7 PM"
          />
        </AdminField>

        <div className="sm:col-span-2">
          <AdminField label="Kitchen Address">
            <AdminInput
              value={c.address || BRAND.address || ''}
              onChange={(e) => onUpdate('contact', { address: e.target.value })}
              placeholder="e.g. Plot No, Street, City, State"
            />
          </AdminField>
        </div>

        <div className="sm:col-span-2">
          <AdminField label="Google Maps Direction Link">
            <AdminInput
              value={c.mapEmbed || ''}
              onChange={(e) => onUpdate('contact', { mapEmbed: e.target.value })}
              placeholder="e.g. https://maps.google.com/?q=..."
            />
          </AdminField>
        </div>
      </div>
    </div>
  );
}
