import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from 'lucide-react';
import { SEO } from '../components/seo/SEO';
import { ContactSkeleton } from '../components/ui/Skeleton';
import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { inquiryService } from '../services/domainServices';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import storeSettingsService from '../services/api/storeSettingsService';
import { useCategories } from '../hooks/useProductQueries';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { BRAND, formatPhoneWithCountryCode, cleanPhoneDigits } from '../config/brand';
import logger from '../utils/core/logger';
import GPSMap from './GPSMapLazy';
import { AppDrawer } from '../components/ui/AppDrawer';

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

  const [searchParams, setSearchParams] = useSearchParams();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const drawerParam = searchParams.get('drawer');
    if (drawerParam === 'message' || drawerParam === 'contact' || drawerParam === 'inquiry') {
      setIsDrawerOpen(true);
    }
  }, [searchParams]);

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    if (searchParams.get('drawer')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('drawer');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleOpenDrawer = () => {
    setIsDrawerOpen(true);
  };

  const [formState, setFormState] = useState('idle'); // idle, sending, success
  const [formData, setFormData] = useState({
    name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || '' : '',
    email: user?.email || '',
    phone: user?.phone || '',
    subject: 'General Inquiry',
    message: '',
  });
  const [otherSubject, setOtherSubject] = useState('');

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

  if (loading || settingsLoading) return <ContactSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen pt-44 sm:pt-48 lg:pt-52 pb-[calc(var(--bottom-nav-height,65px)+3.5rem)] lg:pb-24 bg-white text-on-surface selection:bg-[#f7bb0e]/30 selection:text-[#283618] relative"
    >
      <SEO
        title={`Contact Us | ${storeName || "Akula's Kitchen"}`}
        description={`Get in touch with ${storeName || "Akula's Kitchen"} about orders, catering, or culinary queries. We're happy to help.`}
      />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="text-[7.5px] sm:text-[8px] uppercase font-medium tracking-[0.14em] text-[#283618]/50 mb-2 flex items-center gap-1.5 select-none"
        >
          <Link to="/" className="hover:text-[#283618] transition-colors">
            Home
          </Link>
          <span className="w-0.5 h-0.5 rounded-full bg-[#283618]/30" />
          <span>Help Center</span>
          <span className="w-0.5 h-0.5 rounded-full bg-[#283618]/30" />
          <span className="text-[#283618]/70 font-semibold">Contact</span>
        </nav>

        {/* Minimal Hero Header with Redesigned Action Button */}
        <header className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-[#283618] tracking-tight mb-2">
              Contact Us
            </h1>
            <p className="text-[9.5px] sm:text-[10px] font-sans font-medium uppercase tracking-[0.16em] text-[#283618]/55 select-none">
              We&apos;d love to hear from you • Mon – Sat, 10:00 AM to 6:00 PM
            </p>
          </div>

          {/* Redesigned Button */}
          <button
            type="button"
            onClick={handleOpenDrawer}
            className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#283618] hover:bg-[#1a2310] active:scale-95 text-white text-[11px] font-sans font-bold uppercase tracking-[0.14em] shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer shrink-0 w-fit"
          >
            <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            <span>Send a Message</span>
          </button>
        </header>

        <hr className="border-t border-[#283618]/10 mb-8 sm:mb-10" />

        {/* 2-Column Minimal Layout: Touchpoints & Kitchen Location */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Direct Touchpoints (5 cols) */}
          <aside className="lg:col-span-5 space-y-6">
            <div>
              <h2 className="text-xs uppercase font-bold tracking-wider text-[#283618]/70 mb-3.5">
                Direct Touchpoints
              </h2>
              <div className="space-y-3">
                {/* Send a Message (Quick Drawer Trigger) */}
                <button
                  type="button"
                  onClick={handleOpenDrawer}
                  className="w-full group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-[#283618]/10 hover:border-[#283618]/30 bg-[#fdfbf7] hover:bg-white transition-all shadow-2xs cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#283618]/10 text-[#283618] flex items-center justify-center shrink-0">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                        Inquiry
                      </p>
                      <p className="text-xs sm:text-[13px] font-bold text-[#1f2937]">
                        Send an Online Message
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-[#283618] group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* WhatsApp */}
                {whatsappDisplay && (
                  <a
                    href={BRAND.getWhatsAppUrl(
                      'Hi Akula’s Kitchen, I have a query regarding my order.',
                      whatsappDisplay,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-[#283618]/10 hover:border-[#283618]/30 bg-[#fdfbf7] hover:bg-white transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                          WhatsApp
                        </p>
                        <p className="text-xs sm:text-[13px] font-bold text-[#1f2937]">
                          {whatsappDisplay}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-[#283618] group-hover:translate-x-0.5 transition-all" />
                  </a>
                )}

                {/* Primary Phone */}
                {primaryPhoneDisplay && (
                  <a
                    href={`tel:${cleanPhoneDigits(primaryPhoneDisplay)}`}
                    className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-[#283618]/10 hover:border-[#283618]/30 bg-[#fdfbf7] hover:bg-white transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#283618]/10 text-[#283618] flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                          Helpline
                        </p>
                        <p className="text-xs sm:text-[13px] font-bold text-[#1f2937]">
                          {primaryPhoneDisplay}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-[#283618] group-hover:translate-x-0.5 transition-all" />
                  </a>
                )}

                {/* Alternate Phone */}
                {alternatePhoneDisplay && alternatePhoneDisplay !== primaryPhoneDisplay && (
                  <a
                    href={`tel:${cleanPhoneDigits(alternatePhoneDisplay)}`}
                    className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-[#283618]/10 hover:border-[#283618]/30 bg-[#fdfbf7] hover:bg-white transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#283618]/10 text-[#283618] flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                          Alternate Helpline
                        </p>
                        <p className="text-xs sm:text-[13px] font-bold text-[#1f2937]">
                          {alternatePhoneDisplay}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-[#283618] group-hover:translate-x-0.5 transition-all" />
                  </a>
                )}

                {/* Email */}
                {emailDisplay && (
                  <a
                    href={`mailto:${emailDisplay}`}
                    className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-[#283618]/10 hover:border-[#283618]/30 bg-[#fdfbf7] hover:bg-white transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#283618]/10 text-[#283618] flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                          Email
                        </p>
                        <p className="text-xs sm:text-[13px] font-bold text-[#1f2937] truncate max-w-[210px] sm:max-w-none">
                          {emailDisplay}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-[#283618] group-hover:translate-x-0.5 transition-all" />
                  </a>
                )}

                {/* Hours Note */}
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200/50 text-[11px] text-stone-600">
                  <Clock className="w-3.5 h-3.5 text-[#7a5a00] shrink-0" />
                  <span>Support Hours: {hoursDisplay}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column: Kitchen Address & Map (7 cols) */}
          <main className="lg:col-span-7 space-y-6">
            <div>
              <h2 className="text-xs uppercase font-bold tracking-wider text-[#283618]/70 mb-3.5">
                Kitchen Location & Pickup
              </h2>
              <div className="rounded-2xl border border-[#283618]/10 overflow-hidden bg-[#fdfbf7] p-3.5 sm:p-5 space-y-3.5">
                {addressDisplay && (
                  <div className="flex items-start gap-2.5 text-xs text-[#374151] leading-relaxed">
                    <MapPin className="w-4 h-4 text-[#283618] shrink-0 mt-0.5" />
                    <span>{addressDisplay}</span>
                  </div>
                )}

                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block rounded-xl overflow-hidden group shadow-2xs border border-[#283618]/10"
                >
                  <div className="h-56 sm:h-64 w-full">
                    <GPSMap
                      address={{
                        city: settings?.contact?.city,
                        state: settings?.contact?.state,
                        pincode: settings?.contact?.postalCode,
                      }}
                    />
                  </div>
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[11px] font-semibold text-[#1f2937] shadow-sm group-hover:bg-stone-50 transition-all border border-stone-200/70">
                    <span>Open in Google Maps</span>
                    <ExternalLink className="w-3 h-3 text-stone-500" />
                  </span>
                </a>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* App Drawer for Sending Inquiry */}
      <AppDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title="Send an Inquiry"
        subtitle="Akula's Kitchen Support"
        headerIcon={Send}
        maxWidth="max-w-[480px]"
      >
        {formState === 'success' ? (
          <div className="py-8 px-3 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-[#283618] mb-1">Message Sent!</h3>
              <p className="text-xs text-[#4b5563] max-w-xs mx-auto leading-relaxed">
                Thank you for reaching out. Our kitchen team has received your note and will get
                back to you shortly.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setFormState('idle')}
                className="px-4 py-2 text-xs font-semibold text-[#283618] hover:bg-[#283618]/5 rounded-lg transition-colors cursor-pointer"
              >
                Send another
              </button>
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="px-6 py-2.5 text-xs font-bold bg-[#283618] text-white rounded-lg hover:bg-[#1f2b13] transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 p-1 pb-4">
            {/* Name */}
            <div>
              <label
                htmlFor="drawer-contact-name"
                className="block text-[11px] font-semibold uppercase tracking-wider text-[#374151] mb-1"
              >
                Your Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="drawer-contact-name"
                type="text"
                required
                autoComplete="name"
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#283618]/15 bg-[#faf8f5]/80 focus:bg-white text-xs sm:text-sm text-[#1f2937] placeholder:text-stone-400 focus:outline-none focus:border-[#283618] focus:ring-1 focus:ring-[#283618]/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Email */}
              <div>
                <label
                  htmlFor="drawer-contact-email"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-[#374151] mb-1"
                >
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  id="drawer-contact-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#283618]/15 bg-[#faf8f5]/80 focus:bg-white text-xs sm:text-sm text-[#1f2937] placeholder:text-stone-400 focus:outline-none focus:border-[#283618] focus:ring-1 focus:ring-[#283618]/20 transition-all"
                />
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="drawer-contact-phone"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-[#374151] mb-1"
                >
                  Phone Number
                </label>
                <input
                  id="drawer-contact-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#283618]/15 bg-[#faf8f5]/80 focus:bg-white text-xs sm:text-sm text-[#1f2937] placeholder:text-stone-400 focus:outline-none focus:border-[#283618] focus:ring-1 focus:ring-[#283618]/20 transition-all"
                />
              </div>
            </div>

            {/* Topic / Subject */}
            <div>
              <label
                htmlFor="drawer-contact-subject"
                className="block text-[11px] font-semibold uppercase tracking-wider text-[#374151] mb-1"
              >
                Topic <span className="text-rose-500">*</span>
              </label>
              <select
                id="drawer-contact-subject"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#283618]/15 bg-[#faf8f5]/80 focus:bg-white text-xs sm:text-sm text-[#1f2937] focus:outline-none focus:border-[#283618] focus:ring-1 focus:ring-[#283618]/20 transition-all"
              >
                <option value="General Inquiry">General inquiry</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Event Catering">Bulk & Event Catering</option>
                <option value="Collaboration">Collaboration / Business</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Conditional "Other" input */}
            {formData.subject === 'Other' && (
              <div>
                <label
                  htmlFor="drawer-contact-other"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-[#374151] mb-1"
                >
                  Specify Topic <span className="text-rose-500">*</span>
                </label>
                <input
                  id="drawer-contact-other"
                  type="text"
                  required
                  placeholder="Brief description of inquiry"
                  value={otherSubject}
                  onChange={(e) => setOtherSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#283618]/15 bg-[#faf8f5]/80 focus:bg-white text-xs sm:text-sm text-[#1f2937] placeholder:text-stone-400 focus:outline-none focus:border-[#283618] focus:ring-1 focus:ring-[#283618]/20 transition-all"
                />
              </div>
            )}

            {/* Message */}
            <div>
              <label
                htmlFor="drawer-contact-message"
                className="block text-[11px] font-semibold uppercase tracking-wider text-[#374151] mb-1"
              >
                Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="drawer-contact-message"
                required
                rows={4}
                placeholder="Tell us what you need: order questions, special requests..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#283618]/15 bg-[#faf8f5]/80 focus:bg-white text-xs sm:text-sm text-[#1f2937] placeholder:text-stone-400 focus:outline-none focus:border-[#283618] focus:ring-1 focus:ring-[#283618]/20 transition-all resize-y"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={formState === 'sending'}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 bg-[#283618] hover:bg-[#1f2b13] active:scale-98 disabled:opacity-60 text-white rounded-xl font-sans text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>{formState === 'sending' ? 'Sending Inquiry...' : 'Submit Inquiry'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </AppDrawer>
    </motion.div>
  );
}
export default Contact;
