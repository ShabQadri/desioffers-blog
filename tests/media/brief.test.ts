import { describe, it, expect } from 'vitest';
import {
  generateAllCategoryBriefs,
  generateArticleHeroBrief,
  CATEGORY_STYLE_GUIDES,
} from '../../src/lib/media/brief.js';
import { MEDIA_ROLE_SPECS, STANDARD_NEGATIVE_PROMPT } from '../../src/config/media.js';

describe('Phase 5 — Media Brief System & Category Art', () => {
  describe('1. Standard Media Role Specifications', () => {
    it('should specify correct dimensions for all media roles', () => {
      expect(MEDIA_ROLE_SPECS.hero.width).toBe(1600);
      expect(MEDIA_ROLE_SPECS.hero.height).toBe(900);
      expect(MEDIA_ROLE_SPECS.hero.aspectRatio).toBe('16/9');

      expect(MEDIA_ROLE_SPECS.category.width).toBe(1200);
      expect(MEDIA_ROLE_SPECS.category.height).toBe(800);
      expect(MEDIA_ROLE_SPECS.category.aspectRatio).toBe('3/2');

      expect(MEDIA_ROLE_SPECS.product.width).toBe(1000);
      expect(MEDIA_ROLE_SPECS.product.height).toBe(1000);
      expect(MEDIA_ROLE_SPECS.product.aspectRatio).toBe('1/1');

      expect(MEDIA_ROLE_SPECS.social.width).toBe(1200);
      expect(MEDIA_ROLE_SPECS.social.height).toBe(630);
      expect(MEDIA_ROLE_SPECS.social.aspectRatio).toBe('1.91/1');

      expect(MEDIA_ROLE_SPECS.author.width).toBe(400);
      expect(MEDIA_ROLE_SPECS.author.height).toBe(400);
    });
  });

  describe('2. Six Production-Ready Category Briefs', () => {
    const expectedSlugs = [
      'beauty-makeup',
      'gaming',
      'kitchen-appliances',
      'electronics-audio',
      'home-living',
      'deals-offers',
    ];

    it('should have style guide definitions for all 6 categories', () => {
      for (const slug of expectedSlugs) {
        expect(CATEGORY_STYLE_GUIDES[slug]).toBeDefined();
        expect(CATEGORY_STYLE_GUIDES[slug].name).toBeDefined();
        expect(CATEGORY_STYLE_GUIDES[slug].environment).toBeDefined();
        expect(CATEGORY_STYLE_GUIDES[slug].lighting).toBeDefined();
      }
    });

    it('should generate all 6 category briefs with consistent editorial standards', () => {
      const briefs = generateAllCategoryBriefs();
      expect(briefs.length).toBe(6);

      for (const brief of briefs) {
        expect(brief.role).toBe('category');
        expect(brief.provenance).toBe('ai-generated');
        expect(brief.rightsStatus).toBe('original');
        expect(brief.targetDimensions.width).toBe(1200);
        expect(brief.targetDimensions.height).toBe(800);
        expect(brief.aspectRatio).toBe('3/2');
        expect(brief.filename).toContain('-category.webp');
        expect(brief.negativePrompt).toBe(STANDARD_NEGATIVE_PROMPT);
        expect(brief.prompt).toContain('Editorial photography');
        expect(brief.prompt).toContain('No logos, no brand marks');
      }
    });
  });

  describe('3. Article Hero Brief Generation', () => {
    it('should generate a detailed hero brief for an article', () => {
      const heroBrief = generateArticleHeroBrief({
        title: '5 Best Gaming Keyboards Under ₹5,000 in India',
        articleSlug: 'best-gaming-keyboards-under-5000',
        categorySlug: 'gaming',
        subcategorySlug: 'gaming-keyboards',
        focusSubject: 'Mechanical gaming keyboard with Outemu Red switches on a dark wood desk',
      });

      expect(heroBrief.role).toBe('hero');
      expect(heroBrief.contextSlug).toBe('best-gaming-keyboards-under-5000');
      expect(heroBrief.provenance).toBe('ai-generated');
      expect(heroBrief.rightsStatus).toBe('original');
      expect(heroBrief.targetDimensions.width).toBe(1600);
      expect(heroBrief.targetDimensions.height).toBe(900);
      expect(heroBrief.aspectRatio).toBe('16/9');
      expect(heroBrief.filename).toBe('best-gaming-keyboards-under-5000-hero.webp');
      expect(heroBrief.altText).toContain('Gaming Keyboards');
      expect(heroBrief.isDecorative).toBe(false);
    });

    it('should support explicit decorative mode with empty alt text', () => {
      const decorativeBrief = generateArticleHeroBrief({
        title: 'Ambient Lighting Guide',
        articleSlug: 'ambient-lighting-guide',
        categorySlug: 'home-living',
        isDecorative: true,
      });

      expect(decorativeBrief.isDecorative).toBe(true);
      expect(decorativeBrief.altText).toBe('');
    });
  });
});
