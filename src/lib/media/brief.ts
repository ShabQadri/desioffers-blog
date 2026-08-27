/**
 * Media Brief System
 *
 * Generates deterministic, comprehensive image briefs for AI editorial imagery
 * and category art in DesiOffers Guides.
 *
 * RULES:
 * - Filenames and alt text must describe the actual visual scene (zero keyword stuffing).
 * - Alt text supports explicit decorative mode where appropriate.
 * - Negative prompts strictly prohibit fake commercial branding, logos, and text overlay.
 * - AI-generated editorial imagery has provenance: 'ai-generated' and rightsStatus: 'original'.
 * - Centralized dimensions referenced directly from src/config/media.ts.
 */

import { MEDIA_ROLE_SPECS, STANDARD_NEGATIVE_PROMPT } from '../../config/media.js';
import { normalizeFilename } from './normalizer.js';
import type { MediaRole, ImageSource, ImageRightsStatus } from './types.js';

export interface DetailedImageBrief {
  id: string;
  role: MediaRole;
  contextSlug: string;
  category: string;
  subcategory?: string;
  subject: string;
  visualConcept: string;
  composition: string;
  environment: string;
  lighting: string;
  aspectRatio: string;
  targetDimensions: { width: number; height: number };
  filename: string;
  altText: string;
  isDecorative?: boolean;
  provenance: ImageSource;
  rightsStatus: ImageRightsStatus;
  prompt: string;
  negativePrompt: string;
}

// ---------------------------------------------------------------------------
// Category Visual Identities (Unified editorial language)
// ---------------------------------------------------------------------------

interface CategoryStyleGuide {
  name: string;
  subject: string;
  environment: string;
  lighting: string;
  colorPalette: string;
  composition: string;
  altDescription: string;
}

export const CATEGORY_STYLE_GUIDES: Record<string, CategoryStyleGuide> = {
  'beauty-makeup': {
    name: 'Beauty & Makeup',
    subject: 'Curated cosmetic brushes, skincare compacts, and beauty essentials on a clean dressing table',
    environment: 'Modern vanity setting with a subtle round mirror reflection and soft marble surface',
    lighting: 'Soft diffused natural daylight with gentle warm highlights',
    colorPalette: 'Muted blush pink, warm rose, soft cream, and subtle violet accents',
    composition: 'Eye-level horizontal composition, shallow depth of field, clean negative space',
    altDescription: 'Assorted makeup brushes and skincare essentials arranged on a clean vanity table in soft daylight',
  },
  gaming: {
    name: 'Gaming',
    subject: 'Mechanical gaming keyboard with clean keycaps and smooth deskmat',
    environment: 'Modern minimalist gaming desk setup with subtle dark wood and ambient wall illumination',
    lighting: 'Atmospheric ambient lighting with subtle purple and cyan RGB desk accents',
    colorPalette: 'Deep charcoal, slate, and vibrant violet/magenta accent glow',
    composition: 'Clean 45-degree angle desk overview, sharp focus on keyboard texture, uncluttered layout',
    altDescription: 'Mechanical gaming keyboard and desk setup illuminated with subtle RGB lighting',
  },
  'kitchen-appliances': {
    name: 'Kitchen & Appliances',
    subject: 'Modern countertop cooking appliances and fresh ingredients on a stone kitchen island',
    environment: 'Contemporary Indian kitchen interior with clean tile backsplash and warm wooden cabinets',
    lighting: 'Bright, airy morning sunlight with warm natural kitchen ambiance',
    colorPalette: 'Warm terracotta, natural wood, matte charcoal, and stainless steel accents',
    composition: 'Wide 3:2 landscape view of kitchen countertop, balanced and inviting arrangement',
    altDescription: 'Modern kitchen counter with contemporary cooking appliances and wooden cabinetry in bright morning light',
  },
  'electronics-audio': {
    name: 'Electronics & Audio',
    subject: 'Premium over-ear wireless headphones resting beside an audio interface on a clean oak desk',
    environment: 'Minimalist tech workspace with acoustic wall paneling and a small indoor plant',
    lighting: 'Even studio lighting with clean soft shadows and natural window fill',
    colorPalette: 'Matte black, brushed silver, natural oak, and cool slate grey',
    composition: 'Clean centered hero composition with generous breathing room and sharp detail',
    altDescription: 'Wireless headphones resting on an oak desk in a clean, modern workspace',
  },
  'home-living': {
    name: 'Home & Living',
    subject: 'Cozy living room corner with organized shelving, textured throw pillow, and potted monstera plant',
    environment: 'Tastefully decorated contemporary Indian living room with warm hardwood flooring',
    lighting: 'Warm afternoon sunlight streaming through sheer curtains',
    colorPalette: 'Earthy taupe, sage green, warm brass, and cream linen',
    composition: 'Comfortable eye-level interior perspective, balanced architectural framing',
    altDescription: 'Bright and organized living room space with wooden shelving, indoor plants, and natural sunlight',
  },
  'deals-offers': {
    name: 'Deals & Offers',
    subject: 'Curated shopping finds, gift boxes, and lifestyle items arranged on a modern aesthetic table',
    environment: 'Clean editorial tabletop scene with stylish shopping bags and ribbons',
    lighting: 'Vibrant, high-key studio lighting with crisp, clear highlights',
    colorPalette: 'DesiOffers brand violet, warm amber gold, and crisp clean white',
    composition: 'Dynamic flat-lay/top-down arrangement with deliberate symmetry and elegance',
    altDescription: 'Curated lifestyle and shopping gift items arranged on a clean, bright editorial surface',
  },
};

