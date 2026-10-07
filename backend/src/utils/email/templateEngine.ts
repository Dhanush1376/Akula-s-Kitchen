import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import logger from '../../config/logger';
import { getStoreConfigSync } from '../../config/storeConfig';
import { resolveEmailImageUrl, getPublicWebsiteUrl } from './emailUrlUtils';

// {{value}} is HTML-escaped by default. Use {{{value}}} only for trusted, server-controlled markup.
handlebars.registerHelper('formatCurrency', function (value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
});

handlebars.registerHelper('formatDate', function (dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

export const compileTemplate = (templateName: string, data: Record<string, any>) => {
  try {
    const templatePath = path.join(__dirname, '..', '..', 'templates', `${templateName}.hbs`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template ${templateName} not found at ${templatePath}`);
    }
    const source = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(source);

    const store = getStoreConfigSync();
    const publicUrl = getPublicWebsiteUrl();
    const rawLogo = store.logo || `${publicUrl}/MainLogo_bg.png`;
    const storeLogo = resolveEmailImageUrl(rawLogo);
    const trackingUrl =
      data.trackingUrl || `${publicUrl}/track/${data.orderId || data.rawOrderId || ''}`;

    const enrichedData: Record<string, any> = {
      storeName: store.name,
      storeLogo,
      websiteUrl: publicUrl,
      websiteDomain: store.websiteDomain || 'akulas.kitchen',
      storeAddress: store.contact.address,
      supportEmail: store.contact.email,
      supportPhone: store.contact.phone,
      currentYear: new Date().getFullYear(),
      trackingUrl,
      ...data,
    };

    // Ensure all items in Handlebars data have valid public image URLs
    if (Array.isArray(enrichedData.items)) {
      enrichedData.items = enrichedData.items.map((item: any) => ({
        ...item,
        image: resolveEmailImageUrl(item.image || item.imageSrc || item.imageUrl),
      }));
    }

    return template(enrichedData);
  } catch (error) {
    logger.error(`Error compiling template ${templateName}:`, error);
    return '';
  }
};
