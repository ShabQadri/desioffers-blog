import { describe, it, expect } from 'vitest';
import {
  normalizeProduct,
  normalizeFromAmazonUrl,
} from '../../src/lib/products/normalizer.js';
import { buildArticleMdx } from '../../src/lib/authoring/article-builder.js';
import type { ArticleDraft } from '../../src/lib/authoring/types.js';

describe('Phase 11B — Price & Deal Model & Disclosures', () => {
  describe('1. No-Price Default State', () => {
    it('should default to priceVerification="unknown" and omit priceObservedAt when no price is supplied', () => {
      const product = normalizeProduct({
        name: 'Logitech G304 Lightspeed Wireless Gaming Mouse',
        brand: 'Logitech',
        asin: 'B07CGP569X',
        shortDescription: 'Hero sensor wireless mouse.',
        bestFor: 'Competitive gaming',
        pros: ['Long battery life'],
        cons: ['Uses AA battery'],
      });

      expect(product.priceDisplay).toBeUndefined();
      expect(product.priceVerification).toBe('unknown');
      expect(product.priceObservedAt).toBeUndefined();
      expect(product.url).toBe('https://www.amazon.in/dp/B07CGP569X');
      expect(product.affiliateUrl).toContain('https://www.amazon.in/dp/B07CGP569X');
    });

    it('should handle URL-first input with no price cleanly', () => {
      const product = normalizeFromAmazonUrl({
        url: 'https://www.amazon.in/dp/B07CGP569X',
        name: 'Logitech G304',
        brand: 'Logitech',
        shortDescription: 'Wireless mouse',
        bestFor: 'Gamers',
        pros: ['Great sensor'],
        cons: ['No RGB'],
      });

      expect(product.asin).toBe('B07CGP569X');
      expect(product.priceDisplay).toBeUndefined();
      expect(product.priceVerification).toBe('unknown');
      expect(product.priceObservedAt).toBeUndefined();
    });
  });

  describe('2. User-Observed Price & Automatic Timestamp Creation', () => {
    it('should record user-observed price and automatically generate a timestamp when price is supplied', () => {
      const product = normalizeProduct({
        name: 'Logitech G304 Lightspeed Wireless Gaming Mouse',
        brand: 'Logitech',
        asin: 'B07CGP569X',
        priceDisplay: '₹2,499',
        shortDescription: 'Hero sensor wireless mouse.',
        bestFor: 'Competitive gaming',
        pros: ['Long battery life'],
        cons: ['Uses AA battery'],
      });

      expect(product.priceDisplay).toBe('₹2,499');
      expect(product.priceVerification).toBe('user-observed');
      expect(product.priceObservedAt).toBeDefined();
      // Valid ISO date format check
      expect(new Date(product.priceObservedAt!).getTime()).not.toBeNaN();
    });

    it('should preserve user-supplied timestamp without converting to verified', () => {
      const product = normalizeProduct({
        name: 'Logitech G304',
        brand: 'Logitech',
        asin: 'B07CGP569X',
        priceDisplay: '₹2,499',
        priceVerification: 'user-observed',
        priceObservedAt: '2026-08-20T10:00:00.000Z',
        shortDescription: 'Wireless mouse',
        bestFor: 'Gamers',
        pros: ['Sensor'],
        cons: ['No RGB'],
      });

      expect(product.priceVerification).toBe('user-observed');
      expect(product.priceObservedAt).toBe('2026-08-20T10:00:00.000Z');
    });

    it('should support festival / deal price and badge input from URL-first flow', () => {
      const product = normalizeFromAmazonUrl({
        url: 'https://www.amazon.in/dp/B07CGP569X',
        price: '₹1,999',
        badge: 'Festival Deal',
        name: 'Logitech G304',
        brand: 'Logitech',
        shortDescription: 'Wireless mouse discount',
        bestFor: 'Budget deal hunters',
        pros: ['Big discount'],
        cons: ['Deal may expire'],
      });

      expect(product.priceDisplay).toBe('₹1,999');
      expect(product.priceVerification).toBe('user-observed');
      expect(product.editorialBadge).toBe('Festival Deal');
      expect(product.priceObservedAt).toBeDefined();
      expect(product.source).toBe('web-research');
    });
  });

  describe('3. MDX Serialization & Frontmatter Round-Trip', () => {
    it('should cleanly serialize user-observed price, observed timestamp, and verification state into MDX', () => {
      const mockDraft: ArticleDraft = {
        title: '5 Best Gaming Mice Under ₹3,000 in India (2026)',
        slug: 'test-price-serialization-guide',
        description: 'Buying guide for gaming mice with pricing and deals.',
        articleType: 'buying-guide',
        publishedDate: '2026-08-27',
        lastVerified: '2026-08-27',
        productDataVerified: false,
        priceVerified: false,
        availabilityVerified: false,
        author: 'shaaz',
        category: 'gaming',
        tags: ['budget', 'gaming'],
        heroImage: '/images/articles/gaming-mice-hero.webp',
        heroImageAlt: 'Gaming mice hero',
        heroImageStatus: 'ready',
        featured: false,
        draft: true,
        products: [
          {
            position: 1,
            name: 'Logitech G304',
            brand: 'Logitech',
            asin: 'B07CGP569X',
            image: '',
            imageAlt: 'Logitech G304',
            imageSource: 'none',
            editorialBadge: 'Festival Deal',
            shortDescription: 'Wireless gaming mouse.',
            bestFor: 'Budget gamers',
            pros: ['Fast sensor'],
            cons: ['AA battery'],
            priceDisplay: '₹1,999',
            priceObservedAt: '2026-08-27T00:00:00.000Z',
            priceVerification: 'user-observed',
            availabilityNote: 'Check availability on Amazon',
            affiliateUrl: 'https://www.amazon.in/dp/B07CGP569X',
          },
        ],
        bodySections: [
          {
            type: 'intro',
            content: 'Introduction to gaming mice in India.',
          },
        ],
      };

      const result = buildArticleMdx(mockDraft);

      expect(result.mdx).toContain('priceDisplay: "₹1,999"');
      expect(result.mdx).toContain('priceObservedAt: "2026-08-27T00:00:00.000Z"');
      expect(result.mdx).toContain('priceVerification: "user-observed"');
      expect(result.mdx).toContain('editorialBadge: "Festival Deal"');
      expect(result.mdx).toContain('draft: true');
    });
  });
});
