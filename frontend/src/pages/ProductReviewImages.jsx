import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '../hooks/useProductQueries';
import { SEO } from '../components/seo/SEO';
import { ProductReviewImagesDrawer } from '../components/sections/ProductReviewImagesDrawer';

export function ProductReviewImages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: product } = useProduct(id);

  const handleClose = useCallback(() => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(`/product/${id}`, { replace: true });
    }
  }, [navigate, id]);

  return (
    <div className="bg-surface min-h-screen">
      <SEO
        title={`Customer Gallery - ${product?.title || 'Product'}`}
        description={`Browse real customer setup photos for ${product?.title || 'product'}`}
      />
      <ProductReviewImagesDrawer
        isOpen={true}
        onClose={handleClose}
        productId={id}
        productTitle={product?.title || 'Product'}
        productImageSrc={product?.imageSrc}
      />
    </div>
  );
}
