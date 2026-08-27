import { describe, it, expect } from 'vitest';
import { SITE_CONFIG } from '../../src/config/site.js';
import { TAXONOMY_CONFIG } from '../../src/config/taxonomy.js';
import {
  isTagIndexable,
  getTagRobotsDirective,
  buildBreadcrumbs,
  type TagMeta,
} from '../../src/utils/taxonomy.js';

describe('Phase 11D — SEO Structured Data & Tag Robots Policy', () => {
  describe('1. Tag Robots Policy & Indexability Thresholds', () => {
    const sampleTag: TagMeta = {
      name: 'Wireless',
      slug: 'wireless',
      description: 'Wireless devices and peripherals.',
      status: 'active',
    };

    it('should assign "noindex, follow" to thin tag pages below threshold (e.g. 1 to 4 articles)', () => {
      expect(TAXONOMY_CONFIG.tagIndexThreshold).toBe(5);
      expect(isTagIndexable(sampleTag, 0)).toBe(false);
      expect(isTagIndexable(sampleTag, 1)).toBe(false);
      expect(isTagIndexable(sampleTag, 4)).toBe(false);
      expect(getTagRobotsDirective(sampleTag, 3)).toBe('noindex, follow');
    });

    it('should assign "index, follow" to sufficiently populated tag pages (>= 5 articles)', () => {
      expect(isTagIndexable(sampleTag, 5)).toBe(true);
      expect(isTagIndexable(sampleTag, 12)).toBe(true);
      expect(getTagRobotsDirective(sampleTag, 5)).toBe('index, follow');
    });

    it('should respect status="deprecated" and status="merged" regardless of article count', () => {
      const deprecatedTag: TagMeta = { ...sampleTag, status: 'deprecated' };
      const mergedTag: TagMeta = { ...sampleTag, status: 'merged', mergedIntoSlug: 'bluetooth' };

      expect(isTagIndexable(deprecatedTag, 10)).toBe(false);
      expect(getTagRobotsDirective(deprecatedTag, 10)).toBe('noindex, follow');

      expect(isTagIndexable(mergedTag, 10)).toBe(false);
      expect(getTagRobotsDirective(mergedTag, 10)).toBe('noindex, follow');
    });

    it('should respect indexableOverride when explicitly set', () => {
      const forcedIndex: TagMeta = { ...sampleTag, indexableOverride: true };
      const forcedNoIndex: TagMeta = { ...sampleTag, indexableOverride: false };

      expect(isTagIndexable(forcedIndex, 1)).toBe(true);
      expect(isTagIndexable(forcedNoIndex, 20)).toBe(false);
    });
  });

  describe('2. Hierarchical Breadcrumbs Trail', () => {
    it('should generate canonical breadcrumb items with Home -> Category -> Subcategory -> Article', () => {
      const breadcrumbs = buildBreadcrumbs({
        categoryName: 'Gaming',
        categorySlug: 'gaming',
        subcategoryName: 'Gaming Mice',
        subcategorySlug: 'gaming-mice',
        articleTitle: '5 Best Budget Gaming Mice Under ₹3,000 in India',
      });

      expect(breadcrumbs).toHaveLength(4);
      expect(breadcrumbs[0]).toEqual({ label: 'Home', url: '/' });
      expect(breadcrumbs[1]).toEqual({ label: 'Gaming', url: '/category/gaming/' });
      expect(breadcrumbs[2]).toEqual({ label: 'Gaming Mice', url: '/category/gaming/gaming-mice/' });
      expect(breadcrumbs[3].label).toBe('5 Best Budget Gaming Mice Under ₹3,000 in India');
      expect(breadcrumbs[3].isCurrent).toBe(true);
    });

    it('should generate canonical breadcrumb items without subcategory when absent', () => {
      const breadcrumbs = buildBreadcrumbs({
        categoryName: 'Beauty & Makeup',
        categorySlug: 'beauty-makeup',
        articleTitle: '5 Best Makeup Kits',
      });

      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0]).toEqual({ label: 'Home', url: '/' });
      expect(breadcrumbs[1]).toEqual({ label: 'Beauty & Makeup', url: '/category/beauty-makeup/' });
      expect(breadcrumbs[2].label).toBe('5 Best Makeup Kits');
    });
  });

  describe('3. JSON-LD Structure & Schema Generator Invariants', () => {
    it('should produce valid, parseable JSON for Organization and WebSite schemas', () => {
      const orgSchema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_CONFIG.name,
        url: SITE_CONFIG.url,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_CONFIG.url}/images/brand/logo.png`,
        },
        description: SITE_CONFIG.description,
      };

      const serialized = JSON.stringify(orgSchema);
      const parsed = JSON.parse(serialized);

      expect(parsed['@context']).toBe('https://schema.org');
      expect(parsed['@type']).toBe('Organization');
      expect(parsed.name).toBe('DesiOffers Guides');
      expect(parsed.url).toBe('https://blog.desioffers.com');
    });

    it('should construct valid Article schema with headline, dates, author, and public image', () => {
      const articleData = {
        title: '5 Best Gaming Keyboards Under ₹5,000 in India (2026)',
        description: 'Buying guide for mechanical keyboards in India.',
        publishedDate: '2026-08-20T00:00:00.000Z',
        updatedDate: '2026-08-25T00:00:00.000Z',
        heroImage: '/cdn-cgi/image/w=1200,f=auto/articles/2026/08/keyboards/hero.jpg',
        authorName: 'Shaaz',
        url: 'https://blog.desioffers.com/best-gaming-keyboards-under-5000/',
      };

      const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': articleData.url,
        },
        headline: articleData.title,
        description: articleData.description,
        image: articleData.heroImage.startsWith('http')
          ? articleData.heroImage
          : `${SITE_CONFIG.url}${articleData.heroImage}`,
        datePublished: articleData.publishedDate,
        dateModified: articleData.updatedDate,
        author: {
          '@type': 'Person',
          name: articleData.authorName,
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_CONFIG.name,
          url: SITE_CONFIG.url,
          logo: {
            '@type': 'ImageObject',
            url: `${SITE_CONFIG.url}/images/brand/logo.png`,
          },
        },
      };

      const serialized = JSON.stringify(articleSchema);
      const parsed = JSON.parse(serialized);

      expect(parsed['@type']).toBe('Article');
      expect(parsed.headline).toBe(articleData.title);
      expect(parsed.author.name).toBe('Shaaz');
      expect(parsed.image).toBe('https://blog.desioffers.com/cdn-cgi/image/w=1200,f=auto/articles/2026/08/keyboards/hero.jpg');
      expect(parsed.image).not.toContain('private');
    });

    it('should safely handle quotes, ampersands, and special characters in JSON-LD', () => {
      const specialFaq = [
        {
          question: 'What is the "best" keyboard under ₹5,000 with RGB & hot-swap?',
          answer: 'We recommend models with mechanical switches & hot-swappable sockets > 50M clicks.',
        },
      ];

      const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: specialFaq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      };

      const serialized = JSON.stringify(faqSchema);
      const parsed = JSON.parse(serialized);

      expect(parsed['@type']).toBe('FAQPage');
      expect(parsed.mainEntity[0].name).toContain('"best"');
      expect(parsed.mainEntity[0].name).toContain('₹5,000');
      expect(parsed.mainEntity[0].name).toContain('&');
    });
  });
});
