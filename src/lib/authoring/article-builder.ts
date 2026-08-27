/**
 * Article Builder — Deterministic MDX Serializer
 *
 * Receives a fully-validated ArticleDraft object from Antigravity
 * and serializes it into a complete MDX string ready to write to disk.
 *
 * IMPORTANT: This module contains NO AI reasoning, no LLM calls, and
 * no network requests. It is a pure string serializer.
 *
 * Antigravity (the AI layer) is responsible for:
 *   - Interpreting the user's natural language command
 *   - Generating article body text and product descriptions
 *   - Resolving taxonomy (after calling taxonomy-resolver.ts)
 *   - Deciding article type
 *
 * This module is responsible for:
 *   - Serializing the structured ArticleDraft to valid YAML frontmatter + MDX
 *   - Enforcing draft: true on all output
 *   - Enforcing date formatting (ISO 8601)
 *   - Enforcing YAML quoting rules
 *   - Writing body sections in the correct order per article type
 *
 * Usage:
 *   const mdx = buildArticleMdx(draft);
 *   fs.writeFileSync(`src/content/articles/${draft.slug}.mdx`, mdx, 'utf-8');
 */

import type { ArticleDraft, BodySection, ProductDraft, QuickPickDraft, FaqItem, ArticleType } from './types.js';

// ---------------------------------------------------------------------------
// Body section ordering per article type
// ---------------------------------------------------------------------------

const SECTION_ORDER: Record<ArticleType, BodySection['type'][]> = {
  'buying-guide': ['intro', 'methodology', 'quick-picks-intro', 'product-section', 'buying-factors', 'faq-section'],
  'best-products': ['intro', 'quick-picks-intro', 'product-section', 'comparison-table', 'faq-section'],
  'comparison': ['intro', 'product-section', 'comparison-table', 'verdict', 'faq-section'],
  'how-to-choose': ['intro', 'buying-factors', 'product-section', 'verdict', 'faq-section'],
  'gift-guide': ['intro', 'quick-picks-intro', 'product-section', 'faq-section'],
  'deal-guide': ['intro', 'product-section', 'verdict'],
};

// ---------------------------------------------------------------------------
// YAML escaping helpers
// ---------------------------------------------------------------------------

/**
 * Escapes a string value for safe inclusion in YAML frontmatter.
 * Uses double-quoted YAML strings to handle colons, special chars, etc.
 */
