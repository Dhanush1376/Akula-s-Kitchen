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
    </motion.div>
  );
}
