import { describe, it, expect } from 'vitest';
import { validateProductSafety, validateAllProducts } from '../../src/lib/products/validation.js';
import { normalizeProduct } from '../../src/lib/products/normalizer.js';

describe('Phase 7 — Product Safety & Quality Validation', () => {
  it('should pass validation for well-structured factual product listings', () => {
    const product = normalizeProduct({
      name: 'Logitech G304 Lightspeed',
      brand: 'Logitech',
      asin: 'B07CGP569X',
      shortDescription: 'Hero 12K optical sensor wireless mouse.',
      bestFor: 'Wireless budget gaming',
      pros: ['Excellent sensor accuracy', '250 hours battery life on AA battery'],
      cons: ['Uses AA battery instead of USB rechargeable'],
    });

    const res = validateProductSafety(product);
    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('should reject fabricated hands-on testing claims in product descriptions', () => {
    const product = normalizeProduct({
      name: 'Unverified Gaming Mouse',
      brand: 'Generic',
      shortDescription: 'We tested this mouse in our lab for 30 days and benchmarked the latency.',
      bestFor: 'Gamers',
      pros: ['Good grip'],
      cons: ['None'],
    });

    const res = validateProductSafety(product);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes('fabricated testing'))).toBe(true);
  });

  it('should reject products with restricted media rights', () => {
    const product = normalizeProduct({
      name: 'Restricted Image Item',
      brand: 'Brand',
      image: 'articles/2026/08/restricted.webp',
      imageSource: 'r2',
      imageRightsStatus: 'restricted',
      shortDescription: 'Valid description.',
      bestFor: 'Users',
      pros: ['Pro 1'],
      cons: ['Con 1'],
    });

    const res = validateProductSafety(product);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes('restricted'))).toBe(true);
  });

  it('should validate an array of products and aggregate errors', () => {
    const validProduct = normalizeProduct({
      name: 'Valid Product',
      brand: 'Brand',
      shortDescription: 'Valid description.',
      bestFor: 'General use',
      pros: ['Pro 1'],
      cons: ['Con 1'],
    });

    const res = validateAllProducts([validProduct]);
    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });
});
