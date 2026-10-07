import React, { useState } from 'react';
import { AdminToggle } from '../../components/AdminUIKit';
import { AiProviderDropdown } from '../../components/AiProviderDropdown';

export function ProductInfoStep({
  formData,
  setFormData,
  categoriesList,
  isAIGenerating,
  isCustomCategory,
  setIsCustomCategory,
  focusedField,
  handleAIFill,
  aiError,
}) {
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPromptTitle, setAiPromptTitle] = useState('');

  return (
    <div className="space-y-5">
      <div className="flex flex-row justify-between items-start gap-2 sm:gap-3">
        <div className="flex-1 min-w-0 pr-1 sm:pr-2">
          <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">Product Info</h2>
          <p className="text-[10px] sm:text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
            Detail product info, category, and ingredients.
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <AiProviderDropdown
            selectedProviderId={selectedProviderId}
            onChange={setSelectedProviderId}
            disabled={isAIGenerating}
          />
          <button
            type="button"
            onClick={() => setShowAiInput(!showAiInput)}
            disabled={isAIGenerating}
            className="bg-[var(--admin-accent)] text-white px-2.5 sm:px-3 h-9 min-h-[36px] box-border rounded-[4px] text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 shadow-xs hover:opacity-95 transition-all active:scale-95 disabled:opacity-70 cursor-pointer shrink-0"
            title="Auto-Fill with AI"
          >
            {isAIGenerating ? (
              <div className="skeleton-box inline-block w-3.5 h-3.5 rounded-[2px]" />
            ) : (
              <span className="material-symbols-outlined text-[15px]">smart_toy</span>
            )}
            <span className="hidden sm:inline">
              {isAIGenerating ? 'Generating...' : 'Auto-Fill with AI'}
            </span>
            <span className="sm:hidden">{isAIGenerating ? 'AI...' : 'AI Fill'}</span>
          </button>
        </div>
      </div>

      {showAiInput && (
        <div className="bg-[var(--admin-surface)] p-4 rounded-[4px] border border-[var(--admin-border)] mb-4 mt-4 animate-in fade-in slide-in-from-top-2 shadow-xs">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
            Enter Title for AI Generation
          </label>
          <textarea
            value={aiPromptTitle}
            onChange={(e) => setAiPromptTitle(e.target.value)}
            className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-[4px] p-2.5 text-[12.5px] mb-3 outline-none transition-all resize-none"
            placeholder="e.g. Traditional Brass Diya..."
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAiInput(false)}
              className="h-8 px-3 text-[11px] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-muted)] rounded-[4px] font-bold border border-[var(--admin-border)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAiInput(false);
                handleAIFill(aiPromptTitle, selectedProviderId);
              }}
              disabled={!aiPromptTitle.trim()}
              className="h-8 px-3.5 text-[11px] text-white bg-[var(--admin-accent)] rounded-[4px] font-bold disabled:opacity-50 hover:opacity-95 transition-all cursor-pointer shadow-xs"
            >
              Generate
            </button>
          </div>
        </div>
      )}

      {aiError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-[4px] p-3.5 flex items-start gap-3 mt-4 mb-2 shadow-xs animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-red-500 shrink-0 mt-0.5">error</span>
          <div className="flex-1">
            <h3 className="text-red-800 dark:text-red-400 font-bold text-[13px] mb-1">
              AI Auto-Fill Failed
            </h3>
            <p className="text-red-600 dark:text-red-300 text-[12px] leading-relaxed">{aiError}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              // Usually the parent or hook exposes a way to clear the error, or we can just ignore it until the next run.
              // Since we don't have setAiError here, we can just leave it, or let the user try again which clears it.
            }}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors pointer-events-none opacity-0" // Hidden but takes space, or we can just remove the close button for now since re-trying clears it.
          ></button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            English Title <span className="text-error">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Product title"
            className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-[4px] px-3 h-9 text-[12.5px] outline-none transition-all"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Slug (auto-generated from title)
          </label>
          <input
            type="text"
            readOnly
            value={
              formData.title
                ? formData.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '')
                : ''
            }
            placeholder="vintage-teak-mirror"
            className="w-full bg-[var(--admin-bg-subtle)] rounded-[4px] px-3 h-9 text-[12.5px] outline-none transition-all border border-[var(--admin-border)] opacity-70 cursor-not-allowed text-[var(--admin-text-primary)] font-medium"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Ingredients
          </label>
          <input
            type="text"
            value={formData.material}
            onChange={(e) => setFormData({ ...formData, material: e.target.value })}
            placeholder="e.g. Rice, Urad Dal, Red Chilli, Ghee"
            className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-[4px] px-3 h-9 text-[12.5px] outline-none transition-all"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <div className="flex justify-between items-center h-5 mb-1.5">
            <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
              Primary Category <span className="text-error">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setIsCustomCategory(!isCustomCategory);
                setFormData({ ...formData, primaryCategory: '' });
              }}
              className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <span className="material-symbols-outlined text-[12px]">
                {isCustomCategory ? 'list' : 'add_circle'}
              </span>
              {isCustomCategory ? 'Select from list' : 'Add Custom'}
            </button>
          </div>
          {isCustomCategory ? (
            <input
              type="text"
              required
              value={formData.primaryCategory}
              onChange={(e) => setFormData({ ...formData, primaryCategory: e.target.value })}
              placeholder="e.g. Pickles, Podis, Batters, Snacks, Sweets"
              className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-[4px] px-3 h-9 text-[12.5px] outline-none transition-all"
            />
          ) : (
            <select
              required
              value={formData.primaryCategory}
              onChange={(e) => setFormData({ ...formData, primaryCategory: e.target.value })}
              className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-[4px] px-3 h-9 text-[12.5px] outline-none transition-all"
            >
              <option value="">
                {categoriesList.length === 0
                  ? 'No categories yet — click "+ Add Custom"'
                  : 'Select Category'}
              </option>
              {categoriesList.map((c) => {
                const name = typeof c === 'string' ? c : c?.name;
                if (!name) return null;
                return (
                  <option key={name} value={name}>
                    {name}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        <div className="col-span-2">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Secondary Categories (Optional)
          </label>
          <div className="flex flex-wrap gap-2 p-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] max-h-40 overflow-y-auto">
            {categoriesList
              .filter((c) => c !== formData.primaryCategory)
              .map((c) => {
                const isSelected = formData.secondaryCategories?.includes(c);
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => {
                      const current = formData.secondaryCategories || [];
                      if (isSelected) {
                        setFormData({
                          ...formData,
                          secondaryCategories: current.filter((cat) => cat !== c),
                        });
                      } else {
                        setFormData({ ...formData, secondaryCategories: [...current, c] });
                      }
                    }}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-[4px] border transition-all ${
                      isSelected
                        ? 'bg-[var(--admin-accent)] text-white border-[var(--admin-accent)]'
                        : 'bg-[var(--admin-bg-subtle)] text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:border-[var(--admin-accent)]'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            {categoriesList.length === 0 && (
              <p className="text-[11px] text-[var(--admin-text-tertiary)] italic py-1">
                No other categories available.
              </p>
            )}
          </div>
        </div>

        <div className="col-span-2">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Product Description
          </label>
          <textarea
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter product description..."
            className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-[4px] p-3 text-[12.5px] outline-none transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );
}
