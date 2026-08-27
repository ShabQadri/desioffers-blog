/**
 * Image Brief Generator
 *
 * Deterministic utility that produces structured ImageBrief objects.
 * Antigravity uses the brief to generate images using its own capability.
 *
 * This module does NOT generate images.
 * This module does NOT call any external AI API.
 * Image generation is an Antigravity capability, not a project-code function.
 *
 * MEDIA RIGHTS TERMINOLOGY:
 * AI-generated editorial imagery:
 *   source = 'ai-generated'
 *   rightsStatus = 'original'  ← we own the output
 *
 * The negativePrompt always includes the no-fabrication clause:
 *   "no logos, no text overlay, no specific product model, no recognizable
 *    branding, no packaging, no people"
 */

import type { ImageBrief, ArticleType, ImageVariantRole } from './types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Standard negative prompt appended to ALL AI editorial image briefs */
export const STANDARD_NEGATIVE_PROMPT =
  'no logos, no text overlay, no specific product model, no recognizable branding, ' +
  'no product packaging, no people, no hands, no watermarks, no UI elements';

/** Target dimensions per role */
const ROLE_DIMENSIONS: Record<ImageVariantRole, { width: number; height: number; aspectRatio: string }> = {
  hero: { width: 1600, height: 900, aspectRatio: '16/9' },
  social: { width: 1200, height: 630, aspectRatio: '1.91/1' },
  card: { width: 400, height: 267, aspectRatio: '3/2' },
  medium: { width: 800, height: 533, aspectRatio: '3/2' },
  article: { width: 1200, height: 800, aspectRatio: '3/2' },
  thumbnail: { width: 150, height: 150, aspectRatio: '1/1' },
};

// ---------------------------------------------------------------------------
// Article type → visual theme mapping
// ---------------------------------------------------------------------------

interface ArticleVisualTheme {
  settingDescriptor: string;
  moodDescriptor: string;
  lightingDescriptor: string;
}

const ARTICLE_TYPE_THEMES: Record<ArticleType, ArticleVisualTheme> = {
  'buying-guide': {
    settingDescriptor: 'clean, well-lit product comparison scene',
    moodDescriptor: 'informative, trustworthy',
    lightingDescriptor: 'soft natural light with subtle warm tones',
  },
  'best-products': {
    settingDescriptor: 'premium editorial product showcase',
    moodDescriptor: 'aspirational, premium',
    lightingDescriptor: 'studio-quality lighting with clean white or dark background',
  },
  'comparison': {
    settingDescriptor: 'side-by-side editorial layout, minimal and clean',
    moodDescriptor: 'analytical, clear',
    lightingDescriptor: 'even, flat lighting with clean shadows',
  },
  'how-to-choose': {
    settingDescriptor: 'decision-making scene with subtle visual metaphor',
    moodDescriptor: 'helpful, guiding',
    lightingDescriptor: 'warm, inviting lighting',
  },
  'gift-guide': {
    settingDescriptor: 'festive, warm gift-giving scene',
    moodDescriptor: 'celebratory, warm',
    lightingDescriptor: 'warm holiday-style lighting with soft bokeh',
  },
  'deal-guide': {
    settingDescriptor: 'energetic, deal-focused visual',
    moodDescriptor: 'urgent, exciting',
    lightingDescriptor: 'vibrant, high-contrast lighting',
  },
};

// ---------------------------------------------------------------------------
// Category → visual identity mapping
// ---------------------------------------------------------------------------

interface CategoryVisualIdentity {
  settingKeywords: string[];
  colorAccent: string;
  contextNote: string;
}

