import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { z } from 'astro/zod';

// Standalone mirror of the articles collection schema for isolated validation testing
const testArticleSchema = z.object({
  title: z.string().max(100),
  slug: z.string().optional(),
  description: z.string().max(160),
  articleType: z.enum([
    'buying-guide',
    'best-products',
    'comparison',
    'how-to-choose',
    'gift-guide',
    'deal-guide',
  ]).default('buying-guide'),
  publishedDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  lastVerified: z.coerce.date(),
  productDataVerified: z.boolean().default(true),
  priceVerified: z.boolean().default(true),
  availabilityVerified: z.boolean().default(true),
  author: z.string(),
  category: z.string(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  heroImage: z.string(),
  heroImageAlt: z.string(),
  heroImageStatus: z.enum([
    'ready',
    'needs-generation',
    'fallback-approved',
  ]).default('ready'),
  heroImageSource: z.enum([
    'ai-generated',
    'user-provided',
    'licensed',
    'r2',
  ]).optional(),
  heroImageRightsStatus: z.enum([
    'original',
    'authorized',
    'needs-review',
    'restricted',
  ]).optional(),
  featured: z.boolean().default(false),
  affiliateDisclosure: z.string().optional(),
  readingTime: z.number().default(5),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  draft: z.boolean().default(false),
  quickPicks: z.array(z.object({
    badge: z.string(),
    name: z.string(),
    asin: z.string().optional(),
    affiliateUrl: z.string(),
    priceDisplay: z.string().optional(),
  })).optional(),
  products: z.array(z.object({
    position: z.number(),
    name: z.string(),
    brand: z.string(),
    model: z.string().optional(),
    asin: z.string().optional(),
    image: z.string().default(''),
    imageAlt: z.string().default(''),
    imageSource: z.enum([
      'r2',
      'ai-generated',
      'licensed',
      'amazon-api',
      'none',
    ]).default('none'),
    imageRightsStatus: z.enum([
      'original',
      'authorized',
      'needs-review',
      'restricted',
    ]).optional(),
    editorialBadge: z.string().optional(),
    shortDescription: z.string(),
    bestFor: z.string(),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    priceDisplay: z.string().optional(),
    availabilityNote: z.string().optional(),
    affiliateUrl: z.string(),
  })),
  faq: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).optional(),
  sources: z.array(z.string()).optional(),
});

describe('Phase 2 — Schema Extension & Sveltia CMS Configuration', () => {
  describe('1. Media Source and Rights Status Schema Validation', () => {
    const baseValidArticle = {
      title: 'Test Article Title',
      slug: 'test-article-title',
      description: 'Test description within valid character limits.',
      publishedDate: new Date('2026-08-27'),
      lastVerified: new Date('2026-08-27'),
      author: 'shaaz',
      category: 'gaming',
      heroImage: '/images/hero.webp',
      heroImageAlt: 'Alt text',
      products: [
        {
          position: 1,
          name: 'Sample Product',
          brand: 'Brand',
          shortDescription: 'Short desc',
          bestFor: 'Gamers',
          pros: ['Pro 1'],
          cons: ['Con 1'],
          affiliateUrl: 'https://www.amazon.in/dp/B016MAK38U',
        },
      ],
    };

    it('should parse valid article with default new fields', () => {
      const parsed = testArticleSchema.parse(baseValidArticle);
      expect(parsed.articleType).toBe('buying-guide');
      expect(parsed.heroImageStatus).toBe('ready');
      expect(parsed.products[0].imageSource).toBe('none');
    });

    it('should allow all valid mediaSource values', () => {
      const validSources = ['r2', 'ai-generated', 'licensed', 'amazon-api', 'none'] as const;
      for (const src of validSources) {
        const parsed = testArticleSchema.parse({
          ...baseValidArticle,
          products: [
            {
              ...baseValidArticle.products[0],
              imageSource: src,
            },
          ],
        });
        expect(parsed.products[0].imageSource).toBe(src);
      }
    });

    it('should allow all valid rightsStatus values', () => {
      const validRights = ['original', 'authorized', 'needs-review', 'restricted'] as const;
      for (const rights of validRights) {
        const parsed = testArticleSchema.parse({
          ...baseValidArticle,
          heroImageRightsStatus: rights,
          products: [
            {
              ...baseValidArticle.products[0],
              imageRightsStatus: rights,
            },
          ],
        });
        expect(parsed.heroImageRightsStatus).toBe(rights);
        expect(parsed.products[0].imageRightsStatus).toBe(rights);
      }
    });

    it('should reject invalid mediaSource values', () => {
      expect(() => {
        testArticleSchema.parse({
          ...baseValidArticle,
          products: [
            {
              ...baseValidArticle.products[0],
              imageSource: 'unauthorized-external-url',
            },
          ],
        });
      }).toThrow();
    });

    it('should reject invalid rightsStatus values', () => {
      expect(() => {
        testArticleSchema.parse({
          ...baseValidArticle,
          heroImageRightsStatus: 'public-domain-claimed',
        });
      }).toThrow();
    });

    it('should allow all valid articleType enum values', () => {
      const types = ['buying-guide', 'best-products', 'comparison', 'how-to-choose', 'gift-guide', 'deal-guide'] as const;
      for (const t of types) {
        const parsed = testArticleSchema.parse({
          ...baseValidArticle,
          articleType: t,
        });
        expect(parsed.articleType).toBe(t);
      }
    });
  });

  describe('2. Sveltia CMS Configuration (public/admin/config.yml)', () => {
    const configPath = path.join(process.cwd(), 'public', 'admin', 'config.yml');
    const rawConfig = fs.readFileSync(configPath, 'utf-8');

    it('should use github backend with token auth only', () => {
      expect(rawConfig).toContain('name: github');
      expect(rawConfig).toContain('auth_methods:');
      expect(rawConfig).toContain('- token');
      expect(rawConfig).not.toContain('base_url:');
    });

    it('should enforce omit_empty_optional_fields', () => {
      expect(rawConfig).toContain('omit_empty_optional_fields: true');
    });

    it('should expose articleType and media provenance fields in articles collection', () => {
      expect(rawConfig).toContain('name: articleType');
      expect(rawConfig).toContain('name: heroImageStatus');
      expect(rawConfig).toContain('name: heroImageSource');
      expect(rawConfig).toContain('name: heroImageRightsStatus');
      expect(rawConfig).toContain('name: imageSource');
      expect(rawConfig).toContain('name: imageRightsStatus');
    });

    it('should enforce registry-based relations for taxonomy', () => {
      expect(rawConfig).toContain('relation, collection: categories');
      expect(rawConfig).toContain('relation, collection: subcategories');
      expect(rawConfig).toContain('relation, collection: tags');
      expect(rawConfig).toContain('relation, collection: authors');
    });
  });
});
