import { describe, it, expect } from 'vitest';
import {
  generateHeroImageBrief,
  generateCategoryArtBrief,
  generateAllCategoryArtBriefs,
  formatImageBrief,
  STANDARD_NEGATIVE_PROMPT,
  ALL_CATEGORY_SLUGS,
} from '../../src/lib/authoring/image-brief.js';

describe('Image Brief Generator (Deterministic)', () => {
  it('should generate a compliant hero image brief with original rightsStatus', () => {
    const brief = generateHeroImageBrief({
      title: '5 Best Gaming Keyboards Under ₹5,000',
      articleType: 'buying-guide',
      categorySlug: 'gaming',
      articleSlug: 'best-gaming-keyboards-under-5000',
      keywords: ['mechanical', 'rgb'],
    });

    expect(brief.type).toBe('AI_EDITORIAL');
    expect(brief.rightsStatus).toBe('original');
    expect(brief.variant).toBe('hero');
    expect(brief.targetWidth).toBe(1600);
    expect(brief.targetHeight).toBe(900);
    expect(brief.aspectRatio).toBe('16/9');
    expect(brief.contextSlug).toBe('best-gaming-keyboards-under-5000');
    expect(brief.negativePrompt).toBe(STANDARD_NEGATIVE_PROMPT);
    expect(brief.prompt).toContain('Gaming');
    expect(brief.prompt).toContain('No text, logos, or branding');
  });

  it('should generate category art brief for each supported category', () => {
    const brief = generateCategoryArtBrief('kitchen-appliances');
    expect(brief.type).toBe('CATEGORY_ART');
    expect(brief.rightsStatus).toBe('original');
    expect(brief.contextSlug).toBe('kitchen-appliances');
    expect(brief.prompt).toContain('Kitchen & Appliances');
  });

  it('should generate briefs for all 6 categories', () => {
    const briefs = generateAllCategoryArtBriefs();
    expect(briefs.length).toBe(6);
    const slugs = briefs.map((b) => b.contextSlug);
    for (const cat of ALL_CATEGORY_SLUGS) {
      expect(slugs).toContain(cat);
    }
  });

  it('should format brief cleanly for display/review', () => {
    const brief = generateCategoryArtBrief('beauty-makeup');
    const formatted = formatImageBrief(brief);
    expect(formatted).toContain('IMAGE TYPE:');
    expect(formatted).toContain('RIGHTS STATUS:  original');
    expect(formatted).toContain('NEGATIVE PROMPT:');
  });
});