const CATEGORY_VISUAL_IDENTITY: Record<string, CategoryVisualIdentity> = {
  gaming: {
    settingKeywords: ['gaming desk', 'RGB lighting', 'mechanical keyboard', 'gaming setup', 'dark ambient'],
    colorAccent: 'subtle purple and RGB accent colors',
    contextNote: 'modern Indian gaming setup, premium aesthetic',
  },
  'electronics-audio': {
    settingKeywords: ['clean desk', 'electronics', 'headphones', 'earbuds', 'audio gear', 'minimalist'],
    colorAccent: 'cool whites and silvers',
    contextNote: 'clean minimalist product scene',
  },
  'kitchen-appliances': {
    settingKeywords: ['modern kitchen', 'kitchen counter', 'appliances', 'cooking scene', 'warm kitchen'],
    colorAccent: 'warm neutrals and clean whites',
    contextNote: 'modern Indian kitchen context',
  },
  'beauty-makeup': {
    settingKeywords: ['vanity table', 'beauty setup', 'cosmetics', 'soft pastel', 'mirror'],
    colorAccent: 'soft pinks, mauves, and warm purples',
    contextNote: 'modern Indian beauty and lifestyle context',
  },
  'home-living': {
    settingKeywords: ['living room', 'home decor', 'Indian home', 'organized space', 'warm interior'],
    colorAccent: 'earthy tones, warm neutrals, subtle violet',
    contextNote: 'modern Indian home and lifestyle context',
  },
  'deals-offers': {
    settingKeywords: ['shopping scene', 'deal tags', 'savings visual', 'vibrant retail'],
    colorAccent: 'energetic orange and yellow accents',
    contextNote: 'deals and shopping context for Indian consumers',
  },
};

// ---------------------------------------------------------------------------
// Hero image brief generator
// ---------------------------------------------------------------------------

/**
 * Generates a structured image brief for an article hero image.
 *
 * Antigravity uses this brief to generate the image using its own capability.
 * The returned brief is never fabricated — it is a structured instruction set.
 *
 * @param params.title         - Article title (used to derive visual theme)
 * @param params.articleType   - Determines visual mood/setting
 * @param params.categorySlug  - Category determines visual identity
 * @param params.keywords      - Optional additional keywords to guide prompt
 * @param params.articleSlug   - Used as contextSlug for R2 key assignment
 */
export function generateHeroImageBrief(params: {
  title: string;
  articleType: ArticleType;
  categorySlug: string;
  keywords?: string[];
  articleSlug: string;
}): ImageBrief {
  const { title, articleType, categorySlug, keywords = [], articleSlug } = params;

  const theme = ARTICLE_TYPE_THEMES[articleType] ?? ARTICLE_TYPE_THEMES['buying-guide'];
  const identity = CATEGORY_VISUAL_IDENTITY[categorySlug] ?? {
    settingKeywords: ['clean product scene'],
    colorAccent: 'subtle violet accent',
    contextNote: 'modern Indian context',
  };

  const settingKeywords = identity.settingKeywords.slice(0, 3).join(', ');
  const additionalKeywords = keywords.length > 0 ? `, ${keywords.slice(0, 3).join(', ')}` : '';

  const prompt =
    `Premium editorial photograph for a "${title}" buying guide article. ` +
    `Scene: ${theme.settingDescriptor} with ${settingKeywords}${additionalKeywords}. ` +
    `Mood: ${theme.moodDescriptor}. ` +
    `Lighting: ${theme.lightingDescriptor}. ` +
    `Color accent: ${identity.colorAccent}. ` +
    `Context: ${identity.contextNote}. ` +
    `Style: high-quality editorial photography, clean composition, 16:9 format. ` +
    `No specific product model visible. No text, logos, or branding.`;

  const altDraft =
    `Editorial hero image for "${title}" — ${settingKeywords} scene with ${identity.colorAccent.split(',')[0]} tones`;

  const dimensions = ROLE_DIMENSIONS.hero;

  return {
    type: 'AI_EDITORIAL',
    prompt,
    negativePrompt: STANDARD_NEGATIVE_PROMPT,
    targetWidth: dimensions.width,
    targetHeight: dimensions.height,
    aspectRatio: dimensions.aspectRatio,
    altDraft,
    variant: 'hero',
    rightsStatus: 'original',
    contextSlug: articleSlug,
  };
}

