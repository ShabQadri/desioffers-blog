import { describe, it, expect } from 'vitest';
import {
  buildArticleMdx,
  formatReviewSummary,
} from '../../src/lib/authoring/article-builder.js';
import type { ArticleDraft } from '../../src/lib/authoring/types.js';

describe('Article Builder (Deterministic MDX Serializer)', () => {
  const sampleDraft: ArticleDraft = {
    title: '5 Best Gaming Keyboards Under ₹5,000',
    slug: '5-best-gaming-keyboards-under-5000',
    description: 'Find top-rated mechanical keyboards with fast switches and RGB.',
    articleType: 'buying-guide',
    publishedDate: '2026-08-27T00:00:00.000Z',
    lastVerified: '2026-08-27T00:00:00.000Z',
    productDataVerified: true,
    priceVerified: true,
    availabilityVerified: true,
    author: 'shaaz',
    category: 'gaming',
    subcategory: 'gaming-keyboards',
    tags: ['mechanical', 'rgb', 'under-5000'],
    heroImage: 'articles/2026/08/5-best-gaming-keyboards-under-5000/hero.webp',
    heroImageAlt: 'Gaming setup with mechanical keyboard',
    heroImageStatus: 'ready',
    heroImageSource: 'ai-generated',
    heroImageRightsStatus: 'original',
    featured: false,
    draft: true,
    quickPicks: [
      {
        badge: 'BEST OVERALL',
        name: 'Redragon K552 Kumara',
        asin: 'B016MAK38U',
        affiliateUrl: 'https://www.amazon.in/dp/B016MAK38U',
        priceDisplay: '₹2,699',
      },
    ],
    products: [
      {
        position: 1,
        name: 'Redragon K552 Kumara Mechanical Keyboard',
        brand: 'Redragon',
        model: 'K552',
        asin: 'B016MAK38U',
        image: '',
        imageAlt: 'Redragon K552',
        imageSource: 'none',
        editorialBadge: 'Top Pick',
        shortDescription: 'Solid budget mechanical keyboard with tactile switches.',
        bestFor: 'Gamers wanting a durable tenkeyless mechanical board',
        pros: ['Sturdy metal construction', 'Outemu Red linear switches'],
        cons: ['Somewhat loud key clatter', 'Non-detachable cable'],
        priceDisplay: '₹2,699',
        availabilityNote: 'Verified on Amazon India',
        affiliateUrl: 'https://www.amazon.in/dp/B016MAK38U',
      },
    ],
    faq: [
      {
        question: 'Are mechanical keyboards better for gaming?',
        answer: 'Mechanical switches offer consistent actuation and faster response times.',
      },
    ],
    bodySections: [
      {
        type: 'intro',
        heading: 'Why Choose a Mechanical Keyboard Under ₹5,000?',
        content: 'Mechanical keyboards provide superior typing feedback and durability compared to standard membrane models.',
      },
      {
        type: 'methodology',
        heading: 'How We Evaluated These Keyboards',
        content: 'We evaluated models based on switch type, build quality, layout, and price-to-performance ratio.',
      },
    ],
  };

  it('should serialize frontmatter and body into valid MDX', () => {
    const { mdx, slug, warnings } = buildArticleMdx(sampleDraft);

    expect(slug).toBe('5-best-gaming-keyboards-under-5000');
    expect(warnings).toHaveLength(0);
    expect(mdx).toContain('---');
    expect(mdx).toContain('title: "5 Best Gaming Keyboards Under ₹5,000"');
    expect(mdx).toContain('draft: true');
    expect(mdx).toContain('heroImageRightsStatus: "original"');
    expect(mdx).toContain('imageSource: "none"');
    expect(mdx).toContain('## Why Choose a Mechanical Keyboard Under ₹5,000?');
  });

  it('should always enforce draft: true even if input attempt tried otherwise', () => {
    const draftOverride = { ...sampleDraft, draft: false as unknown as true };
    const { mdx } = buildArticleMdx(draftOverride);
    expect(mdx).toContain('draft: true');
    expect(mdx).not.toContain('draft: false');
  });

  it('should format editorial review summary cleanly', () => {
    const summary = formatReviewSummary({
      draft: sampleDraft,
      buildWarnings: [],
      validationPassed: true,
      buildPassed: true,
    });

    expect(summary).toContain('DRAFT READY FOR REVIEW');
    expect(summary).toContain('5 Best Gaming Keyboards Under ₹5,000');
    expect(summary).toContain('Hero rights: original');
    expect(summary).toContain('no image (imageless card)');
    expect(summary).toContain('DRAFT — draft: true  (will NOT auto-publish)');
  });
});
