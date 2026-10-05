import { BRAND } from './brand';

export const EXTERNAL_URLS = {
  WHATSAPP_BASE: 'https://wa.me',
  WHATSAPP_API: 'https://api.whatsapp.com/send',
  RAZORPAY_CHECKOUT: 'https://checkout.razorpay.com/v1/checkout.js',
  LEAFLET_CSS: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  LEAFLET_JS: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  LEAFLET_MARKER_ICON: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  LEAFLET_MARKER_SHADOW: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  LEAFLET_TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  NOMINATIM_API: 'https://nominatim.openstreetmap.org',
  GOOGLE_MAPS_SEARCH: 'https://www.google.com/maps/search',
  FACEBOOK_SHARE: 'https://www.facebook.com/sharer/sharer.php',
  TWITTER_SHARE: 'https://twitter.com/intent/tweet',
  LINKEDIN_SHARE: 'https://www.linkedin.com/sharing/share-offsite',
  SCHEMA_ORG: 'https://schema.org',
  PLACEHOLDER_IMAGE: 'https://via.placeholder.com/150?text=No+Image',
  PLACEHOLD_CO: 'https://placehold.co',
  CLOUDINARY_UPLOAD_BASE: 'https://api.cloudinary.com/v1_1',
  CLOUDINARY_CDN_BASE: 'https://res.cloudinary.com',
};

export const APP_CONFIG = {
  get DEFAULT_WHATSAPP_NUMBER() {
    return BRAND.whatsappDigits;
  },
};