// ---------------------------------------------------------------------------
// Category art brief generator
// ---------------------------------------------------------------------------

const CATEGORY_NAMES: Record<string, string> = {
  gaming: 'Gaming',
  'electronics-audio': 'Electronics & Audio',
  'kitchen-appliances': 'Kitchen & Appliances',
  'beauty-makeup': 'Beauty & Makeup',
  'home-living': 'Home & Living',
  'deals-offers': 'Deals & Offers',
};

/**
 * Generates a structured image brief for a category art image.
 * Category art is reusable across all articles in the category.
 *
 * Visual identity rules:
 * - Premium editorial quality
 * - Subtle violet/purple accent consistent with DesiOffers brand
 * - Modern Indian context where relevant
 * - 16:9 format
 * - No text, logos, specific products, or branding
 */
export function generateCategoryArtBrief(categorySlug: string): ImageBrief {
  const identity = CATEGORY_VISUAL_IDENTITY[categorySlug];
  const categoryName = CATEGORY_NAMES[categorySlug] ?? categorySlug;

  if (!identity) {
    throw new Error(`No visual identity defined for category slug "${categorySlug}". Add it to CATEGORY_VISUAL_IDENTITY.`);
  }

  const settingKeywords = identity.settingKeywords.join(', ');

  const prompt =
    `Premium editorial hero image for the DesiOffers Guides "${categoryName}" category. ` +
    `Scene: ${settingKeywords}. ` +
    `Color accent: ${identity.colorAccent}. ` +
    `Context: ${identity.contextNote}. ` +
    `Visual style: clean, editorial, premium photography or illustration. ` +
    `Aspect ratio: 16:9. Suitable for use as a category landing page banner. ` +
    `No specific product model visible. No text, logos, or branding.`;

  const altDraft = `DesiOffers Guides ${categoryName} category — ${settingKeywords.split(',')[0].trim()} editorial image`;

  const dimensions = ROLE_DIMENSIONS.hero;

  return {
    type: 'CATEGORY_ART',
    prompt,
    negativePrompt: STANDARD_NEGATIVE_PROMPT,
    targetWidth: dimensions.width,
    targetHeight: dimensions.height,
    aspectRatio: dimensions.aspectRatio,
    altDraft,
    variant: 'hero',
    rightsStatus: 'original',
    contextSlug: categorySlug,
  };
}

// ---------------------------------------------------------------------------
// All six category briefs — used in Phase 5 category art generation
// ---------------------------------------------------------------------------

export const ALL_CATEGORY_SLUGS = [
  'gaming',
  'electronics-audio',
  'kitchen-appliances',
  'beauty-makeup',
  'home-living',
  'deals-offers',
] as const;

export type CategorySlug = (typeof ALL_CATEGORY_SLUGS)[number];

/**
 * Generates image briefs for all six DesiOffers categories.
 * Called during Phase 5 by generate-category-art.ts.
 */
export function generateAllCategoryArtBriefs(): ImageBrief[] {
  return ALL_CATEGORY_SLUGS.map((slug) => generateCategoryArtBrief(slug));
}

// ---------------------------------------------------------------------------
// Format brief for display (used by Antigravity to show the brief to user)
// ---------------------------------------------------------------------------

/**
 * Formats an ImageBrief as a human-readable string for review.
 */
export function formatImageBrief(brief: ImageBrief): string {
  return [
    `IMAGE TYPE:     ${brief.type}`,
    `VARIANT:        ${brief.variant.toUpperCase()} (${brief.targetWidth}×${brief.targetHeight}, ${brief.aspectRatio})`,
    `CONTEXT:        ${brief.contextSlug}`,
    `RIGHTS STATUS:  ${brief.rightsStatus}`,
    '',
    `PROMPT:`,
    brief.prompt,
    '',
    `NEGATIVE PROMPT:`,
    brief.negativePrompt,
    '',
    `ALT TEXT DRAFT: ${brief.altDraft}`,
  ].join('\n');
}
