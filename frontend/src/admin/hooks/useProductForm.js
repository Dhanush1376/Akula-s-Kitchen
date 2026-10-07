import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCategories } from '../../hooks/useProductQueries';
import { useDraft } from './useDraft';
import { productService } from '../../services/domainServices';
import toast from 'react-hot-toast';

const EMPTY_ARRAY = [];

export function useProductForm({ id, isEditMode }) {
  const { data: dbCategories = EMPTY_ARRAY } = useCategories();
  const [categoriesList, setCategoriesList] = useState([]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const initialData = useMemo(
    () => ({
      title: '',
      customerNote: '',
      slug: '',
      primaryCategory: '',
      secondaryCategories: [],
      material: '',
      tags: '',
      price: '',
      oldPrice: '',
      stock: '',
      imageSrc: '',
      images: [],
      badges: '',
      description: '',
      dimensions: '',
      weight: '',
      seoTitle: '',
      seoDescription: '',
      featured: false,
      isActive: true,
      isNonRefundable: false,
      variants: [],
      optionGroups: [],
      returnSettings: {
        isReturnable: true,
        returnWindowDays: 7,
        restockingFeePercentage: 0,
        isExchangeable: true,
        exchangeWindowDays: 7,
        requiresInspection: true,
      },
      __v: 0,
    }),
    [],
  );

  const initialPageState = useMemo(() => ({ activeStep: 0 }), []);

  const draftConfig = useDraft({
    draftKey: isEditMode ? `admin:products:edit:${id}` : 'admin:products:add',
    module: 'Products',
    pageTitle: isEditMode ? `Edit Product ${id}` : 'New Product',
    initialData,
    initialPageState,
    enabled: true,
  });

  const { formData, setFormData, pageState, setPageState } = draftConfig;
  const currentStep = pageState.activeStep || 0;
  const setCurrentStep = useCallback(
    (step) => setPageState((prev) => ({ ...prev, activeStep: step })),
    [setPageState],
  );

  useEffect(() => {
    if (dbCategories.length > 0) {
      setCategoriesList([...dbCategories].sort());
    } else {
      // Direct load from /categories/active if React Query has not loaded or is empty
      productService
        .getActiveCategories()
        .then((res) => {
          const raw = res?.data || res;
          if (Array.isArray(raw) && raw.length > 0) {
            const names = raw.map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean);
            if (names.length > 0) {
              setCategoriesList((prev) => Array.from(new Set([...prev, ...names])).sort());
            }
          }
        })
        .catch(() => {});
    }
  }, [dbCategories]);

  useEffect(() => {
    if (isEditMode && id && id !== 'undefined') {
      const fetchProduct = async () => {
        setIsLoading(true);
        try {
          const res = await productService.getById(`${id}?_t=${Date.now()}`);
          if (res.success) {
            const p = res.data;
            const pCatName = p.primaryCategory?.name || p.primaryCategory || '';
            if (pCatName && !dbCategories.includes(pCatName)) {
              setCategoriesList((prev) => Array.from(new Set([...prev, pCatName])).sort());
            }
            const pSecCats = (p.secondaryCategories || []).map((c) => c.name || c);
            const dbImages = Array.isArray(p.images) ? p.images : [];
            const allImages = [p.imageSrc, ...dbImages].filter(
              (img) => typeof img === 'string' && img.trim() !== '',
            );
            const finalImages = Array.from(new Set(allImages)); // Remove duplicates
            const finalImageSrc = finalImages[0] || '';

            setFormData({
              _id: p._id || id,
              id: p._id || id,
              title: p.title || p.name || '',
              customerNote: p.customerNote || '',
              slug: p.slug || '',
              primaryCategory: pCatName,
              secondaryCategories: pSecCats,
              material: p.material || '',
              tags: p.tags ? p.tags.join(',') : '',
              price: p.price || '',
              oldPrice: p.oldPrice || '',
              stock: p.stock !== undefined ? p.stock : '',
              imageSrc: finalImageSrc,
              images: finalImages,
              badges: p.badges ? p.badges.join(',') : '',
              description: p.description || '',
              dimensions: p.dimensions || '',
              weight: p.weight || '',
              seoTitle: p.seoTitle || '',
              seoDescription: p.seoDescription || '',
              featured: p.featured || false,
              isActive: p.isActive !== undefined ? p.isActive : true,
              isNonRefundable: p.isNonRefundable || false,
              variants: Array.isArray(p.variants) ? p.variants : [],
              optionGroups: Array.isArray(p.optionGroups) ? p.optionGroups : [],
              returnSettings: p.returnSettings || {
                isReturnable: true,
                returnWindowDays: 7,
                restockingFeePercentage: 0,
                isExchangeable: true,
                exchangeWindowDays: 7,
                requiresInspection: true,
              },
              __v: p.__v !== undefined ? p.__v : 0,
            });
          }
        } catch (err) {
          toast.error(
            err?.response?.data?.message || err?.message || 'Failed to load product details',
          );
        } finally {
          setIsLoading(false);
        }
      };
      fetchProduct();
    } else {
      setFormData(initialData);
      setCurrentStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditMode, dbCategories]);

  return {
    isLoading,
    setIsLoading,
    categoriesList,
    setCategoriesList,
    isCustomCategory,
    setIsCustomCategory,
    currentStep,
    setCurrentStep,
    ...draftConfig,
  };
}
