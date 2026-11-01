import { m as motion } from 'framer-motion';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { useDraft } from '../hooks/useDraft';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { AdminContentSkeleton, PublishBar, PageHeader } from '../components/AdminUIKit';
import { HomePageControllerEditor } from '../components/cms/HomePageControllerEditor';
import { MenuPageEditor } from '../components/cms/MenuPageEditor';

// ═══════════════════════════════════════════════════════════
// ANIMATION PRESETS (LINEAR LUXURY FADES)
// ═══════════════════════════════════════════════════════════
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = { show: { transition: { staggerChildren: 0.05 } } };

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT ENTRYPOINT (FULL-WIDTH THEME WORKSPACE)
// ═══════════════════════════════════════════════════════════
export function AdminContent() {
  const {
    websiteContent,
    updateContent,
    bulkUpdateContent,
    publishAllContent,
    hasUnsavedContent,
    autoPublish,
    dataLoading,
  } = useAdmin();

  const [isPublishing, setIsPublishing] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentSection = searchParams.get('section') || 'homepage';
  const isMenuPage = currentSection === 'menu-page';

  const {
    formData: draftWebsiteContent,
    setFormData: setDraftWebsiteContent,
    draftStatus,
    showRestoreModal,
    restoreDraft,
    discardDraft,
    deleteDraft,
    lastSavedAt,
    blocker,
  } = useDraft({
    draftKey: 'admin:content:all',
    module: 'Content',
    pageTitle: 'Content Management',
    initialData: websiteContent,
    enabled: !dataLoading,
    onRestored: (draftInfo) => {
      if (draftInfo?.formData) {
        bulkUpdateContent(draftInfo.formData);
      }
    },
  });

  const isDraftMode = true;
  // Use draft content if in draft mode, otherwise fallback to context content
  const activeContent = isDraftMode ? draftWebsiteContent : websiteContent;

  const handleUpdateContent = (section, payload) => {
    if (isDraftMode) {
      setDraftWebsiteContent((prev) => {
        let updatedSection;
        if (Array.isArray(payload)) {
          updatedSection = [...payload];
          updatedSection.status = 'modified';
        } else if (Array.isArray(prev[section])) {
          updatedSection = [...prev[section]];
          Object.assign(updatedSection, payload);
          updatedSection.status = 'modified';
        } else {
          updatedSection = { ...(prev[section] || {}), ...payload, status: 'modified' };
        }
        return {
          ...prev,
          [section]: updatedSection,
        };
      });
    }

    updateContent(section, payload, isDraftMode);
  };

  const handlePublishAll = async () => {
    try {
      setIsPublishing(true);
      await publishAllContent(activeContent);
      await deleteDraft();
    } finally {
      setIsPublishing(false);
    }
  };

  if (dataLoading) {
    return <AdminContentSkeleton />;
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6 relative font-sans text-[var(--admin-text-primary)] max-w-7xl mx-auto w-full"
    >
      {/* Top Page Header matching Products & Orders style */}
      <PageHeader
        title={isMenuPage ? 'Menu Page Controller' : 'Edit Website'}
        subtitle={
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[12.5px] sm:text-[13px]">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live Sync Active
            </span>

            {/* Quick Switcher between Homepage Website Sections & Weekly Menu Planner */}
            <div className="flex items-center bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] p-0.5 rounded-[6px]">
              <button
                type="button"
                onClick={() => setSearchParams({ section: 'homepage' })}
                className={`px-2.5 sm:px-3 py-1 text-[11.5px] sm:text-[12px] font-semibold rounded-[4px] transition-all cursor-pointer ${
                  !isMenuPage
                    ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-2xs font-bold'
                    : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                }`}
              >
                Website Sections
              </button>
              <button
                type="button"
                onClick={() => setSearchParams({ section: 'menu-page' })}
                className={`px-2.5 sm:px-3 py-1 text-[11.5px] sm:text-[12px] font-semibold rounded-[4px] transition-all cursor-pointer ${
                  isMenuPage
                    ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-2xs font-bold'
                    : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                }`}
              >
                Weekly Menu Planner
              </button>
            </div>
          </div>
        }
        headerAction={
          <div className="flex items-center gap-2.5 sm:gap-3">
            <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} compact />
            <button
              type="button"
              onClick={handlePublishAll}
              disabled={isPublishing}
              className="h-[38px] px-3.5 sm:px-4 rounded-[4px] bg-[var(--admin-accent)] hover:opacity-95 text-white text-[12px] sm:text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50 shrink-0"
            >
              {isPublishing ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <span className="material-symbols-outlined text-[17px]">publish</span>
              )}
              <span>Publish Live</span>
            </button>
          </div>
        }
      />

      {/* Main Form Workspace - Full Width */}
      <motion.div variants={fadeUp} className="w-full">
        {isMenuPage ? (
          <MenuPageEditor content={activeContent} onUpdate={handleUpdateContent} />
        ) : (
          <HomePageControllerEditor
            content={activeContent.homepage || activeContent}
            onUpdate={handleUpdateContent}
          />
        )}
      </motion.div>

      <PublishBar hasChanges={hasUnsavedContent} onPublish={handlePublishAll} onReset={() => {}} />

      {!autoPublish && (
        <DraftRestoreModal
          isOpen={showRestoreModal}
          onRestore={restoreDraft}
          onDiscard={discardDraft}
          moduleName="Content"
          lastSavedAt={lastSavedAt}
        />
      )}

      <UnsavedChangesGuard blocker={blocker} />
    </motion.div>
  );
}

export default AdminContent;