// ---------------------------------------------------------------------------
// 6 Production-Ready Category Briefs
// ---------------------------------------------------------------------------

export function generateCategoryBrief(categorySlug: string): DetailedImageBrief {
  const guide = CATEGORY_STYLE_GUIDES[categorySlug];
  if (!guide) {
    throw new Error(`Unsupported category slug "${categorySlug}". Valid categories: ${Object.keys(CATEGORY_STYLE_GUIDES).join(', ')}`);
  }

  const spec = MEDIA_ROLE_SPECS.category;
  const filename = normalizeFilename({
    originalFilename: `${categorySlug}-category.webp`,
    contextSlug: categorySlug,
    role: 'category',
    extensionOverride: 'webp',
  });

  const prompt =
    `Editorial photography for DesiOffers Guides category "${guide.name}". ` +
    `Subject: ${guide.subject}. ` +
    `Setting: ${guide.environment}. ` +
    `Lighting: ${guide.lighting}. ` +
    `Color palette: ${guide.colorPalette}. ` +
    `Composition: ${guide.composition}. ` +
    `Style: Professional editorial photography, 3:2 landscape ratio, ultra-clean commercial aesthetic. ` +
    `No logos, no brand marks, no readable text overlay, no watermark.`;

  return {
    id: `category-${categorySlug}`,
    role: 'category',
    contextSlug: categorySlug,
    category: categorySlug,
    subject: guide.subject,
    visualConcept: `${guide.name} Category Banner`,
    composition: guide.composition,
    environment: guide.environment,
    lighting: guide.lighting,
    aspectRatio: spec.aspectRatio,
    targetDimensions: { width: spec.width, height: spec.height },
    filename,
    altText: guide.altDescription,
    provenance: 'ai-generated',
    rightsStatus: 'original',
    prompt,
    negativePrompt: STANDARD_NEGATIVE_PROMPT,
  };
}

export function generateAllCategoryBriefs(): DetailedImageBrief[] {
  return Object.keys(CATEGORY_STYLE_GUIDES).map((slug) => generateCategoryBrief(slug));
}

// ---------------------------------------------------------------------------
// Article Hero Brief Generator
// ---------------------------------------------------------------------------

export function generateArticleHeroBrief(params: {
  title: string;
  articleSlug: string;
  categorySlug: string;
  subcategorySlug?: string;
  focusSubject?: string;
  isDecorative?: boolean;
}): DetailedImageBrief {
  const { title, articleSlug, categorySlug, subcategorySlug, focusSubject, isDecorative = false } = params;
  const spec = MEDIA_ROLE_SPECS.hero;
  const catGuide = CATEGORY_STYLE_GUIDES[categorySlug] || CATEGORY_STYLE_GUIDES['gaming'];

  const subject = focusSubject || `Editorial scene representing ${title}`;
  const filename = normalizeFilename({
    originalFilename: `${articleSlug}-hero.webp`,
    contextSlug: articleSlug,
    role: 'hero',
    extensionOverride: 'webp',
  });

  // Alt text is literal visual description; empty if explicitly decorative
  const altText = isDecorative
    ? ''
    : `${title} — ${subject.replace(/^Editorial scene representing\s*/i, '')} in ${catGuide.environment.toLowerCase().split(' with ')[0]}`;

  const prompt =
    `Editorial hero photograph for buying guide: "${title}". ` +
    `Subject: ${subject}. ` +
    `Environment: ${catGuide.environment}. ` +
    `Lighting: ${catGuide.lighting}. ` +
    `Colors: ${catGuide.colorPalette}. ` +
    `Composition: Wide 16:9 cinematic framing, eye-level angle, clean background. ` +
    `Style: Premium commercial lifestyle photography, realistic textures. ` +
    `No logos, no commercial brand text, no watermarks.`;

  return {
    id: `hero-${articleSlug}`,
    role: 'hero',
    contextSlug: articleSlug,
    category: categorySlug,
    subcategory: subcategorySlug,
    subject,
    visualConcept: `${title} Hero Image`,
    composition: 'Wide 16:9 cinematic framing with balanced editorial composition',
    environment: catGuide.environment,
    lighting: catGuide.lighting,
    aspectRatio: spec.aspectRatio,
    targetDimensions: { width: spec.width, height: spec.height },
    filename,
    altText,
    isDecorative,
    provenance: 'ai-generated',
    rightsStatus: 'original',
    prompt,
    negativePrompt: STANDARD_NEGATIVE_PROMPT,
  };
}
