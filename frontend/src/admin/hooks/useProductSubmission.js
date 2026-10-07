import { useState } from 'react';
import { productService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import logger from '../../utils/core/logger';

export function useProductSubmission({
  formData,
  setFormData,
  isEditMode,
  id,
  deleteDraft,
  queryClient,
  refreshProducts,
  handleSuccessAction,
  setIsLoading,
}) {
  const [newVariant, setNewVariant] = useState({ name: '', value: '', price: '', stock: '' });

  const _swapPrimaryImage = (index) => {
    const newImages = [...formData.images];
    const oldPrimary = formData.imageSrc;
    const newPrimary = newImages[index];

    if (newPrimary) {
      newImages[index] = oldPrimary;
      setFormData({
        ...formData,
        imageSrc: newPrimary,
        images: newImages.filter(Boolean),
      });
      toast.success('Updated primary listing image');
    }
  };

  // Add Variants with duplicate prevention and clean pricing
  const handleAddVariant = () => {
    const trimmedName = (newVariant.name || '').trim();
    const trimmedValue = (newVariant.value || '').trim();

    if (!trimmedName || !trimmedValue) {
      return toast.error('Please specify both Variant attribute name & value');
    }

    const isDuplicate = formData.variants?.some(
      (v) =>
        v.name?.trim().toLowerCase() === trimmedName.toLowerCase() &&
        v.value?.trim().toLowerCase() === trimmedValue.toLowerCase(),
    );

    if (isDuplicate) {
      return toast.error(`Variant "${trimmedName}: ${trimmedValue}" is already added.`);
    }

    const priceNum =
      newVariant.price !== '' && !isNaN(Number(newVariant.price)) ? Number(newVariant.price) : 0;

    setFormData((prev) => ({
      ...prev,
      variants: [
        ...(prev.variants || []),
        {
          ...newVariant,
          name: trimmedName,
          value: trimmedValue,
          price: priceNum,
          id: Date.now(),
        },
      ],
    }));

    // Keep the current attribute name so the user can quickly add another option for the same attribute!
    setNewVariant({ name: trimmedName, value: '', price: '', stock: '' });
    toast.success(`Added ${trimmedName}: ${trimmedValue}`);
  };

  const handleRemoveVariant = (vid) => {
    setFormData((prev) => ({
      ...prev,
      variants: (prev.variants || []).filter((v) => v.id !== vid),
    }));
  };

  const handleRemoveAttributeGroup = (attributeName) => {
    if (!attributeName) return;
    setFormData((prev) => ({
      ...prev,
      variants: (prev.variants || []).filter(
        (v) => v.name?.trim().toLowerCase() !== attributeName.trim().toLowerCase(),
      ),
    }));
    toast.success(`Removed all ${attributeName} options`);
  };

  // Submit Handler
  const handleSubmit = async (e, options = { stayOnPage: false }) => {
    if (e) e.preventDefault();
    if (formData.images.length > 0 && !formData.imageSrc) {
      setFormData((prev) => ({ ...prev, imageSrc: prev.images[0] }));
      formData.imageSrc = formData.images[0]; // also set locally for the check below
    }
    if (
      !formData.title ||
      !formData.price ||
      (!formData.category && !formData.primaryCategory) ||
      !formData.imageSrc
    ) {
      return toast.error('Please fill in all mandatory fields before publishing');
    }

    setIsLoading(true);
    try {
      let finalImageSrc = formData.imageSrc;
      let finalImages = [...formData.images].filter(Boolean);

      // Upload pending local images and remote URLs
      if (formData.pendingUploads && formData.pendingUploads.length > 0) {
        toast.loading('Uploading images...', { id: 'upload-toast' });
        // Include http/https to catch newly added pending remote URLs
        const activeLocalUrls = [finalImageSrc, ...finalImages].filter(
          (url) => url && (url.startsWith('blob:') || url.startsWith('http')),
        );

        const uploadData = new FormData();
        const localUrlMap = {};
        let uploadIndex = 0;

        try {
          for (const url of activeLocalUrls) {
            const pending = formData.pendingUploads.find((p) => p.localUrl === url);
            if (pending) {
              if (localUrlMap[url] === undefined) {
                uploadData.append('file', pending.file);
                localUrlMap[url] = uploadIndex++;
              }
            }
          }

          // Upload all pending files and remote URLs directly to Cloudinary (bypassing backend limits)
          let uploadedImages = [];
          if (uploadIndex > 0) {
            const { uploadDirectToCloudinary } = await import('../../services/api/_shared');
            const res = await uploadDirectToCloudinary(uploadData, false, 'products');

            if (res.success && (res.images || res.url)) {
              uploadedImages = res.images || [res.url];
            } else {
              throw new Error('Failed to upload images');
            }
          }

          // Replace local blob URLs and pending remote URLs with the uploaded Cloudinary URLs
          if (finalImageSrc && localUrlMap[finalImageSrc] !== undefined) {
            finalImageSrc = uploadedImages[localUrlMap[finalImageSrc]];
          }

          for (let i = 0; i < finalImages.length; i++) {
            if (finalImages[i] && localUrlMap[finalImages[i]] !== undefined) {
              finalImages[i] = uploadedImages[localUrlMap[finalImages[i]]];
            }
          }
        } catch (error) {
          import('../../utils/core/logger').then(({ default: logger }) => {
            logger.error('Failed to upload pending images:', error);
          });
          toast.error(error.message || 'Failed to upload images. Please try again.');
          return null; // Return null instead of re-throwing to handle gracefully
        }
        toast.dismiss('upload-toast');
      }

      const payload = {
        title: formData.title,
        customerNote: formData.customerNote || undefined,
        slug:
          formData.slug ||
          formData.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
        category: formData.primaryCategory || formData.category,
        material: formData.material || undefined,
        tags:
          typeof formData.tags === 'string'
            ? formData.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : formData.tags,
        price: Number(formData.price),
        oldPrice: formData.oldPrice ? Number(formData.oldPrice) : undefined,
        stock: Number(formData.stock),
        imageSrc: finalImageSrc,
        images: Array.from(new Set([finalImageSrc, ...finalImages].filter(Boolean))),
        badges:
          typeof formData.badges === 'string'
            ? formData.badges
                .split(',')
                .map((b) => b.trim())
                .filter(Boolean)
            : formData.badges,
        description: formData.description,
        dimensions: formData.dimensions || undefined,
        weight: formData.weight || undefined,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        featured: Boolean(formData.featured),
        isActive: Boolean(formData.isActive),
        isNonRefundable: !formData.returnSettings?.isReturnable,
        variants: formData.variants,
        optionGroups: Array.isArray(formData.optionGroups)
          ? formData.optionGroups.map((grp) => {
              let style = String(grp.displayStyle || '')
                .toUpperCase()
                .trim();
              if (style === 'CARDS') {
                style = grp.type === 'MULTI_SELECT' ? 'CHECKBOX_CARDS' : 'RADIO_CARDS';
              } else if (style === 'PILLS') {
                style = 'BUTTON_GROUP';
              } else if (
                !['RADIO_CARDS', 'CHECKBOX_CARDS', 'DROPDOWN', 'BUTTON_GROUP'].includes(style)
              ) {
                style = grp.type === 'MULTI_SELECT' ? 'CHECKBOX_CARDS' : 'RADIO_CARDS';
              }
              return {
                ...grp,
                groupId: grp.groupId || grp.id || grp._id,
                displayStyle: style,
                options: (grp.options || []).map((opt, oIdx) => ({
                  ...opt,
                  optionId: opt.optionId || opt.id || opt._id || opt.value,
                  label: opt.label,
                  value: opt.value || opt.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                  priceAdjustment: Number(opt.priceAdjustment) || 0,
                  available: opt.available !== false,
                  default: Boolean(opt.default ?? opt.isDefault),
                  isDefault: Boolean(opt.default ?? opt.isDefault),
                  sortOrder: opt.sortOrder ?? oIdx,
                })),
              };
            })
          : [],
        returnSettings: formData.returnSettings
          ? {
              returnWindow: Number(formData.returnSettings.returnWindowDays) || 0,
              exchangeWindow: Number(formData.returnSettings.exchangeWindowDays) || 0,
              restockingFeePercent: Number(formData.returnSettings.restockingFeePercentage) || 0,
              inspectionRequired: formData.returnSettings.requiresInspection,
            }
          : undefined,
      };

      const effectiveId =
        id && id !== 'undefined' && id !== 'null' ? id : formData?._id || formData?.id;
      const isActuallyUpdating = Boolean(
        (isEditMode || formData?._id) &&
        effectiveId &&
        effectiveId !== 'undefined' &&
        effectiveId !== 'null',
      );

      const idempotencyKey = `product_${isActuallyUpdating ? 'update' : 'create'}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const res = isActuallyUpdating
        ? await productService.update(
            effectiveId,
            { ...payload, __v: formData.__v },
            { headers: { 'X-Idempotency-Key': idempotencyKey } },
          )
        : await productService.create(payload, {
            headers: { 'X-Idempotency-Key': idempotencyKey },
          });

      if (res.success) {
        await deleteDraft(); // Delete draft on success
        toast.success(
          isActuallyUpdating
            ? 'Product updated (Changes may take 1-2 mins to reflect)'
            : 'Product published (Changes may take 1-2 mins to reflect)',
        );

        // Use the server-returned entity to update the cache directly
        const returnedProduct = res.data?.product || res.data?.data || res.data;
        const savedId = returnedProduct?._id || returnedProduct?.id || effectiveId;
        if (savedId) {
          queryClient.setQueryData(['product', savedId], returnedProduct);
        }

        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['product_categories'] });
        if (refreshProducts) {
          try {
            await refreshProducts();
          } catch (err) {
            logger.error('Failed to refresh products state', err);
          }
        }
        if (!options.stayOnPage) {
          handleSuccessAction();
        } else {
          // If staying on page, update formData with the real Cloudinary URLs and clear pendingUploads
          setFormData((prev) => ({
            ...prev,
            _id: savedId || prev._id,
            id: savedId || prev.id,
            imageSrc: finalImageSrc,
            images: Array.from(new Set([finalImageSrc, ...finalImages].filter(Boolean))),
            pendingUploads: [],
            __v: returnedProduct?.__v !== undefined ? returnedProduct.__v : (prev.__v || 0) + 1,
          }));
          if (savedId) {
            window.history.replaceState(null, '', `/admin/products/edit/${savedId}`);
          }
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save product listing');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    _swapPrimaryImage,
    handleAddVariant,
    handleRemoveVariant,
    handleRemoveAttributeGroup,
    handleSubmit,
    newVariant,
    setNewVariant,
  };
}
