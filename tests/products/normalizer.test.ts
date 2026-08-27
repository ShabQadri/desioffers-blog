import { describe, it, expect } from 'vitest';
import {
  normalizeProduct,
  isValidAsin,
  extractAsinFromUrl,
} from '../../src/lib/products/normalizer.js';

describe('Phase 7 — Product Normalizer & Data Model', () => {
  describe('1. ASIN Extraction & Validation', () => {
    it('should validate valid 10-character alphanumeric ASINs', () => {
      expect(isValidAsin('B016MAK38U')).toBe(true);
      expect(isValidAsin('B08N5WRWNW')).toBe(true);
      expect(isValidAsin('invalid-asin')).toBe(false);
      expect(isValidAsin('')).toBe(false);
    });

    it('should extract ASIN from standard Amazon URLs', () => {
      expect(extractAsinFromUrl('https://www.amazon.in/dp/B016MAK38U?ref=test')).toBe('B016MAK38U');
      expect(extractAsinFromUrl('https://amazon.in/gp/product/B08N5WRWNW/')).toBe('B08N5WRWNW');
      expect(extractAsinFromUrl('https://example.com/product/123')).toBeNull();
    });
  });

  describe('2. Normalization & Imageless Fallback', () => {
    it('should normalize product data and enforce imageless fallback when image is omitted', () => {
      const product = normalizeProduct({
        name: 'Redragon K552 Mechanical Keyboard',
        brand: 'Redragon',
        asin: 'B016MAK38U',
        shortDescription: 'Durable mechanical gaming keyboard.',
        bestFor: 'Budget gamers',
        pros: ['Compact TKL design', 'RGB backlighting'],
        cons: ['Loud switches'],
      });

      expect(product.position).toBe(1);
      expect(product.asin).toBe('B016MAK38U');
      expect(product.url).toBe('https://www.amazon.in/dp/B016MAK38U');
      expect(product.imageSource).toBe('none');
      expect(product.image).toBeUndefined();
      expect(product.priceVerification).toBe('unknown');
      expect(product.availabilityVerification).toBe('unknown');
      expect(product.source).toBe('manual');
    });

    it('should preserve authorized image and verified pricing when provided', () => {
      const product = normalizeProduct({
        name: 'Philips Air Fryer HD9252/90',
        brand: 'Philips',
        asin: 'B08DGYX1R9',
        image: 'articles/2026/08/air-fryer/philips.webp',
        imageSource: 'r2',
        imageRightsStatus: 'authorized',
        priceDisplay: '₹8,999',
        priceVerification: 'verified',
        shortDescription: 'Rapid air technology air fryer.',
        bestFor: 'Small families',
        pros: ['Digital touch screen', 'Dishwasher safe'],
        cons: ['Short power cord'],
      });

      expect(product.image).toBe('articles/2026/08/air-fryer/philips.webp');
      expect(product.imageSource).toBe('r2');
      expect(product.imageRightsStatus).toBe('authorized');
      expect(product.priceDisplay).toBe('₹8,999');
      expect(product.priceVerification).toBe('verified');
    });
  });
});
