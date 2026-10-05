import { describe, it, expect } from 'vitest';
import { AdminAddProduct } from '../pages/AdminAddProduct';
import { ProductMediaStep } from '../pages/steps/ProductMediaStep';
import { ProductInfoStep } from '../pages/steps/ProductInfoStep';
import { ProductVariantsStep } from '../pages/steps/ProductVariantsStep';
import { ProductPricingStep } from '../pages/steps/ProductPricingStep';
import { ProductSeoStep } from '../pages/steps/ProductSeoStep';
import { ProductReviewStep } from '../pages/steps/ProductReviewStep';

describe('AdminAddProduct imports', () => {
  it('imports AdminAddProduct and all step components without error', () => {
    expect(AdminAddProduct).toBeDefined();
    expect(ProductMediaStep).toBeDefined();
    expect(ProductInfoStep).toBeDefined();
    expect(ProductVariantsStep).toBeDefined();
    expect(ProductPricingStep).toBeDefined();
    expect(ProductSeoStep).toBeDefined();
    expect(ProductReviewStep).toBeDefined();
  });
});
