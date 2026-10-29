import React from 'react';
import { AdminField, AdminInput, AdminToggle } from '../AdminUIKit';

export function NavigationFooterEditor({ nav = {}, footer = {}, onUpdate }) {
  // Navigation arrays
  const mainLinks = nav.mainLinks || [];

  // Footer arrays
  const exploreLinks =
    footer.exploreLinks?.length > 0
      ? footer.exploreLinks
      : [{ label: 'Collections', href: '/collections' }];

  // `studioLinks` is the persisted CMS key for the footer's second link column.
  const quickLinks =
    footer.studioLinks?.length > 0
      ? footer.studioLinks
      : [
          { label: 'Collections', href: '/collections' },
          { label: 'Contact', href: '/contact' },
        ];

  const policyLinks =
    footer.policyLinks?.length > 0
      ? footer.policyLinks
      : [
          { label: 'Shipping Policy', href: '/policy/shipping-policy' },
          { label: 'Terms and Conditions', href: '/policy/terms-and-conditions' },
          { label: 'Cancellation Policy', href: '/policy/cancellation-policy' },
          { label: 'Refund Policy', href: '/policy/refund-policy' },
          { label: 'Exchange Policy', href: '/policy/exchange-policy' },
          { label: 'Privacy Policy', href: '/policy/privacy-policy' },
          { label: 'Return Policy', href: '/policy/return-policy' },
        ];

  const trustBadges =
    footer.trustBadges?.length > 0
      ? footer.trustBadges
      : [
          { label: 'Secure Checkout', href: 'lock' },
          { label: '100% Homemade', href: 'draw' },
          { label: 'Fast Delivery', href: 'local_shipping' },
          { label: 'Simple Returns', href: 'refresh' },
        ];

  const handleLinkUpdate = (category, idx, field, value) => {
    if (category === 'mainLinks') {
      const copy = [...mainLinks];
      copy[idx] = { ...copy[idx], [field]: value };
      onUpdate('navigation', { mainLinks: copy });
    } else {
      let copy = [];
      if (category === 'exploreLinks') copy = [...exploreLinks];
      else if (category === 'studioLinks') copy = [...quickLinks];
      else if (category === 'policyLinks') copy = [...policyLinks];
      else if (category === 'trustBadges') copy = [...trustBadges];

      copy[idx] = { ...copy[idx], [field]: value };
      onUpdate('footer', { [category]: copy });
    }
  };

  const handleAddLink = (category) => {
    if (category === 'mainLinks') {
      const copy = [...mainLinks];
      copy.push({ label: 'New Link', href: '/', isVisible: true });
      onUpdate('navigation', { mainLinks: copy });
    } else {
      let copy = [];
      let newItem = { label: 'New Link', href: '/' };

      if (category === 'exploreLinks') copy = [...exploreLinks];
      else if (category === 'studioLinks') copy = [...quickLinks];
      else if (category === 'policyLinks') copy = [...policyLinks];
      else if (category === 'trustBadges') {
        copy = [...trustBadges];
        newItem = { label: 'New Badge', href: 'star' };
      }

      copy.push(newItem);
      onUpdate('footer', { [category]: copy });
    }
  };

  const handleDeleteLink = (category, idx) => {
    if (category === 'mainLinks') {
      const copy = [...mainLinks];
      copy.splice(idx, 1);
      onUpdate('navigation', { mainLinks: copy });
    } else {
      let copy = [];
      if (category === 'exploreLinks') copy = [...exploreLinks];
      else if (category === 'studioLinks') copy = [...quickLinks];
      else if (category === 'policyLinks') copy = [...policyLinks];
      else if (category === 'trustBadges') copy = [...trustBadges];

      copy.splice(idx, 1);
      onUpdate('footer', { [category]: copy });
    }
  };

  const renderLinkEditor = (title, items, category) => (
    <div className="bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] p-4 space-y-4">
      <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-2.5">
        <span className="text-[13px] font-bold text-[var(--admin-text-primary)]">{title}</span>
        <button
          type="button"
          onClick={() => handleAddLink(category)}
          className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          <span>Add Link</span>
        </button>
      </div>
      <div className="space-y-3">
        {items.map((link, idx) => (
          <div
            key={idx}
            className="flex flex-col md:flex-row gap-3 items-center p-3 bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] rounded-[4px]"
          >
            <div className="flex-1 w-full">
              <span className="text-[10px] uppercase font-bold text-[var(--admin-text-secondary)] mb-1 block">
                Label
              </span>
              <AdminInput
                value={link.label || ''}
                onChange={(e) => handleLinkUpdate(category, idx, 'label', e.target.value)}
              />
            </div>
            <div className="flex-1 w-full">
              <span className="text-[10px] uppercase font-bold text-[var(--admin-text-secondary)] mb-1 block">
                URL / Icon
              </span>
              <AdminInput
                value={link.href || ''}
                onChange={(e) => handleLinkUpdate(category, idx, 'href', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 mt-1 md:mt-4">
              {category === 'mainLinks' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-[var(--admin-text-secondary)]">
                    Visible
                  </span>
                  <AdminToggle
                    checked={link.isVisible !== false}
                    onChange={() => handleLinkUpdate(category, idx, 'isVisible', !link.isVisible)}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => handleDeleteLink(category, idx)}
                className="w-7 h-7 rounded-[4px] bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all cursor-pointer shrink-0"
                title="Remove Link"
              >
                <span className="material-symbols-outlined text-[15px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="admin-card p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--admin-border-subtle)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[4px] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">menu</span>
          </div>
          <h2 className="text-[15px] sm:text-[16px] font-semibold text-[var(--admin-text-primary)]">
            Header & Footer Controller
          </h2>
        </div>
      </div>

      {/* NAVBAR SECTION */}
      <div className="space-y-4">
        <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
          Navbar Configuration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <AdminField label="Navbar Brand Name">
            <AdminInput
              value={nav.logo?.text || ''}
              onChange={(e) =>
                onUpdate('navigation', { logo: { ...nav.logo, text: e.target.value } })
              }
              placeholder="e.g. AKULA'S KITCHEN"
            />
          </AdminField>
        </div>

        {renderLinkEditor('Main Navigation Links', mainLinks, 'mainLinks')}
      </div>

      {/* FOOTER SECTION */}
      <div className="space-y-5 pt-4 border-t border-[var(--admin-border-subtle)]">
        <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
          Footer Credentials & Links
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <AdminField label="Contact Phone">
            <AdminInput
              value={footer.phone || ''}
              onChange={(e) => onUpdate('footer', { phone: e.target.value })}
              placeholder="Phone number"
            />
          </AdminField>
          <AdminField label="Contact Email">
            <AdminInput
              value={footer.email || ''}
              onChange={(e) => onUpdate('footer', { email: e.target.value })}
              placeholder="Email address"
            />
          </AdminField>
          <AdminField label="Copyright Notice">
            <AdminInput
              value={footer.copyright || ''}
              onChange={(e) => onUpdate('footer', { copyright: e.target.value })}
              placeholder="© {year} Akula's Kitchen."
            />
          </AdminField>
        </div>

        {/* Social Links */}
        <div className="pt-3 border-t border-[var(--admin-border-subtle)]">
          <span className="text-[11.5px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-3 block">
            Social Media Links
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <AdminField label="Instagram URL">
              <AdminInput
                value={footer.socialLinks?.instagram || ''}
                onChange={(e) =>
                  onUpdate('footer', {
                    socialLinks: { ...footer.socialLinks, instagram: e.target.value },
                  })
                }
                placeholder="https://instagram.com/..."
              />
            </AdminField>
            <AdminField label="Facebook URL">
              <AdminInput
                value={footer.socialLinks?.facebook || ''}
                onChange={(e) =>
                  onUpdate('footer', {
                    socialLinks: { ...footer.socialLinks, facebook: e.target.value },
                  })
                }
                placeholder="https://facebook.com/..."
              />
            </AdminField>
            <AdminField label="Pinterest URL">
              <AdminInput
                value={footer.socialLinks?.pinterest || ''}
                onChange={(e) =>
                  onUpdate('footer', {
                    socialLinks: { ...footer.socialLinks, pinterest: e.target.value },
                  })
                }
                placeholder="https://pinterest.com/..."
              />
            </AdminField>
          </div>
        </div>

        {/* Link Columns */}
        <div className="space-y-4 pt-3 border-t border-[var(--admin-border-subtle)]">
          {renderLinkEditor('Explore Links (Col 1)', exploreLinks, 'exploreLinks')}
          {renderLinkEditor('Quick Links (Col 2)', quickLinks, 'studioLinks')}
          {renderLinkEditor('Policy Links (Bottom)', policyLinks, 'policyLinks')}
          {renderLinkEditor('Trust Badges (Middle Banner)', trustBadges, 'trustBadges')}
        </div>
      </div>
    </div>
  );
}
