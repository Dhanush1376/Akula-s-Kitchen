import {
  User,
  Save,
  Mail,
  Smartphone,
  Loader2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  X,
  Sparkles,
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { userService, policyService } from '../../services/domainServices';
import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_POLICIES,
  getPolicyMeta,
  getDefaultPolicy,
  sortPoliciesByImportance,
} from '../../constants/defaultPolicies';
import toast from 'react-hot-toast';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { useGoogleIdentity } from '../../hooks/useGoogleIdentity';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export function ProfileSection({ isDrawer = false }) {
  const { user: dashboardUser, checkAuth, addresses, updateUser: dashUpdateUser } = useDashboard();
  const { user: authUser, updateUser: authUpdateUser } = useAuth();
  const updateUser = dashUpdateUser || authUpdateUser;
  const activeUser = dashboardUser || authUser;

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    gender: '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Security state
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [linkingProvider, setLinkingProvider] = useState(null);

  // Policies state & data fetching
  const [expandedPolicySlug, setExpandedPolicySlug] = useState(null);
  const [activeModalPolicy, setActiveModalPolicy] = useState(null);

  const { data: policyRes } = useQuery({
    queryKey: ['public-policies'],
    queryFn: () => policyService.getPublicPolicies(),
    staleTime: 5 * 60 * 1000,
  });

  const policiesList = useMemo(() => {
    const livePolicies = policyRes?.data || [];
    const list = livePolicies.length > 0 ? livePolicies : DEFAULT_POLICIES;
    const mapped = list.map((p) => {
      const meta = getPolicyMeta(p.slug, p.title);
      const fallback = getDefaultPolicy(p.slug);
      return {
        ...fallback,
        ...p,
        title: p.title || fallback?.title || meta.title,
        slug: p.slug,
        icon: meta.icon || ShieldCheck,
        badge: meta.badge || 'Official',
        tagline:
          meta.tagline || fallback?.seoMetadata?.description || "Akula's Kitchen Official Policy",
        readTime: meta.readTime || '3 min read',
        sections: p.sections || fallback?.sections || [],
      };
    });
    return sortPoliciesByImportance(mapped);
  }, [policyRes]);

  useEffect(() => {
    if (activeModalPolicy) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [activeModalPolicy]);

  useEffect(() => {
    if (activeUser) {
      let initialName = activeUser.name || '';
      if (!initialName || initialName === 'Customer') {
        const addrWithName = addresses?.find(
          (a) => a.name && a.name.trim() && a.name.trim().toLowerCase() !== 'customer',
        );
        if (addrWithName) {
          initialName = addrWithName.name.trim();
        }
      }

      let initialPhone = activeUser.phone || '';
      if (!initialPhone) {
        const addrWithPhone = addresses?.find((a) => a.phone && a.phone.trim());
        if (addrWithPhone) {
          initialPhone = addrWithPhone.phone.trim();
        }
      }

      setProfileForm({
        name: initialName,
        phone: initialPhone,
        gender: activeUser.gender || '',
      });
    }
  }, [activeUser, addresses]);

  const fetchProviders = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/auth/link/providers');
      if (res.data.success) {
        setProviders(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load linked accounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleGoogleSuccess = async (credential) => {
    try {
      setLinkingProvider('google');
      await api.post('/auth/link/google', { credential });
      toast.success('Google account linked successfully');
      fetchProviders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to link Google account');
    } finally {
      setLinkingProvider(null);
    }
  };

  const { isReady, triggerLogin, renderGoogleButton } = useGoogleIdentity(
    handleGoogleSuccess,
    () => {
      toast.error('Google sign-in failed');
      setLinkingProvider(null);
    },
  );

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      toast.error('Full name cannot be blank');
      return;
    }
    setIsUpdatingProfile(true);
    try {
      const res = await userService.updateProfile(profileForm);
      if (res.success && res.data) {
        if (updateUser) {
          updateUser(res.data);
        }
        setProfileForm((prev) => ({
          ...prev,
          name: res.data.name || prev.name,
          phone: res.data.phone || prev.phone,
          gender: res.data.gender || prev.gender,
        }));
        toast.success('Profile updated successfully');
        if (checkAuth) {
          await checkAuth();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUnlink = async (providerName) => {
    try {
      if (providers.length <= 1) {
        toast.error('Cannot remove your only login method');
        return;
      }
      setLinkingProvider(providerName);
      await api.delete(`/auth/link/${providerName}`);
      toast.success(`${providerName} disconnected successfully`);
      fetchProviders();
      if (checkAuth) {
        await checkAuth();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disconnect account');
    } finally {
      setLinkingProvider(null);
    }
  };

  const googleLinked = providers.find((p) => p.provider === 'google');

  const inputClass =
    'w-full px-4 py-2.5 text-[13px] font-medium text-neutral-900 bg-white border border-neutral-300 rounded-full outline-none transition-all focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 placeholder:text-neutral-400 font-sans shadow-2xs';

  const inputClassDisabled =
    'w-full px-4 py-2.5 text-[13px] font-semibold text-neutral-800 bg-neutral-100/80 border border-neutral-300 rounded-full cursor-not-allowed font-sans select-all';

  return (
    <motion.div
      id="panel-profile"
      role="tabpanel"
      key="tab-profile"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={`space-y-4 text-left font-sans ${isDrawer ? 'pb-2' : 'pb-8'}`}
    >
      {/* Profile Info Card */}
      <div
        className={
          isDrawer
            ? 'space-y-4'
            : 'bg-white/75 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] overflow-hidden'
        }
      >
        {/* Card Header (hidden in drawer to avoid redundancy) */}
        {!isDrawer && (
          <div className="bg-[#283618]/5 backdrop-blur-xs px-4 sm:px-5 py-3.5 border-b border-[#283618]/15 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-[#283618]" strokeWidth={2} />
              <span className="text-[13.5px] font-bold text-[#283618]">Profile Settings</span>
            </div>
            <span className="text-[11px] text-neutral-500 font-medium hidden sm:inline">
              Manage personal details
            </span>
          </div>
        )}

        <form onSubmit={handleProfileSave} className={isDrawer ? 'space-y-4 px-1' : 'p-4 sm:p-6'}>
          <div
            className={
              isDrawer
                ? 'grid grid-cols-1 gap-4'
                : 'grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 max-w-2xl'
            }
          >
            {/* Full Name */}
            <div>
              <label
                htmlFor="dashboard-profile-name"
                className="block text-[12px] font-semibold text-neutral-800 mb-1.5"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="dashboard-profile-name"
                type="text"
                required
                autoComplete="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className={inputClass}
                placeholder="Enter your full name"
              />
            </div>

            {/* Email */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-semibold text-neutral-800">Email Address</label>
                {googleLinked && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                    <ShieldCheck size={11} /> Google Connected
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    disabled
                    value={activeUser?.email || ''}
                    className={`${inputClassDisabled} !pl-10 !pr-4`}
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                </div>

                {!isLoading && !googleLinked && (
                  <div className="shrink-0 h-[40px] overflow-hidden rounded-full">
                    <div className="scale-[0.88] origin-top-left">
                      <GoogleSignInButton
                        onClick={() => {
                          setLinkingProvider('google');
                          triggerLogin();
                        }}
                        isLoading={linkingProvider === 'google'}
                        disabled={!isReady || linkingProvider !== null}
                        renderGoogleButton={isReady ? renderGoogleButton : null}
                        label="Connect Google"
                      />
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[11px] text-neutral-600 font-medium block mt-1.5">
                Primary login email cannot be modified.
              </span>
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="dashboard-profile-phone"
                className="block text-[12px] font-semibold text-neutral-800 mb-1.5"
              >
                Mobile Number
              </label>

              <div className="relative">
                <input
                  id="dashboard-profile-phone"
                  type="tel"
                  autoComplete="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className={`${inputClass} !pl-10 !pr-4`}
                  placeholder="e.g. 9876543210"
                />
                <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6 mt-6 border-t border-neutral-200 flex justify-end">
            <button
              disabled={isUpdatingProfile}
              type="submit"
              className="inline-flex items-center gap-2 bg-[#283618] hover:bg-[#1f2b13] text-white px-7 py-2.5 rounded-full text-[12px] font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.99]"
            >
              {isUpdatingProfile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" strokeWidth={2} />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* Store Policies & Legal Section */}
      <div
        className={
          isDrawer
            ? 'mt-5 bg-[#fdfbf7] border border-[#283618]/15 rounded-2xl p-4 sm:p-5 shadow-xs'
            : 'mt-6 bg-white/75 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] overflow-hidden'
        }
      >
        {/* Section Header */}
        <div
          className={
            isDrawer
              ? 'pb-3 mb-3 border-b border-[#283618]/10'
              : 'bg-[#283618]/5 backdrop-blur-xs px-4 sm:px-5 py-3.5 border-b border-[#283618]/15'
          }
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#283618] text-[#f7bb0e] flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-[13.5px] font-bold text-[#283618] leading-tight">
                  Store Policies & Legal Terms
                </h3>
                <p className="text-[10.5px] text-neutral-500 font-medium">
                  Review shipping, cancellations, refunds & data privacy
                </p>
              </div>
            </div>
            <Link
              to="/policy/shipping-policy"
              className="text-[11px] font-bold text-[#283618] hover:text-[#7a5a00] flex items-center gap-1 shrink-0 bg-white/80 border border-[#283618]/15 px-2.5 py-1 rounded-full transition-all hover:bg-white"
            >
              <span>View All</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Policies List */}
        <div className={isDrawer ? 'space-y-2' : 'p-4 sm:p-5 space-y-2.5'}>
          {policiesList.map((policy) => {
            const isExpanded = expandedPolicySlug === policy.slug;
            const IconComponent = policy.icon || ShieldCheck;

            return (
              <div
                key={policy.slug}
                className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'bg-white border-[#283618]/30 shadow-xs ring-1 ring-[#283618]/10'
                    : 'bg-white/70 hover:bg-white border-neutral-200/80 hover:border-[#283618]/20'
                }`}
              >
                {/* Policy Header Bar */}
                <div
                  onClick={() =>
                    setExpandedPolicySlug((prev) => (prev === policy.slug ? null : policy.slug))
                  }
                  className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isExpanded ? 'bg-[#283618] text-[#f7bb0e]' : 'bg-[#283618]/8 text-[#283618]'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12.5px] font-bold text-neutral-900 truncate">
                          {policy.title}
                        </span>
                        {policy.badge && (
                          <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-[#f7bb0e]/20 text-[#684c00] border border-[#f7bb0e]/30 shrink-0">
                            {policy.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 font-medium truncate mt-0.5">
                        {policy.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModalPolicy(policy);
                      }}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-[#283618] hover:bg-[#283618]/10 transition-colors cursor-pointer"
                      title="Quick Preview"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </button>

                    <Link
                      to={`/policy/${policy.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-[#283618] hover:bg-[#283618]/10 transition-colors"
                      title="Open Dedicated Page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>

                    <div className="w-5 h-5 flex items-center justify-center text-neutral-400">
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[#283618]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Policy Highlights & Quick View */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-neutral-100 bg-neutral-50/70 p-3.5 text-neutral-700 text-xs space-y-3"
                    >
                      <p className="text-[11.5px] leading-relaxed text-neutral-600 font-medium">
                        {policy.tagline}
                      </p>

                      {/* Key highlights from sections */}
                      {policy.sections && policy.sections.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#283618]/80 block">
                            Key Highlights
                          </span>
                          <div className="grid grid-cols-1 gap-1.5">
                            {policy.sections.slice(0, 3).map((sec, idx) => (
                              <div
                                key={idx}
                                className="bg-white p-2.5 rounded-lg border border-neutral-200/60 shadow-2xs"
                              >
                                {sec.heading && (
                                  <div className="font-bold text-[11px] text-[#283618] mb-0.5">
                                    {sec.heading}
                                  </div>
                                )}
                                {sec.highlight ? (
                                  <div className="text-[10.5px] text-amber-900 font-medium flex items-start gap-1.5">
                                    <Sparkles className="w-3 h-3 text-[#c89611] shrink-0 mt-0.5" />
                                    <span>{sec.highlight}</span>
                                  </div>
                                ) : (
                                  <div className="text-[10.5px] text-neutral-600 line-clamp-2">
                                    {sec.paragraph}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons inside expanded card */}
                      <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setActiveModalPolicy(policy)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 shadow-2xs transition-all cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3 text-[#283618]" />
                          <span>Quick Read Document</span>
                        </button>

                        <Link
                          to={`/policy/${policy.slug}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-[#283618] hover:bg-[#1f2b13] text-white shadow-2xs transition-all"
                        >
                          <span>Full Policy Page</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Policy Reader Modal Portal */}
      {typeof document !== 'undefined' &&
        activeModalPolicy &&
        createPortal(
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4">
            {/* Backdrop */}
            <div
              onClick={() => setActiveModalPolicy(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            />

            {/* Modal Card */}
            <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] z-10 border border-neutral-200">
              {/* Header */}
              <div className="bg-[#283618] text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/15 text-[#f7bb0e] flex items-center justify-center">
                    {React.createElement(activeModalPolicy.icon || ShieldCheck, {
                      className: 'w-4 h-4',
                    })}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm sm:text-base text-white">
                      {activeModalPolicy.title}
                    </h3>
                    {activeModalPolicy.badge && (
                      <span className="text-[10px] text-[#f7bb0e] font-medium">
                        {activeModalPolicy.badge} • Akula's Kitchen Official Policy
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModalPolicy(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-left text-neutral-800 text-[13px] leading-relaxed custom-scrollbar flex-1">
                {activeModalPolicy.sections && activeModalPolicy.sections.length > 0 ? (
                  activeModalPolicy.sections.map((set, i) => (
                    <div key={i} className="space-y-2">
                      {set.heading && (
                        <h4 className="font-display font-bold text-sm sm:text-[15px] text-[#283618]">
                          {set.heading}
                        </h4>
                      )}
                      <p className="whitespace-pre-line text-[#374151]">{set.paragraph}</p>
                      {set.highlight && (
                        <div className="bg-[#fdfbf7] border-l-4 border-[#f7bb0e] p-3 rounded-r-lg text-xs font-medium text-[#3b2d03] flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#c89611] shrink-0 mt-0.5" />
                          <span>{set.highlight}</span>
                        </div>
                      )}
                      {i < activeModalPolicy.sections.length - 1 && (
                        <hr className="border-t border-neutral-100 my-4" />
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-neutral-500">Policy details are being updated.</p>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 bg-neutral-50 border-t border-neutral-200/80 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-neutral-500 font-medium hidden sm:inline">
                  Akula's Kitchen Customer Assurance
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveModalPolicy(null)}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-700 hover:bg-neutral-200/70 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <Link
                    to={`/policy/${activeModalPolicy.slug}`}
                    onClick={() => setActiveModalPolicy(null)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#283618] hover:bg-[#1f2b13] text-white transition-all shadow-xs"
                  >
                    <span>Full Policy Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </motion.div>
  );
}
