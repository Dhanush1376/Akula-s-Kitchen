import {
  BadgeCheck,
  X,
  MessageSquare,
  Camera,
  Plus,
  Pencil,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  Check,
} from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { OptimizedImage } from '../ui/OptimizedImage';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { reviewService } from '../../services/domainServices';
import { useAuth } from '../../context/AuthContext';
import { SectionHeader } from '../shared/SectionHeader';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import { uploadService } from '../../services/api/uploadService';
import { useMobileDrawerEngine } from '../ui/drawer';
import { ReviewsDrawer } from './ReviewsDrawer';
import { ProductReviewImagesDrawer } from './ProductReviewImagesDrawer';

// ─── Star Component ─────────────────────────────────────────────────────────
function StarRating({ value = 0, max = 5, interactive = false, size = 20, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = interactive ? hovered || value : value;

  return (
    <div className={`flex items-center select-none ${interactive ? 'gap-1.5' : 'gap-0.5'}`}>
      {Array.from({ length: max }).map((_, i) => {
        const starNum = i + 1;
        const filled = starNum <= Math.round(display);
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(starNum)}
            onMouseEnter={() => interactive && setHovered(starNum)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={`transition-all duration-150 ${
              interactive
                ? 'cursor-pointer hover:scale-125 active:scale-95 p-0.5'
                : 'cursor-default'
            }`}
            aria-label={`${starNum} star${starNum !== 1 ? 's' : ''}`}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={filled ? '#F7BB0E' : 'none'}
              stroke={filled ? '#F7BB0E' : '#d1d5db'}
              strokeWidth="1.8"
              className="transition-colors duration-150"
            >
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

// ─── Review Name Helper ──────────────────────────────────────────────────────
export function getPremiumReviewerName(review) {
  return review.customer?.name || review.customerName || 'Anonymous Customer';
}

// ─── Review Card ─────────────────────────────────────────────────────────────
function ReviewCard({ review, productId, onPhotoClick }) {
  const customerName = getPremiumReviewerName(review);
  const initials = customerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <div className="bg-white rounded-xl border border-black/10 shadow-2xs p-3.5 sm:p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-start justify-between gap-2 border-b border-black/10 pb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-[#283618]/10 border border-[#283618]/15 flex items-center justify-center shrink-0">
              <span className="font-display text-[#283618] text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <p className="font-body text-[12.5px] font-bold text-neutral-900 leading-tight truncate">
                  {customerName}
                </p>
                {review.verified && (
                  <span
                    title="Verified Purchase"
                    className="shrink-0 inline-flex items-center text-emerald-600"
                  >
                    <BadgeCheck className="w-3.5 h-3.5" strokeWidth={2.2} />
                  </span>
                )}
              </div>
              {date && (
                <span className="font-sans text-[10px] text-neutral-400 font-normal leading-tight mt-0.5 block">
                  {date}
                </span>
              )}
            </div>
          </div>

          {/* 1-Star Rating at Top Right */}
          {review.rating > 0 && (
            <div className="flex items-center gap-1 shrink-0 pt-0.5">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="#F7BB0E"
                stroke="#F7BB0E"
                strokeWidth="1.5"
                className="shrink-0"
                aria-hidden="true"
              >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
              <span className="font-sans text-[11px] font-bold text-neutral-800 leading-none">
                {Number(review.rating).toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Comment */}
        {review.comment && (
          <p className="font-body text-[12px] text-neutral-700 leading-relaxed pt-2.5 line-clamp-3">
            "{review.comment}"
          </p>
        )}
      </div>

      {review.images && review.images.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-black/[0.06]">
          {review.images.slice(0, 3).map((imgUrl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onPhotoClick?.(imgUrl)}
              className="w-9 h-9 rounded-lg overflow-hidden border border-black/5 bg-neutral-50 shadow-3xs cursor-pointer relative group shrink-0 active:scale-95 transition-transform"
              aria-label={`View review photo ${idx + 1}`}
            >
              <OptimizedImage
                src={imgUrl}
                alt={`Review photo ${idx + 1}`}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </button>
          ))}
          {review.reviewImages && review.reviewImages.length > 3 ? (
            <button
              type="button"
              onClick={() => onPhotoClick?.(review.images[3] || review.images[0])}
              className="w-9 h-9 rounded-lg overflow-hidden border border-black/5 bg-black/60 hover:bg-black/80 flex items-center justify-center text-white text-[9px] font-bold tracking-widest shrink-0 transition-colors cursor-pointer active:scale-95"
              aria-label="View more photos"
            >
              +{review.reviewImages.length - 3}
            </button>
          ) : (
            review.images &&
            review.images.length > 3 && (
              <button
                type="button"
                onClick={() => onPhotoClick?.(review.images[3] || review.images[0])}
                className="w-9 h-9 rounded-lg overflow-hidden border border-black/5 bg-black/60 hover:bg-black/80 flex items-center justify-center text-white text-[9px] font-bold tracking-widest shrink-0 transition-colors cursor-pointer active:scale-95"
                aria-label="View more photos"
              >
                +{review.images.length - 3}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ─── Write Review Drawer ───────────────────────────────────────────────────────
export function WriteReviewModal({
  productId: initialProductId,
  productTitle: initialProductTitle,
  orderItems = [],
  onClose,
  onSuccess,
  existingReview,
}) {
  const { user } = useAuth();

  const normalizedItems = useMemo(() => {
    if (!Array.isArray(orderItems) || orderItems.length === 0) return [];
    const seen = new Set();
    const list = [];
    for (const item of orderItems) {
      const pId =
        item?.productId?._id ||
        (typeof item?.productId === 'string' ? item.productId : null) ||
        (item?.productId && typeof item.productId === 'object' ? item.productId.id : null) ||
        item?.id ||
        item?._id;
      const idStr = pId ? String(pId) : '';
      if (!idStr || seen.has(idStr)) continue;
      seen.add(idStr);

      const title =
        item?.title ||
        (typeof item?.productId === 'object' ? item.productId?.title : null) ||
        item?.name ||
        'Delicacy Item';

      const image =
        item?.imageSrc ||
        (typeof item?.productId === 'object'
          ? item.productId?.imageSrc || item.productId?.images?.[0]
          : null) ||
        '/MainLogo.png';

      const variant = item?.variant && item.variant !== 'Default' ? item.variant : '';

      list.push({
        id: idStr,
        title,
        image,
        variant,
      });
    }
    return list;
  }, [orderItems]);

  const [selectedProductId, setSelectedProductId] = useState(() => {
    if (initialProductId) return String(initialProductId);
    if (normalizedItems.length > 0) return normalizedItems[0].id;
    return '';
  });

  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(String(initialProductId));
    }
  }, [initialProductId]);

  const currentItem = useMemo(() => {
    return (
      normalizedItems.find((it) => it.id === selectedProductId) || {
        id: selectedProductId,
        title: initialProductTitle || 'Product',
        image: '/MainLogo.png',
        variant: '',
      }
    );
  }, [normalizedItems, selectedProductId, initialProductTitle]);

  const activeTitle = currentItem?.title || initialProductTitle || 'Product';

  const handleSelectProduct = (itemId) => {
    if (itemId === selectedProductId) return;
    setSelectedProductId(itemId);
    setRating(0);
    setComment('');
    setSelectedFiles([]);
    setRemoteImages([]);
    setLocalPreviews([]);
  };

  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [remoteImages, setRemoteImages] = useState(
    existingReview?.reviewImages ||
      (existingReview?.images ? existingReview.images.map((url) => ({ secureUrl: url })) : []),
  );
  const [localPreviews, setLocalPreviews] = useState([]);
  const combinedPreviews = [...remoteImages.map((img) => img.secureUrl), ...localPreviews];

  const userInitials = useMemo(() => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [user]);

  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen: true,
    onClose,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return toast.error('Please select a star rating.');
    if (comment.trim().length < 10) return toast.error('Please write at least 10 characters.');

    setSubmitting(true);
    try {
      let newReviewImages = [];
      if (selectedFiles.length > 0) {
        toast.loading('Compressing and uploading review images...', { id: 'review-upload' });
        const formData = new FormData();

        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        };

        for (const file of selectedFiles) {
          try {
            const compressedFile = await imageCompression(file, options);
            formData.append('images', compressedFile, file.name);
          } catch (error) {
            console.error('Compression error:', error);
            formData.append('images', file);
          }
        }

        const uploadRes = await uploadService.uploadReviewImages(formData);
        newReviewImages =
          uploadRes.reviewImages ||
          (uploadRes.images ? uploadRes.images.map((url) => ({ secureUrl: url })) : []);
        toast.dismiss('review-upload');
      }

      const finalReviewImages = [...remoteImages, ...newReviewImages];

      if (existingReview) {
        await reviewService.update(existingReview._id, {
          rating,
          comment: comment.trim(),
          reviewImages: finalReviewImages,
          images: finalReviewImages.map((img) => img.secureUrl),
        });
        toast.success('Your review has been updated and is pending approval.');
      } else {
        await reviewService.create({
          productId: selectedProductId || initialProductId,
          rating,
          comment: comment.trim(),
          reviewImages: finalReviewImages,
          images: finalReviewImages.map((img) => img.secureUrl),
        });
        toast.success('Your review has been submitted for approval!');
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.dismiss('review-upload');
      const msg = err?.response?.data?.message || 'Failed to submit review.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  const drawerVariants = {
    initial: isMobile ? { y: '100%', x: 0 } : { x: '100%', y: 0 },
    animate: { x: 0, y: 0 },
    exit: isMobile ? { y: '100%', x: 0 } : { x: '100%', y: 0 },
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] pointer-events-none flex items-end sm:items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto cursor-pointer"
        onClick={onClose}
      />

      {/* Floating Bottom Sheet Shell */}
      <motion.div
        variants={{
          initial: isMobile ? { y: '100%', opacity: 0.5 } : { opacity: 0, scale: 0.95, y: 15 },
          animate: { y: 0, opacity: 1, scale: 1 },
          exit: isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 },
        }}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={sheetTransition}
        {...(isMobile ? dragProps : {})}
        className="relative z-10 pointer-events-auto flex flex-col w-full max-w-[480px] mx-auto"
        style={{
          marginBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : undefined,
        }}
      >
        <div className="relative w-full bg-white/95 backdrop-blur-2xl rounded-3xl p-4 sm:p-5 shadow-[0_12px_45px_rgba(0,0,0,0.18)] flex flex-col max-h-[85dvh] sm:max-h-[88dvh] overflow-hidden border border-black/[0.08]">
          {/* Handlebar for bottom sheet feel */}
          <div className="sm:hidden w-full flex justify-center pb-2">
            <div className="w-10 h-1 rounded-full bg-neutral-300" />
          </div>

          {/* Header Row with integrated close button */}
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-black/[0.06]">
            <div className="flex flex-col min-w-0 pr-2">
              <h2 className="font-sans text-[20px] sm:text-[22px] text-neutral-900 font-bold leading-tight">
                {existingReview ? 'Edit Review' : 'Write a Review'}
              </h2>
              <span className="font-sans text-[10px] sm:text-[10.5px] text-neutral-500 uppercase tracking-widest font-semibold mt-0.5 truncate">
                {activeTitle}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8.5 h-8.5 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 hover:text-black transition-all shrink-0 cursor-pointer shadow-2xs"
              aria-label="Close review modal"
            >
              <X className="w-4 h-4 text-black" strokeWidth={2.2} />
            </button>
          </div>

          {/* Form Wrapping Body and Sticky Bottom Bar */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y no-scrollbar pt-1 space-y-3">
              {/* Product Selection for Multi-Item Orders */}
              {normalizedItems.length > 1 && !existingReview && (
                <div className="p-3 bg-[#fdfbf6] border border-amber-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-neutral-800 uppercase tracking-wider">
                      Select item to review:
                    </span>
                    <span className="text-[10px] text-amber-900/80 font-medium">
                      {normalizedItems.length} items in order
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {normalizedItems.map((item) => {
                      const isSelected = item.id === selectedProductId;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectProduct(item.id)}
                          className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-white border-[#283618] ring-1 ring-[#283618] shadow-2xs'
                              : 'bg-white/70 border-neutral-200/80 hover:bg-white hover:border-neutral-300'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = '/MainLogo.png';
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-[12px] font-semibold truncate leading-tight ${
                                isSelected ? 'text-[#283618]' : 'text-neutral-800'
                              }`}
                            >
                              {item.title}
                            </p>
                            {item.variant && (
                              <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                                {item.variant}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[#283618] text-white flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* User Profile Info */}
              <div className="flex items-center gap-2.5 px-3 py-2 bg-neutral-100/70 rounded-2xl border border-black/[0.04]">
                <div className="w-8 h-8 rounded-full bg-[#283618] text-[#f7bb0e] flex items-center justify-center shrink-0 font-bold text-[11px] shadow-2xs">
                  <span>{userInitials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[9.5px] uppercase tracking-wider text-neutral-500 font-bold leading-none mb-0.5">
                    Reviewing as
                  </p>
                  <p className="text-[12.5px] font-bold text-neutral-900 capitalize truncate">
                    {user?.name || 'Verified Customer'}
                  </p>
                </div>
              </div>

              {/* Star Picker */}
              <div className="flex flex-col items-center gap-1.5 py-3 px-4 bg-neutral-50/70 rounded-2xl border border-black/[0.05]">
                <span className="font-sans text-[11px] uppercase tracking-wider font-bold text-neutral-700">
                  Your Rating
                </span>
                <div className="py-0.5">
                  <StarRating value={rating} interactive size={34} onChange={setRating} />
                </div>
                {rating > 0 ? (
                  <motion.span
                    key={rating}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-[10.5px] font-bold uppercase tracking-wider text-[#283618] bg-[#283618]/10 px-2.5 py-0.5 rounded-full"
                  >
                    {ratingLabels[rating]}
                  </motion.span>
                ) : (
                  <span className="text-[10.5px] text-neutral-400 font-medium">
                    Tap a star to rate
                  </span>
                )}
              </div>

              {/* Comment */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 font-sans text-[11.5px] sm:text-[12px] uppercase tracking-wider font-bold text-neutral-800">
                    <MessageSquare className="w-3.5 h-3.5 text-[#283618]" strokeWidth={2.2} />
                    Your Experience
                  </label>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-400">
                    <span>Min 10</span>
                    <span>•</span>
                    <span className={comment.length >= 10 ? 'text-[#283618] font-bold' : ''}>
                      {comment.length} chars
                    </span>
                  </div>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Tell others about the quality, taste, freshness, and delivery experience..."
                  className="w-full bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-200/90 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 rounded-2xl p-3 outline-none text-[12.5px] sm:text-[13px] text-neutral-900 placeholder:text-neutral-400 resize-none transition-all leading-relaxed"
                />
              </div>

              {/* Photo Uploader */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 font-sans text-[11.5px] sm:text-[12px] uppercase tracking-wider font-bold text-neutral-800">
                  <Camera className="w-3.5 h-3.5 text-[#283618]" strokeWidth={2.2} />
                  Add Photos{' '}
                  <span className="text-[10px] text-neutral-400 font-normal lowercase">
                    (optional, max 5)
                  </span>
                </label>
                <div className="flex flex-wrap gap-2.5 pt-1.5 pr-1.5">
                  {combinedPreviews.map((preview, idx) => (
                    <div key={idx} className="relative w-15 h-15 flex-shrink-0">
                      <div className="w-full h-full rounded-2xl overflow-hidden border border-neutral-200/90 bg-neutral-100 shadow-2xs">
                        <OptimizedImage
                          src={preview}
                          alt="Review attachment preview"
                          className="w-full h-full object-cover"
                          width={80}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (idx < remoteImages.length) {
                            setRemoteImages((prev) => prev.filter((_, i) => i !== idx));
                          } else {
                            const localIdx = idx - remoteImages.length;
                            setSelectedFiles((prev) => prev.filter((_, i) => i !== localIdx));
                            setLocalPreviews((prev) => prev.filter((_, i) => i !== localIdx));
                          }
                        }}
                        className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-neutral-900 hover:bg-red-600 active:scale-90 text-white flex items-center justify-center cursor-pointer transition-all shadow-md ring-2 ring-white"
                        aria-label="Remove photo"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3 text-white" strokeWidth={2.4} />
                      </button>
                    </div>
                  ))}
                  {selectedFiles.length + remoteImages.length < 5 && (
                    <label className="w-15 h-15 rounded-2xl border-2 border-dashed border-neutral-300 hover:border-[#283618] bg-neutral-50/70 hover:bg-[#283618]/5 flex flex-col items-center justify-center cursor-pointer transition-all gap-0.5 text-neutral-500 hover:text-[#283618] flex-shrink-0">
                      <Plus className="w-4 h-4" strokeWidth={2} />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Add</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          const currentTotal = remoteImages.length + selectedFiles.length;
                          const allowedRemaining = 5 - currentTotal;
                          const filesToAdd = files.slice(0, Math.max(0, allowedRemaining));

                          const newFiles = [...selectedFiles, ...filesToAdd];
                          setSelectedFiles(newFiles);

                          const newPreviews = filesToAdd.map((file) => URL.createObjectURL(file));
                          setLocalPreviews((prev) => [...prev, ...newPreviews]);
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Action Bar matching FilterPanel */}
            <div className="mt-2.5 pt-2.5 border-t border-black/[0.06] shrink-0">
              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="w-full bg-[#283618] hover:bg-[#1f2b13] text-white py-3 rounded-full font-sans text-[12px] sm:text-[13px] uppercase tracking-wider font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  <span>{existingReview ? 'Update Review' : 'Submit Review'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

// ─── Main ProductReviews Section ─────────────────────────────────────────────
export function ProductReviews({ productId, productTitle }) {
  const { isAuthenticated, openAuthModal } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState(null); // { canReview, alreadyReviewed, reason }
  const [myReview, setMyReview] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [_page, setPage] = useState(1);
  const [_totalPages, setTotalPages] = useState(1);

  const scrollContainerRef = useRef(null);

  // ── Fetch reviews ──────────────────────────────────────────────────────────
  const fetchReviews = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const res = await reviewService.getProductReviews(productId, { page: p, limit: 10 });
        if (res.success) {
          const data = res.data;
          const list = data.items || data.data || data || [];
          setReviews(p === 1 ? list : (prev) => [...prev, ...list]);
          setTotalPages(data.totalPages || 1);
          setPage(p);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    [productId],
  );

  // ── Fetch eligibility (only when logged in) ────────────────────────────────
  const fetchEligibility = useCallback(async () => {
    if (!isAuthenticated || !productId) return;
    try {
      const res = await reviewService.canReview(productId);
      if (res.success) {
        setEligibility(res.data);
        if (res.data.alreadyReviewed) {
          const myRes = await reviewService.getMyReview(productId);
          if (myRes.success && myRes.data) setMyReview(myRes.data);
        }
      }
    } catch {
      // ignore auth errors silently
    }
  }, [isAuthenticated, productId]);

  useEffect(() => {
    if (productId) {
      fetchReviews(1);
      fetchEligibility();
    }
  }, [productId, fetchReviews, fetchEligibility]);

  // ── Average rating ────────────────────────────────────────────────────────
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  const allImages = useMemo(() => {
    return reviews.reduce((acc, r) => {
      if (r.images && r.images.length > 0) {
        acc.push(...r.images);
      }
      return acc;
    }, []);
  }, [reviews]);

  // ── Drawer State & Handlers ───────────────────────────────────────────────
  const [isReviewsDrawerOpen, setIsReviewsDrawerOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.endsWith('/reviews');
  });

  const [isPhotosDrawerOpen, setIsPhotosDrawerOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.endsWith('/reviews/images');
  });
  const [photosDrawerIndex, setPhotosDrawerIndex] = useState(0);

  const handleOpenReviewsDrawer = useCallback(() => {
    setIsReviewsDrawerOpen(true);
    if (!window.location.pathname.endsWith('/reviews')) {
      window.history.pushState({ reviewsDrawer: true }, '', `/product/${productId}/reviews`);
    }
  }, [productId]);

  const handleCloseReviewsDrawer = useCallback(() => {
    setIsReviewsDrawerOpen(false);
    if (window.location.pathname.endsWith('/reviews')) {
      window.history.replaceState(null, '', `/product/${productId}#reviews-section`);
    }
  }, [productId]);

  const handleOpenPhotosDrawer = useCallback(
    (initialIndex = 0) => {
      setPhotosDrawerIndex(initialIndex);
      setIsPhotosDrawerOpen(true);
      if (!window.location.pathname.endsWith('/reviews/images')) {
        window.history.pushState(
          { photosDrawer: true },
          '',
          `/product/${productId}/reviews/images`,
        );
      }
    },
    [productId],
  );

  const handleClosePhotosDrawer = useCallback(() => {
    setIsPhotosDrawerOpen(false);
    if (window.location.pathname.endsWith('/reviews/images')) {
      window.history.replaceState(null, '', `/product/${productId}#reviews-section`);
    }
  }, [productId]);

  const handlePhotoClick = useCallback(
    (imgUrl) => {
      let targetIndex = 0;
      if (imgUrl && Array.isArray(allImages)) {
        const found = allImages.indexOf(imgUrl);
        if (found !== -1) targetIndex = found;
      }
      handleOpenPhotosDrawer(targetIndex);
    },
    [allImages, handleOpenPhotosDrawer],
  );

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.endsWith('/reviews/images')) {
        setIsPhotosDrawerOpen(true);
      } else {
        setIsPhotosDrawerOpen(false);
      }
      if (window.location.pathname.endsWith('/reviews')) {
        setIsReviewsDrawerOpen(true);
      } else {
        setIsReviewsDrawerOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen for open-reviews-drawer custom event (from DynamicRatingBadge or other triggers)
  useEffect(() => {
    const handleCustomOpen = (e) => {
      if (!e.detail?.productId || String(e.detail.productId) === String(productId)) {
        handleOpenReviewsDrawer();
      }
    };
    window.addEventListener('open-reviews-drawer', handleCustomOpen);
    return () => window.removeEventListener('open-reviews-drawer', handleCustomOpen);
  }, [productId, handleOpenReviewsDrawer]);

  const handleScroll = (direction) => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.8;
      scrollContainerRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // ── CTA button logic ──────────────────────────────────────────────────────
  const renderCTA = () => {
    const buttonClass =
      'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-black/5 hover:bg-[#283618] hover:text-white text-neutral-800 transition-all cursor-pointer shrink-0 active:scale-95';
    const disabledClass =
      'w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-neutral-100 text-black/40 rounded-full border border-black/5 shrink-0';

    if (!isAuthenticated) {
      return (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openAuthModal}
          title="Write a Review"
          className={buttonClass}
        >
          <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
        </motion.button>
      );
    }

    if (!eligibility) {
      return (
        <div className={disabledClass + ' opacity-75'}>
          <div className="skeleton-box inline-block w-3 h-3 rounded-md" />
        </div>
      );
    }

    if (eligibility.alreadyReviewed) {
      return (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          title="Edit Your Review"
          className={buttonClass}
        >
          <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
        </motion.button>
      );
    }

    if (eligibility.canReview) {
      return (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          title="Write a Review"
          className={buttonClass}
        >
          <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
        </motion.button>
      );
    }

    return (
      <div title="Purchase to review" className={disabledClass}>
        <Lock className="w-3.5 h-3.5" strokeWidth={1.8} />
      </div>
    );
  };

  if (reviews.length === 0) {
    if (isReviewsDrawerOpen) {
      return (
        <ReviewsDrawer
          isOpen={isReviewsDrawerOpen}
          onClose={handleCloseReviewsDrawer}
          productId={productId}
          productTitle={productTitle}
          initialReviews={[]}
          initialAvgRating={0}
          initialRatingCounts={[5, 4, 3, 2, 1].map((s) => ({ star: s, count: 0 }))}
          eligibility={eligibility}
          onReviewSubmitted={() => {
            fetchReviews(1);
            fetchEligibility();
          }}
        />
      );
    }
    return null;
  }

  return (
    <section
      id="reviews-section"
      className="relative z-10 max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop py-8 lg:py-12"
    >
      {/* Chef Divider matching RecommendationSystem */}
      <div className="w-full flex justify-center mb-6 lg:mb-8">
        <div className="w-full max-w-[180px] flex items-center justify-center gap-3 opacity-70">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-black to-black" />
          <ChefHat className="w-4 h-4 text-black shrink-0" strokeWidth={2} />
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-black to-black" />
        </div>
      </div>

      {/* Section Header with emblem dot and View All link */}
      <SectionHeader
        title="What Buyers Say"
        seeAllLink={reviews.length > 0 ? `/product/${productId}/reviews` : undefined}
        onSeeAllClick={reviews.length > 0 ? handleOpenReviewsDrawer : undefined}
        linkText="View All"
        size="sm"
        className="mb-4"
        actions={
          <div className="flex items-center gap-2">
            {reviews.length > 1 && (
              <div className="hidden sm:flex items-center gap-1 mr-1">
                <button
                  onClick={() => handleScroll('left')}
                  className="w-7 h-7 rounded-full border border-black/10 flex items-center justify-center hover:bg-neutral-50 active:scale-95 transition-all text-black/60 cursor-pointer"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
                <button
                  onClick={() => handleScroll('right')}
                  className="w-7 h-7 rounded-full border border-black/10 flex items-center justify-center hover:bg-neutral-50 active:scale-95 transition-all text-black/60 cursor-pointer"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            )}
            {renderCTA()}
          </div>
        }
      />

      {/* Stats Row — Compact side-by-side design */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-4 sm:gap-8 mb-5 sm:mb-6 py-3.5 px-4 sm:py-4.5 sm:px-6 bg-white rounded-xl border border-black/10 shadow-2xs">
          {/* Average Rating Block */}
          <div className="flex flex-col items-center justify-center border-r border-black/10 pr-4 sm:pr-8 shrink-0 min-w-[85px] sm:min-w-[110px]">
            <span className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 leading-none tracking-tight">
              {avgRating.toFixed(1)}
            </span>
            <div className="mt-1 sm:mt-1.5">
              <StarRating value={avgRating} size={12} />
            </div>
            <span className="font-sans text-[10px] sm:text-[11px] text-neutral-500 font-semibold mt-1 whitespace-nowrap">
              {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
            </span>
          </div>

          {/* Compact Bar Breakdown */}
          <div className="flex-1 space-y-1 sm:space-y-1.5 w-full min-w-0 max-w-md">
            {ratingCounts.map(({ star, count }) => {
              const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-0.5 w-4 sm:w-4.5 shrink-0">
                    <span className="font-sans text-[10px] sm:text-[11px] font-bold text-neutral-700 leading-none">
                      {star}
                    </span>
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="#F7BB0E"
                      stroke="#F7BB0E"
                      strokeWidth="1.5"
                      className="shrink-0"
                    >
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                    </svg>
                  </div>
                  <div className="flex-1 h-1 sm:h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-[#F7BB0E] rounded-full"
                    />
                  </div>
                  <span className="font-sans text-[9.5px] sm:text-[11px] text-neutral-400 w-6 sm:w-8 text-right font-medium shrink-0">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews Horizontal scroll */}
      {loading && reviews.length === 0 ? (
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 px-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton-box bg-white rounded-xl border border-black/10 p-4 space-y-2.5 shrink-0 w-[240px] xs:w-[280px] sm:w-[300px] lg:w-[320px] h-[120px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-100/50 animate-pulse" />
                <div className="space-y-1">
                  <div className="h-3 w-20 bg-neutral-100/50 rounded animate-pulse" />
                  <div className="h-2 w-14 bg-neutral-100/50 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-2.5 w-16 bg-neutral-100/50 rounded animate-pulse" />
              <div className="h-3 w-full bg-neutral-100/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-[24px] border border-black/5">
          <span className="material-symbols-outlined text-[48px] text-primary/30 mb-4 animate-bounce">
            rate_review
          </span>
          <p className="font-display text-lg text-black/50 font-medium">No reviews yet</p>
          <p className="font-body text-sm text-black/30 mt-1">
            Be the first verified buyer to share your experience.
          </p>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar pb-4 px-1"
        >
          {reviews.map((review) => (
            <div
              key={review._id || review.id}
              className="snap-start shrink-0 w-[240px] xs:w-[280px] sm:w-[300px] lg:w-[320px] h-auto self-stretch"
            >
              <ReviewCard review={review} productId={productId} onPhotoClick={handlePhotoClick} />
            </div>
          ))}
        </div>
      )}

      {/* Write Review Drawer */}
      <AnimatePresence>
        {showModal && (
          <WriteReviewModal
            productId={productId}
            productTitle={productTitle}
            existingReview={myReview}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              fetchReviews(1);
              fetchEligibility();
            }}
          />
        )}
      </AnimatePresence>

      {/* Reviews App Drawer (In-Page instant open) */}
      <ReviewsDrawer
        isOpen={isReviewsDrawerOpen}
        onClose={handleCloseReviewsDrawer}
        productId={productId}
        productTitle={productTitle}
        initialReviews={reviews}
        initialAvgRating={avgRating}
        initialRatingCounts={ratingCounts}
        eligibility={eligibility}
        onReviewSubmitted={() => {
          fetchReviews(1);
          fetchEligibility();
        }}
      />

      {/* Customer Review Images Drawer / Modal (In-Page instant open) */}
      <ProductReviewImagesDrawer
        isOpen={isPhotosDrawerOpen}
        onClose={handleClosePhotosDrawer}
        productId={productId}
        productTitle={productTitle}
        initialPhotoIndex={photosDrawerIndex}
        reviews={reviews}
      />
    </section>
  );
}