function yamlStr(value: string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '""';
  // Escape backslashes first, then double-quotes
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function yamlBool(value: boolean): string {
  return value ? 'true' : 'false';
}

function yamlDate(dateStr: string): string {
  // Ensure ISO 8601 date format — strip time if present for clean frontmatter
  try {
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch {
    return dateStr;
  }
}

function yamlStringArray(items: string[]): string {
  if (items.length === 0) return '[]';
  return `[${items.map((i) => yamlStr(i)).join(', ')}]`;
}

// ---------------------------------------------------------------------------
// Frontmatter serializer
// ---------------------------------------------------------------------------

function serializeFrontmatter(draft: ArticleDraft): string {
  const lines: string[] = ['---'];

  // Core identity
  lines.push(`title: ${yamlStr(draft.title)}`);
  lines.push(`slug: ${yamlStr(draft.slug)}`);
  lines.push(`description: ${yamlStr(draft.description)}`);
  lines.push(`articleType: ${yamlStr(draft.articleType)}`);

  // Dates
  lines.push(`publishedDate: ${yamlDate(draft.publishedDate)}`);
  if (draft.updatedDate) {
    lines.push(`updatedDate: ${yamlDate(draft.updatedDate)}`);
  }
  lines.push(`lastVerified: ${yamlDate(draft.lastVerified)}`);

  // Verification flags
  lines.push(`productDataVerified: ${yamlBool(draft.productDataVerified)}`);
  lines.push(`priceVerified: ${yamlBool(draft.priceVerified)}`);
  lines.push(`availabilityVerified: ${yamlBool(draft.availabilityVerified)}`);

  // Taxonomy
  lines.push(`author: ${yamlStr(draft.author)}`);
  lines.push(`category: ${yamlStr(draft.category)}`);
  if (draft.subcategory) {
    lines.push(`subcategory: ${yamlStr(draft.subcategory)}`);
  }
  if (draft.tags && draft.tags.length > 0) {
    lines.push(`tags: ${yamlStringArray(draft.tags)}`);
  } else {
    lines.push(`tags: []`);
  }

  // Hero image
  lines.push(`heroImage: ${yamlStr(draft.heroImage)}`);
  lines.push(`heroImageAlt: ${yamlStr(draft.heroImageAlt)}`);
  lines.push(`heroImageStatus: ${yamlStr(draft.heroImageStatus)}`);
  if (draft.heroImageSource) {
    lines.push(`heroImageSource: ${yamlStr(draft.heroImageSource)}`);
  }
  if (draft.heroImageRightsStatus) {
    lines.push(`heroImageRightsStatus: ${yamlStr(draft.heroImageRightsStatus)}`);
  }

  // Metadata
  lines.push(`featured: ${yamlBool(draft.featured)}`);
  if (draft.affiliateDisclosure) {
    lines.push(`affiliateDisclosure: ${yamlStr(draft.affiliateDisclosure)}`);
  }
  if (draft.readingTime !== undefined) {
    lines.push(`readingTime: ${draft.readingTime}`);
  }
  if (draft.seoTitle) {
    lines.push(`seoTitle: ${yamlStr(draft.seoTitle)}`);
  }
  if (draft.seoDescription) {
    lines.push(`seoDescription: ${yamlStr(draft.seoDescription)}`);
  }

  // Draft — ALWAYS true; never auto-published
  lines.push(`draft: true`);

  // Quick picks
  if (draft.quickPicks && draft.quickPicks.length > 0) {
    lines.push(`quickPicks:`);
    for (const pick of draft.quickPicks) {
      lines.push(serializeQuickPick(pick));
    }
  }

  // Products
  lines.push(`products:`);
  for (const product of draft.products) {
    lines.push(serializeProduct(product));
  }

  // FAQ
  if (draft.faq && draft.faq.length > 0) {
    lines.push(`faq:`);
    for (const item of draft.faq) {
      lines.push(serializeFaqItem(item));
    }
  }

  // Sources
  if (draft.sources && draft.sources.length > 0) {
    lines.push(`sources:`);
    for (const source of draft.sources) {
      lines.push(`  - ${yamlStr(source)}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Product serializer
// ---------------------------------------------------------------------------

function serializeProduct(product: ProductDraft): string {
  const lines: string[] = [];
  lines.push(`  - position: ${product.position}`);
  lines.push(`    name: ${yamlStr(product.name)}`);
  lines.push(`    brand: ${yamlStr(product.brand)}`);
  if (product.model) {
    lines.push(`    model: ${yamlStr(product.model)}`);
  }
  if (product.asin) {
    lines.push(`    asin: ${yamlStr(product.asin)}`);
  }
  lines.push(`    image: ${yamlStr(product.image)}`);
  lines.push(`    imageAlt: ${yamlStr(product.imageAlt)}`);
  lines.push(`    imageSource: ${yamlStr(product.imageSource)}`);
  if (product.imageRightsStatus) {
    lines.push(`    imageRightsStatus: ${yamlStr(product.imageRightsStatus)}`);
  }
  if (product.editorialBadge) {
    lines.push(`    editorialBadge: ${yamlStr(product.editorialBadge)}`);
  }
  lines.push(`    shortDescription: ${yamlStr(product.shortDescription)}`);
  lines.push(`    bestFor: ${yamlStr(product.bestFor)}`);
  lines.push(`    pros:`);
  for (const pro of product.pros) {
    lines.push(`      - ${yamlStr(pro)}`);
  }
  lines.push(`    cons:`);
  for (const con of product.cons) {
    lines.push(`      - ${yamlStr(con)}`);
  }
  if (product.priceDisplay) {
    lines.push(`    priceDisplay: ${yamlStr(product.priceDisplay)}`);
  }
  if (product.priceObservedAt) {
    lines.push(`    priceObservedAt: ${yamlStr(product.priceObservedAt)}`);
  }
  if (product.priceVerification) {
    lines.push(`    priceVerification: ${yamlStr(product.priceVerification)}`);
  }
  if (product.availabilityNote) {
    lines.push(`    availabilityNote: ${yamlStr(product.availabilityNote)}`);
  }
  if (product.availabilityVerification) {
    lines.push(`    availabilityVerification: ${yamlStr(product.availabilityVerification)}`);
  }
  lines.push(`    affiliateUrl: ${yamlStr(product.affiliateUrl)}`);
  if (product.researchNote) {
    lines.push(`    researchNote: ${yamlStr(product.researchNote)}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Quick pick serializer
// ---------------------------------------------------------------------------

function serializeQuickPick(pick: QuickPickDraft): string {
  const lines: string[] = [];
  lines.push(`  - badge: ${yamlStr(pick.badge)}`);
  lines.push(`    name: ${yamlStr(pick.name)}`);
  if (pick.asin) {
    lines.push(`    asin: ${yamlStr(pick.asin)}`);
  }
  lines.push(`    affiliateUrl: ${yamlStr(pick.affiliateUrl)}`);
  if (pick.priceDisplay) {
    lines.push(`    priceDisplay: ${yamlStr(pick.priceDisplay)}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// FAQ serializer
// ---------------------------------------------------------------------------

function serializeFaqItem(item: FaqItem): string {
  const lines: string[] = [];
  lines.push(`  - question: ${yamlStr(item.question)}`);
  lines.push(`    answer: ${yamlStr(item.answer)}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Body serializer
// ---------------------------------------------------------------------------

/**
 * Orders body sections according to the article type template,
 * then serializes them to Markdown.
 *
 * Sections that appear in the template order come first.
 * 'custom' sections and unrecognised types are appended at the end.
 */
function serializeBody(draft: ArticleDraft): string {
  const order = SECTION_ORDER[draft.articleType] ?? SECTION_ORDER['buying-guide'];

  // Sort sections by template order
  const ordered: BodySection[] = [];
  const unmatched: BodySection[] = [];

  for (const type of order) {
    const section = draft.bodySections.find((s) => s.type === type);
    if (section) ordered.push(section);
  }
  for (const section of draft.bodySections) {
    if (!order.includes(section.type) || section.type === 'custom') {
      unmatched.push(section);
    }
  }

  const allSections = [...ordered, ...unmatched];
  return allSections
    .map((s) => {
      if (s.heading) {
        return `## ${s.heading}\n\n${s.content.trim()}`;
      }
      return s.content.trim();
    })
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface BuildResult {
  mdx: string;
  slug: string;
  warnings: string[];
}

/**
 * Builds a complete MDX string from a validated ArticleDraft.
 *
 * Preconditions (caller must ensure before calling):
 * - draft.author has been validated against src/content/authors/
 * - draft.category, subcategory, tags validated by taxonomy-resolver
 * - draft.slug is unique (checked by taxonomy-resolver.isSlugTaken)
 * - draft.products is non-empty
 * - All required fields are present
 *
 * This function does NOT validate — it serializes.
 * Validation is the responsibility of taxonomy-resolver and validator.
 *
 * @returns BuildResult with the MDX string, slug, and any serialization warnings
 */
export function buildArticleMdx(draft: ArticleDraft): BuildResult {
  const warnings: string[] = [];

  // Safety: enforce draft:true — this module never writes draft:false
  const safeDraft: ArticleDraft = { ...draft, draft: true };

  // Warn if slug appears to have been user-modified in an unsafe way
  if (!/^[a-z0-9-]+$/.test(safeDraft.slug)) {
    warnings.push(
      `Slug "${safeDraft.slug}" contains characters outside [a-z0-9-]. ` +
        'Review and sanitize before writing to disk.'
    );
  }

  // Warn if products is empty
  if (!safeDraft.products || safeDraft.products.length === 0) {
    warnings.push('Article has no products defined. Add product entries before publishing.');
  }

  // Warn if heroImage is empty and status is 'ready'
  if (!safeDraft.heroImage && safeDraft.heroImageStatus === 'ready') {
    warnings.push(
      'heroImage is empty but heroImageStatus is "ready". ' +
        'Set heroImageStatus to "needs-generation" or provide the R2 key.'
    );
  }

  const frontmatter = serializeFrontmatter(safeDraft);
  const body = serializeBody(safeDraft);

  const mdx = `${frontmatter}\n\n${body}\n`;

  return {
    mdx,
    slug: safeDraft.slug,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Review summary formatter
// ---------------------------------------------------------------------------

/**
 * Formats the editorial review summary shown to the user after draft creation.
 * Antigravity displays this output to request human review before commit.
 */
export function formatReviewSummary(params: {
  draft: ArticleDraft;
  buildWarnings: string[];
  validationPassed: boolean;
  buildPassed: boolean;
}): string {
  const { draft, buildWarnings, validationPassed, buildPassed } = params;

  const lines: string[] = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'DRAFT READY FOR REVIEW',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `ARTICLE`,
    `  Title:       ${draft.title}`,
    `  Slug:        ${draft.slug}`,
    `  Type:        ${draft.articleType}`,
    `  Author:      ${draft.author}`,
    '',
    `TAXONOMY`,
    `  Category:    ${draft.category}`,
    `  Subcategory: ${draft.subcategory ?? '(none)'}`,
    `  Tags:        ${draft.tags.length > 0 ? draft.tags.join(', ') : '(none)'}`,
    '',
    'MEDIA',
    `  Hero:        ${
      draft.heroImageStatus === 'ready'
        ? `✅ ${draft.heroImage}`
        : draft.heroImageStatus === 'needs-generation'
        ? '⚠️  NEEDS GENERATION — article is draft until image is ready'
        : '✅ Fallback approved'
    }`,
    `  Hero rights: ${draft.heroImageRightsStatus ?? '(not set)'}`,
    `  Hero source: ${draft.heroImageSource ?? '(not set)'}`,
    '',
    'PRODUCTS',
    ...draft.products.map((p) => {
      const imgStatus =
        p.imageSource === 'none'
          ? '— no image (imageless card)'
          : p.imageSource === 'amazon-api'
          ? '⚠️  Amazon API inactive — imageless card'
          : p.imageRightsStatus === 'restricted'
          ? '❌ RESTRICTED — cannot publish'
          : p.imageRightsStatus === 'needs-review'
          ? '⚠️  needs-review'
          : `✅ ${p.imageSource}`;
      return `  ${p.position}. ${p.name} — image: ${imgStatus}`;
    }),
    '',
    'VALIDATION',
    `  Schema:      ${validationPassed ? '✅' : '❌ FAILED'}`,
    `  Build:       ${buildPassed ? '✅' : '❌ FAILED'}`,
    ...(buildWarnings.length > 0
      ? ['', 'WARNINGS', ...buildWarnings.map((w) => `  ⚠️  ${w}`)]
      : []),
    '',
    'STATUS',
    '  DRAFT — draft: true  (will NOT auto-publish)',
    `  File: src/content/articles/${draft.slug}.mdx`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'Say "Publish ' + draft.slug + '" when you are ready to publish.',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ];

  return lines.join('\n');
}
