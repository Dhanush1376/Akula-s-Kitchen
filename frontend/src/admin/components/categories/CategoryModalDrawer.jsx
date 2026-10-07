import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, Edit3, X, Sparkles } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../../utils/core/errorHelpers';
import { AdminToggle } from '../AdminUIKit';
import { useMobileDrawerEngine, DrawerDragHandle } from '../../../components/ui/drawer';

export function CategoryModalDrawer({ isOpen, onClose, category = null, onSuccess }) {
  const isEditMode = Boolean(category && (category._id || category.id));

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('product');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen,
    onClose: !submitting ? onClose : undefined,
  });

  // Sync state when category or modal open state changes
  useEffect(() => {
    if (isOpen) {
      if (category) {
        setName(category.name || '');
        setSlug(category.slug || '');
        setType(category.type || 'product');
        setIsActive(category.isActive !== undefined ? category.isActive : true);
      } else {
        setName('');
        setSlug('');
        setType('product');
        setIsActive(true);
      }
    }
  }, [category, isOpen]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  const generateSlug = (val) => {
    return (val || '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    setSlug(generateSlug(val));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalSlug = slug.trim() || generateSlug(name.trim());
    if (!name.trim()) return toast.error('Category Name is required');
    if (!finalSlug) return toast.error('Slug identifier could not be generated');

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        slug: finalSlug,
        type,
        isActive,
      };

      const categoryId = category?._id || category?.id;

      if (isEditMode && categoryId) {
        await api.put(`/categories/${categoryId}`, payload);
        toast.success('Category updated successfully');
      } else {
        await api.post('/categories', payload);
        toast.success('Category created successfully');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save category'));
    } finally {
      setSubmitting(false);
    }
  };

  if (typeof document === 'undefined') return null;

  const isDark =
    typeof document !== 'undefined' &&
    (document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark') ||
      !!document.querySelector('.admin-section-root.dark'));

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className={`admin-section-root ${isDark ? 'dark' : ''}`}>
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Solid Blurred Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={!submitting ? onClose : undefined}
              className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md cursor-pointer"
            />

            {/* Modal / Mobile App Drawer Card */}
            <motion.div
              initial={{
                opacity: 0,
                y: isMobile ? '100%' : 12,
                scale: isMobile ? 1 : 0.98,
              }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                y: isMobile ? '100%' : 12,
                scale: isMobile ? 1 : 0.98,
              }}
              transition={sheetTransition}
              {...dragProps}
              className="relative w-full sm:max-w-lg bg-white dark:bg-[#201e19] rounded-t-2xl sm:rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {isMobile && <DrawerDragHandle onClick={!submitting ? onClose : undefined} />}

              {/* Header */}
              <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/70 dark:bg-[#1a1815]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#d4a41c]/15 text-[#d4a41c] flex items-center justify-center shrink-0 shadow-xs">
                    {isEditMode ? (
                      <Edit3 className="w-5 h-5 text-[#d4a41c]" />
                    ) : (
                      <FolderPlus className="w-5 h-5 text-[#d4a41c]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-[15px] sm:text-[16px] font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                      {isEditMode ? 'Edit Category' : 'Create Category'}
                    </h3>
                    <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {isEditMode
                        ? 'Update category classification and storefront parameters'
                        : 'Define category taxonomy for storefront catalog navigation'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={!submitting ? onClose : undefined}
                  disabled={submitting}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
                  title="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 overflow-y-auto overscroll-contain touch-pan-y space-y-5 flex-1 bg-white dark:bg-[#201e19]">
                  {/* 1. Category Name */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                      Category Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pickles, Chutneys, Spice Blends"
                      value={name}
                      onChange={handleNameChange}
                      className="w-full h-10 rounded-lg bg-neutral-50 dark:bg-[#181613] border border-neutral-300 dark:border-neutral-700 focus:border-[#d4a41c] focus:ring-2 focus:ring-[#d4a41c]/20 px-3.5 text-[13.5px] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 font-medium outline-none transition-all"
                    />
                  </div>

                  {/* 2. Slug / URL Path */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                        Slug / Identifier <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#d4a41c]" />
                        Auto-generated
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-neutral-400 font-mono text-[13px] select-none">
                        /
                      </span>
                      <input
                        type="text"
                        readOnly
                        placeholder="auto-generated-from-title"
                        value={slug}
                        className="w-full h-10 pl-7 pr-3 rounded-lg bg-neutral-100/80 dark:bg-[#181613]/70 border border-neutral-200 dark:border-neutral-800 text-[12.5px] font-mono text-neutral-600 dark:text-neutral-400 select-all outline-none cursor-default"
                      />
                    </div>
                  </div>

                  {/* 4. Publishing Status Toggle */}
                  <div className="pt-1">
                    <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-[#181613] border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">
                            Publishing Status
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500 border border-neutral-300 dark:border-neutral-700'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {isActive
                            ? 'Category is published and visible on the storefront'
                            : 'Hidden from storefront navigation and products'}
                        </p>
                      </div>
                      <AdminToggle
                        checked={isActive}
                        onChange={() => setIsActive(!isActive)}
                        className="!py-0 !border-b-0 shrink-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Sticky Footer Action Bar */}
                <div className="px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#1a1815] flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={!submitting ? onClose : undefined}
                    disabled={submitting}
                    className="h-9 px-4 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 font-semibold text-[12.5px] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-9 px-5 rounded-lg bg-[#d4a41c] hover:bg-[#c29517] active:scale-[0.98] text-neutral-950 font-bold text-[12.5px] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-neutral-950/30 border-t-neutral-950 rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{isEditMode ? 'Save Changes' : 'Create Category'}</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
export default CategoryModalDrawer;
