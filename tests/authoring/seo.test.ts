import { describe, it, expect } from 'vitest';
import {
  generateSlug,
  formatSeoTitle,
  formatSeoDescription,
  validateSeoLengths,
  generateSeoMetadata,
  SEO_TITLE_MAX,
  SEO_DESCRIPTION_MAX,
} from '../../src/lib/authoring/seo.js';

describe('SEO Utilities (Deterministic)', () => {
  describe('generateSlug', () => {
    it('should convert standard titles to clean URL-safe slugs', () => {
      expect(generateSlug('5 Best Gaming Keyboards Under ₹5,000')).toBe(
        '5-best-gaming-keyboards-under-rs5000'
      );
    });

    it('should remove special characters and punctuation', () => {
      expect(generateSlug('Top 10 TWS Earbuds (2026): What to Buy?!')).toBe(
        'top-10-tws-earbuds-2026-what-to-buy'
      );
    });

    it('should collapse multiple spaces and hyphens', () => {
      expect(generateSlug('Kitchen   Gadgets --- Modern Homes')).toBe(
        'kitchen-gadgets-modern-homes'
      );
    });

    it('should strip leading and trailing hyphens', () => {
      expect(generateSlug(' - Best Deals for Diwali - ')).toBe('best-deals-for-diwali');
    });
  });

  describe('formatSeoTitle', () => {
    it('should append site name if within character limit', () => {
      const title = 'Best Air Fryers in India';
      const formatted = formatSeoTitle(title, 'DesiOffers Guides');
      expect(formatted).toBe('Best Air Fryers in India — DesiOffers Guides');
      expect(formatted.length).toBeLessThanOrEqual(SEO_TITLE_MAX);
    });

    it('should omit site name if appending exceeds limit but title fits', () => {
      const longTitle = 'The Complete Ultimate Guide to Buying Mechanical Keyboards for Gaming';
      const formatted = formatSeoTitle(longTitle, 'DesiOffers Guides');
      expect(formatted.length).toBeLessThanOrEqual(SEO_TITLE_MAX);
    });
  });

  describe('formatSeoDescription', () => {
    it('should keep description as-is if within limit', () => {
      const desc = 'Discover the top 5 air fryers for Indian kitchens with honest pros and cons.';
      expect(formatSeoDescription(desc)).toBe(desc);
    });

    it('should truncate at boundary if description exceeds limit', () => {
      const veryLongDesc =
        'This is an exceptionally long meta description that goes well beyond one hundred and sixty characters in length. It keeps talking and rambling about products, features, specifications, and details that will definitely be truncated by search engines like Google if not formatted properly.';
      const formatted = formatSeoDescription(veryLongDesc);
      expect(formatted.length).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
      expect(formatted.endsWith('…') || formatted.endsWith('.')).toBe(true);
    });
  });

  describe('validateSeoLengths & generateSeoMetadata', () => {
    it('should validate and return warnings for out-of-spec lengths', () => {
      const warnings = validateSeoLengths('A'.repeat(70), 'Short');
      expect(warnings.length).toBe(2);
      expect(warnings[0].field).toBe('seoTitle');
      expect(warnings[1].field).toBe('seoDescription');
    });

    it('should generate complete SeoResult cleanly', () => {
      const result = generateSeoMetadata(
        'Top 5 Budget Smartwatches',
        'Find the best budget smartwatches under ₹3000 in India with battery life comparisons.'
      );
      expect(result.slug).toBe('top-5-budget-smartwatches');
      expect(result.seoTitle).toContain('Top 5 Budget Smartwatches');
      expect(result.seoDescription).toContain('smartwatches');
      expect(result.warnings).toEqual([]);
    });
  });
});
