import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/seo/SEO';
import { ContactSkeleton } from '../components/ui/Skeleton';
import { useState, useEffect, useRef } from 'react';
import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { inquiryService } from '../services/domainServices';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import storeSettingsService from '../services/api/storeSettingsService';
import { windBreeze } from '../components/effects/FallingLeaves';
import './contact.css';
import { useCategories } from '../hooks/useProductQueries';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { BRAND, formatPhoneWithCountryCode, cleanPhoneDigits } from '../config/brand';

import logger from '../utils/core/logger';

import GPSMap from './GPSMapLazy';

export function Contact() {
  const { storeName, supportEmail, supportPhone, alternatePhone, whatsappNumber } = useConfig();
  const { contact, loading } = useWebsiteContent();
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['storeSettings', 'public'],
    queryFn: () => storeSettingsService.getPublicSettings(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: categories = [] } = useCategories();

  const { user } = useAuth();

  const [formState, setFormState] = useState('idle'); // idle, sending, success
  const [formData, setFormData] = useState({
    name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || '' : '',
    email: user?.email || '',
    phone: user?.phone || '',
    subject: 'General Inquiry',
    message: '',
  });
  const [otherSubject, setOtherSubject] = useState('');
  const leafRef = useRef(null);

  // The corner leaf drifts in a slow breeze, like the leaves elsewhere on the site
  useEffect(() => {
    const breeze = windBreeze(leafRef.current, { strength: 0.45 });
    return () => breeze?.cancel();
  }, [loading, settingsLoading]);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name:
          prev.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormState('sending');

    const finalSubject = formData.subject === 'Other' ? `Other: ${otherSubject}` : formData.subject;

    try {
      const response = await inquiryService.create({ ...formData, subject: finalSubject });
      if (response.success) {
        setFormState('success');
        toast.success('Inquiry sent successfully!');
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: 'General Inquiry',
          message: '',
        });
        setOtherSubject('');
      } else {
        setFormState('idle');
        toast.error('Failed to send inquiry. Please try again.');
      }
    } catch (err) {
      logger.error(err);
      setFormState('idle');
      toast.error('An error occurred. Please try again.');
    }
  };

  const primaryPhoneDisplay = formatPhoneWithCountryCode(
    settings?.general?.phone ||
      settings?.contact?.phone ||
      supportPhone ||
      contact?.phone ||
      BRAND.phone,
  );

  const alternatePhoneDisplay = formatPhoneWithCountryCode(
    settings?.general?.alternatePhone ||
      settings?.contact?.alternatePhone ||
      alternatePhone ||
      BRAND.alternatePhone,
  );

  const whatsappDisplay = formatPhoneWithCountryCode(
    settings?.general?.whatsappNumber ||
      settings?.contact?.whatsappNumber ||
      whatsappNumber ||
      BRAND.whatsappNumber,
  );

  const emailDisplay =
    settings?.general?.supportEmail ||
    settings?.contact?.email ||
    supportEmail ||
    contact?.email ||
    BRAND.email;

  const addressDisplay = settings?.contact?.address || contact?.address || BRAND.address || '';

  const hoursDisplay =
    settings?.contact?.supportHours ||
    contact?.businessHours ||
    BRAND.supportHours ||
    'Mon - Sat, 10 AM to 6 PM';

  const mapsUrl =
    settings?.contact?.googleMapsUrl ||
    contact?.mapEmbed ||
    (addressDisplay
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressDisplay)}`
      : 'https://maps.google.com');

  // The three fastest ways to reach the kitchen, as large tappable cards
  const quickContacts = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      hint: 'Quickest reply',
      value: whatsappDisplay,
      href: BRAND.getWhatsAppUrl(null, whatsappDisplay),
      external: true,
      Icon: MessageCircle,
    },
    {
      key: 'call',
      label: 'Call us',
      hint: hoursDisplay,
      value: primaryPhoneDisplay,
      href: `tel:${cleanPhoneDigits(primaryPhoneDisplay)}`,
      Icon: Phone,
    },
    {
      key: 'email',
      label: 'Email',
      hint: 'We reply within a day',
      value: emailDisplay,
      href: `mailto:${emailDisplay}`,
      Icon: Mail,
    },
  ].filter((c) => c.value);

  const showAlternate = alternatePhoneDisplay && alternatePhoneDisplay !== primaryPhoneDisplay;

  if (loading || settingsLoading) return <ContactSkeleton />;

  return (
    <div className="ct-page">
      <SEO
        title="Contact Us"
        description={`Get in touch with ${storeName || "Akula's Kitchen"} about orders, bulk requests or anything else. We're happy to help.`}
      />

      {/* Hero: cream panel with a banana leaf rising from the corner */}
      <section className="ct-hero" aria-labelledby="ct-title">
        <div className="ct-hero__panel">
          <div className="ct-hero__leaf" aria-hidden="true">
            <div ref={leafRef} className="ct-hero__leaf-sway">
              <img
                src="/account/corner-leaf-right.webp"
                alt=""
                className="ct-hero__leaf-shadow"
                draggable="false"
                decoding="async"
              />
              <img
                src="/account/corner-leaf-right.webp"
                alt=""
                className="ct-hero__leaf-img"
                draggable="false"
                decoding="async"
              />
            </div>
          </div>

          <div className="ct-hero__copy">
            <p className="ct-eyebrow ct-rise" style={{ '--d': 0 }}>
              <span className="ct-dot" aria-hidden="true" />
              We&apos;re here to help
            </p>
            <h1 id="ct-title" className="ct-hero__title ct-rise" style={{ '--d': 1 }}>
              Let&apos;s talk <span>food.</span>
            </h1>
            <p className="ct-hero__lede ct-rise" style={{ '--d': 2 }}>
              A question about an order, a bulk request for a function, or just want to say hello?
              Reach the kitchen the way that suits you.
            </p>
          </div>

          <ul className="ct-quick">
            {quickContacts.map(({ key, label, hint, value, href, external, Icon }, i) => (
              <li key={key} className="ct-rise" style={{ '--d': 3 + i }}>
                <a
                  href={href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  className={`ct-quick__card ct-quick__card--${key}`}
                >
                  <span className="ct-quick__icon" aria-hidden="true">
                    <Icon strokeWidth={1.8} />
                  </span>
                  <span className="ct-quick__text">
                    <span className="ct-quick__label">{label}</span>
                    <span className="ct-quick__value">{value}</span>
                    <span className="ct-quick__hint">{hint}</span>
                  </span>
                  <ArrowRight className="ct-quick__go" strokeWidth={2.2} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <main className="ct-main">
        {/* Form card */}
        <section className="ct-form-card" aria-labelledby="ct-form-title">
          <AnimatePresence>
            {formState === 'success' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="ct-success"
              >
                <span className="ct-success__icon">
                  <CheckCircle2 strokeWidth={1.6} />
                </span>
                <h2 className="ct-success__title">Message received</h2>
                <p className="ct-success__text">
                  Thank you! The kitchen will get back to you within one business day.
                </p>
                <button
                  type="button"
                  onClick={() => setFormState('idle')}
                  className="ct-btn ct-btn--outline"
                >
                  Send another message
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="ct-eyebrow">
            <span className="ct-dot" aria-hidden="true" />
            Send a message
          </p>
          <h2 id="ct-form-title" className="ct-form-card__title">
            Write to the kitchen
          </h2>

          <form onSubmit={handleSubmit} className="ct-form">
            <div className="ct-form__row">
              <div className="ct-field">
                <label htmlFor="contact-name">
                  Your name <span aria-hidden="true">*</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="ct-field">
                <label htmlFor="contact-email">
                  Email <span aria-hidden="true">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="ct-form__row">
              <div className="ct-field">
                <label htmlFor="contact-phone">Phone</label>
                <input
                  id="contact-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="ct-field">
                <label htmlFor="contact-subject">
                  What&apos;s it about? <span aria-hidden="true">*</span>
                </label>
                <select
                  id="contact-subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                >
                  <option value="General Inquiry">General inquiry</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Collaboration">Collaboration</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <AnimatePresence>
              {formData.subject === 'Other' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ct-field overflow-hidden"
                >
                  <label htmlFor="contact-other">
                    Please specify <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="contact-other"
                    type="text"
                    required
                    placeholder="Briefly describe your inquiry"
                    value={otherSubject}
                    onChange={(e) => setOtherSubject(e.target.value)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="ct-field">
              <label htmlFor="contact-message">
                Message <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="contact-message"
                required
                rows={5}
                placeholder="Tell us what you need: an order question, quantities for a function, a product you're looking for..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={formState === 'sending'}
              className="ct-btn ct-btn--primary"
            >
              <span>{formState === 'sending' ? 'Sending…' : 'Send message'}</span>
              <span className="ct-btn__icon" aria-hidden="true">
                <ArrowRight strokeWidth={2.5} />
              </span>
            </button>
          </form>
        </section>

        {/* Visit card: address, hours, map */}
        <aside className="ct-visit" aria-label="Visit the kitchen">
          <div className="ct-visit__card">
            <p className="ct-eyebrow">
              <span className="ct-dot" aria-hidden="true" />
              Visit the kitchen
            </p>
            {addressDisplay && (
              <div className="ct-visit__row">
                <MapPin strokeWidth={1.8} aria-hidden="true" />
                <span>{addressDisplay}</span>
              </div>
            )}
            <div className="ct-visit__row">
              <Clock strokeWidth={1.8} aria-hidden="true" />
              <span>{hoursDisplay}</span>
            </div>
            {showAlternate && (
              <a
                href={`tel:${cleanPhoneDigits(alternatePhoneDisplay)}`}
                className="ct-visit__row ct-visit__row--link"
              >
                <Phone strokeWidth={1.8} aria-hidden="true" />
                <span>{alternatePhoneDisplay}</span>
              </a>
            )}

            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="ct-map">
              {/* Overlay blocks map dragging and turns the whole map into a link */}
              <span className="ct-map__shield" />
              <GPSMap
                address={{
                  city: settings?.contact?.city,
                  state: settings?.contact?.state,
                  pincode: settings?.contact?.postalCode,
                }}
              />
              <span className="ct-map__pill">
                Open in Google Maps
                <ExternalLink strokeWidth={2} aria-hidden="true" />
              </span>
            </a>
          </div>
        </aside>
      </main>
    </div>
  );
}
