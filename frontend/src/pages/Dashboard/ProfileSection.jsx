import { User, Save, Mail, Smartphone, Loader2, ShieldCheck } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { userService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { useGoogleIdentity } from '../../hooks/useGoogleIdentity';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export function ProfileSection() {
  const { user: dashboardUser, checkAuth, addresses } = useDashboard();
  const { user, refreshUser } = useAuth();

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

  // Phone linking state
  const [phoneToLink, setPhoneToLink] = useState('');
  const [phoneChallenge, setPhoneChallenge] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [isLinkingPhone, setIsLinkingPhone] = useState(false);

  useEffect(() => {
    if (dashboardUser) {
      let initialName = dashboardUser.name || '';
      if (!initialName || initialName === 'Customer') {
        const addrWithName = addresses?.find(
          (a) => a.name && a.name.trim() && a.name.trim().toLowerCase() !== 'customer',
        );
        if (addrWithName) {
          initialName = addrWithName.name.trim();
        }
      }

      setProfileForm({
        name: initialName,
        phone: dashboardUser.phone || '',
        gender: dashboardUser.gender || '',
      });
      if (dashboardUser.phone && !phoneToLink) {
        setPhoneToLink(dashboardUser.phone);
      }
    }
  }, [dashboardUser, phoneToLink, addresses]);

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
      if (res.success) {
        toast.success('Profile updated successfully');
        await checkAuth();
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
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disconnect account');
    } finally {
      setLinkingProvider(null);
    }
  };

  const handlePhoneRequest = async (e) => {
    e.preventDefault();
    const targetPhone = phoneToLink || profileForm.phone;
    if (!targetPhone || targetPhone.length < 10) return;
    try {
      setLinkingProvider('phone-request');
      const res = await api.post('/auth/link/phone/request', { phone: targetPhone });
      setPhoneChallenge(res.data.data.challengeId);
      setIsLinkingPhone(true);
      toast.success('Verification code sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send code');
    } finally {
      setLinkingProvider(null);
    }
  };

  const handlePhoneVerify = async (e) => {
    e.preventDefault();
    if (phoneOtp.length !== 6) return;
    try {
      setLinkingProvider('phone-verify');
      await api.post('/auth/link/phone/verify', { challengeId: phoneChallenge, otp: phoneOtp });
      toast.success('Phone number linked successfully');
      setIsLinkingPhone(false);
      setPhoneOtp('');
      fetchProviders();
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    } finally {
      setLinkingProvider(null);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await api.post('/auth/logout-all');
      toast.success('Logged out from all devices');
      window.location.href = '/';
    } catch (err) {
      toast.error('Failed to logout from all devices');
    }
  };

  const googleLinked = providers.find((p) => p.provider === 'google');
  const phoneLinked = providers.find((p) => p.provider === 'phone');

  const inputClass =
    'w-full px-3.5 py-2.5 text-[13px] font-medium text-neutral-900 bg-white border border-neutral-300 rounded-lg outline-none transition-all focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 placeholder:text-neutral-400 font-sans shadow-2xs';

  const inputClassDisabled =
    'w-full px-3.5 py-2.5 text-[13px] font-semibold text-neutral-800 bg-neutral-100/80 border border-neutral-300 rounded-lg cursor-not-allowed font-sans select-all';

  return (
    <motion.div
      id="panel-profile"
      role="tabpanel"
      key="tab-profile"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 text-left pb-8 font-sans"
    >
      {/* Profile Info Card */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="bg-[#283618]/5 px-4 sm:px-5 py-3.5 border-b border-[#283618]/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-[#283618]" strokeWidth={2} />
            <span className="text-[13.5px] font-bold text-[#283618]">Profile Settings</span>
          </div>
          <span className="text-[11px] text-neutral-500 font-medium hidden sm:inline">
            Manage personal details
          </span>
        </div>

        <form onSubmit={handleProfileSave} className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 max-w-2xl">
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
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[10px] font-semibold">
                    <ShieldCheck size={11} /> Google Connected
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    disabled
                    value={dashboardUser?.email || ''}
                    className={`${inputClassDisabled} pl-9`}
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                </div>

                {!isLoading && !googleLinked && (
                  <div className="shrink-0 h-[40px] overflow-hidden rounded-lg">
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
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="dashboard-profile-phone"
                  className="text-[12px] font-semibold text-neutral-800"
                >
                  Mobile Number
                </label>
                {phoneLinked && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[10px] font-semibold">
                    <ShieldCheck size={11} /> Verified
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="dashboard-profile-phone"
                      type="tel"
                      autoComplete="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className={`${phoneLinked ? inputClassDisabled : inputClass} pl-9`}
                      placeholder="e.g. 9876543210"
                      disabled={!!phoneLinked}
                    />
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                  </div>

                  {!isLoading &&
                    (phoneLinked ? (
                      <button
                        type="button"
                        onClick={() => handleUnlink('phone')}
                        disabled={linkingProvider !== null}
                        className="px-3.5 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {linkingProvider === 'phone' ? 'Removing…' : 'Disconnect'}
                      </button>
                    ) : (
                      !isLinkingPhone && (
                        <button
                          type="button"
                          onClick={handlePhoneRequest}
                          disabled={linkingProvider === 'phone-request' || !profileForm.phone}
                          className="px-3.5 py-2 border border-neutral-300 text-neutral-800 hover:bg-neutral-100 hover:border-neutral-400 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          {linkingProvider === 'phone-request' ? 'Sending…' : 'Verify'}
                        </button>
                      )
                    ))}
                </div>

                {isLinkingPhone && (
                  <div className="flex gap-2 items-center bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                    <input
                      type="text"
                      placeholder="6-digit OTP"
                      maxLength={6}
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 text-[13px] font-mono font-semibold text-neutral-900 bg-white border border-neutral-300 rounded-lg outline-none focus:border-[#283618] tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={handlePhoneVerify}
                      disabled={linkingProvider === 'phone-verify' || phoneOtp.length !== 6}
                      className="bg-[#283618] text-white px-4 py-2 text-[11px] font-bold rounded-lg cursor-pointer hover:bg-[#1f2b13] transition-colors shrink-0 disabled:opacity-50 shadow-xs"
                    >
                      {linkingProvider === 'phone-verify' ? (
                        <Loader2 className="animate-spin inline-block" size={12} />
                      ) : (
                        'Verify'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6 mt-6 border-t border-neutral-200 flex justify-end">
            <button
              disabled={isUpdatingProfile}
              type="submit"
              className="inline-flex items-center gap-2 bg-[#283618] hover:bg-[#1f2b13] text-white px-6 py-2.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.99]"
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
    </motion.div>
  );
}
