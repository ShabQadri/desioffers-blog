import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createEditorialArticleDraft } from '../../src/lib/workflow/article-workflow.js';
import { parseMdxArticle, parseFrontmatterYaml } from '../../src/lib/publish/validator.js';

describe('Phase 11G — One-Command Production Article Creation Workflow', () => {
  const testSlug = 'test-phase-11g-guide';
  const articleFilePath = path.join(process.cwd(), 'src', 'content', 'articles', `${testSlug}.mdx`);

  // 1x1 minimal valid PNG buffer for test hero image ingestion
  const mockPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  afterEach(() => {
    if (fs.existsSync(articleFilePath)) {
      try {
        fs.unlinkSync(articleFilePath);
      } catch {}
    }
  });

  describe('1. Amazon URL Parsing, Product Normalization & Price Model', () => {
    it('should parse Amazon URLs, extract ASINs, generate affiliate links, and enforce draft: true', async () => {
      const result = await createEditorialArticleDraft({
        topic: '5 Best Budget Mechanical Keyboards Under ₹3,000 in India (2026)',
        slug: testSlug,
        category: 'gaming',
        subcategory: 'gaming-keyboards',
        tags: ['mechanical', 'budget', 'under-3000', 'rgb'],
        heroImageBuffer: mockPngBuffer,
        products: [
          {
            url: 'https://www.amazon.in/dp/B08XYZ1234',
            price: '₹2,499',
            badge: 'Top Pick',
            ranking: 1,
            name: 'Redragon K552 Kumara RGB Mechanical Gaming Keyboard',
            brand: 'Redragon',
          },
          {
            url: 'https://www.amazon.in/Cosmic-Byte-CB-GK-16-Mechanical-Keyboard/dp/B07W4VD7D3',
            badge: 'Best Value',
            ranking: 2,
            name: 'Cosmic Byte CB-GK-16 Firefly Mechanical Keyboard',
            brand: 'Cosmic Byte',
          },
        ],
        notes: 'Focus on switch longevity, tactile feedback, and compact TKL layout.',
      });

      expect(result.slug).toBe(testSlug);
      expect(result.draftPath).toBe(articleFilePath);
      expect(fs.existsSync(articleFilePath)).toBe(true);

      const { frontmatterText } = parseMdxArticle(articleFilePath);
      const data = parseFrontmatterYaml(frontmatterText);

      // Invariant: draft is strictly true
      expect(data.draft).toBe(true);
      expect(data.productDataVerified).toBe(false);

      // Check products
      expect(data.products).toHaveLength(2);

      const p1 = data.products![0];
      expect(p1.asin).toBe('B08XYZ1234');
      expect(p1.priceDisplay).toBe('₹2,499');
      expect(p1.priceVerification).toBe('user-observed');
      expect(p1.priceObservedAt).toBeDefined();
      expect(p1.editorialBadge).toBe('Top Pick');
      expect(p1.imageSource).toBe('none'); // Imageless
      expect(p1.affiliateUrl).toContain('B08XYZ1234');

      const p2 = data.products![1];
      expect(p2.asin).toBe('B07W4VD7D3');
      expect(p2.priceDisplay).toBeUndefined();
      expect(p2.priceVerification).toBe('unknown');
      expect(p2.priceObservedAt).toBeUndefined();
      expect(p2.editorialBadge).toBe('Best Value');
      expect(p2.imageSource).toBe('none');

      // Check metrics
      expect(result.metrics.productsParsed).toBe(2);
      expect(result.metrics.validAsinsCount).toBe(2);
      expect(result.metrics.userObservedPricesCount).toBe(1);
      expect(result.metrics.unknownPricesCount).toBe(1);
      expect(result.metrics.imagelessProductsCount).toBe(2);
    });

    it('should reject invalid Amazon URLs and block creation', async () => {
      await expect(
        createEditorialArticleDraft({
          topic: 'Invalid Amazon URL Guide',
          slug: testSlug,
          category: 'gaming',
          products: [
            {
              url: 'https://example.com/not-amazon-product',
            },
          ],
        })
      ).rejects.toThrow(/Invalid Amazon product URL/);

      expect(fs.existsSync(articleFilePath)).toBe(false);
    });
  });

  describe('2. Media Safety, Hero Ingestion & Idempotency', () => {
    it('should set heroImageStatus = needs-generation when no image binary is provided', async () => {
      const result = await createEditorialArticleDraft({
        topic: 'Wireless Mouse Guide Without Hero Binary',
        slug: testSlug,
        category: 'gaming',
        subcategory: 'gaming-mice',
        tags: ['wireless', 'budget'],
        products: [
          {
            url: 'https://www.amazon.in/dp/B07CGP569X',
            name: 'Logitech G304 Lightspeed Wireless Gaming Mouse',
            brand: 'Logitech',
          },
        ],
      });

      const { frontmatterText } = parseMdxArticle(articleFilePath);
      const data = parseFrontmatterYaml(frontmatterText);

      expect(data.heroImageStatus).toBe('needs-generation');
      expect(result.qualityReport.status).toBe('BLOCKED');
      expect(result.qualityReport.isPublishable).toBe(false);
      expect(result.qualityReport.metadata.heroImageStatus).toBe('needs-generation');
    });

    it('should reject silent overwrite of an existing article unless allowOverwrite is true', async () => {
      // Create first article
      await createEditorialArticleDraft({
        topic: 'First Version Guide',
        slug: testSlug,
        category: 'gaming',
        products: [],
      });

      expect(fs.existsSync(articleFilePath)).toBe(true);

      // Attempt to create duplicate slug without allowOverwrite
      await expect(
        createEditorialArticleDraft({
          topic: 'Second Version Guide',
          slug: testSlug,
          category: 'gaming',
          products: [],
        })
      ).rejects.toThrow(/already exists/);
    });

    it('should reject invalid taxonomy and block creation', async () => {
      await expect(
        createEditorialArticleDraft({
          topic: 'Invalid Category Guide',
          slug: testSlug,
          category: 'non-existent-category-slug',
          products: [],
        })
      ).rejects.toThrow(/Taxonomy resolution failed/);

      expect(fs.existsSync(articleFilePath)).toBe(false);
    });
  });
});
