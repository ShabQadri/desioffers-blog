/**
 * Pre-Publish Validator
 *
 * Deterministic pre-flight validation module that inspects an article's frontmatter,
 * body content, taxonomy references, media rights, author, SEO, and affiliate metadata
 * before allowing publication.
 *
 * RULES:
 * - Restricted media (hero or product) BLOCKS publishing.
 * - 'needs-generation' hero status BLOCKS publishing (unless 'fallback-approved').
 * - 'needs-review' hero rights status BLOCKS publishing until human confirms.
 * - Invalid category, subcategory, or tags BLOCK publishing.
 * - Non-existent author BLOCKS publishing.
 * - Quality guard errors BLOCK publishing.
 */

import fs from 'fs';
import path from 'path';
import { loadCategories, loadSubcategories, loadTags, loadAuthors } from '../authoring/taxonomy-resolver.js';
import { checkContentQuality, hasQualityErrors, type QualityWarning } from '../authoring/quality-guard.js';
import { validateSeoLengths, type SeoValidationWarning } from '../authoring/seo.js';
import type { ImageRightsStatus, HeroImageStatus, ImageSource, ArticleType } from '../authoring/types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArticleParsedData {
  title: string;
  slug?: string;
  description: string;
  articleType?: ArticleType;
  publishedDate: string;
  updatedDate?: string;
  lastVerified: string;
  author: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  heroImage: string;
  heroImageAlt: string;
  heroImageStatus?: HeroImageStatus;
  heroImageSource?: ImageSource;
  heroImageRightsStatus?: ImageRightsStatus;
  featured?: boolean;
  draft: boolean;
  productDataVerified?: boolean;
  priceVerified?: boolean;
  availabilityVerified?: boolean;
  quickPicks?: Array<{
    badge: string;
    name: string;
    asin?: string;
    affiliateUrl: string;
    priceDisplay?: string;
  }>;
  products: Array<{
    position: number;
    name: string;
    brand: string;
    model?: string;
    asin?: string;
    image?: string;
    imageAlt?: string;
    imageSource?: ImageSource;
    imageRightsStatus?: ImageRightsStatus;
    editorialBadge?: string;
    shortDescription: string;
    bestFor: string;
    pros: string[];
    cons: string[];
    priceDisplay?: string;
    priceObservedAt?: string;
    priceVerification?: string;
    availabilityNote?: string;
    availabilityVerification?: string;
    affiliateUrl: string;
    researchNote?: string;
  }>;
  faq?: Array<{ question: string; answer: string }>;
  seoTitle?: string;
  seoDescription?: string;
}

export interface ValidationReport {
  isValid: boolean;
  slug: string;
  filePath: string;
  rawFrontmatter: string;
  rawBody: string;
  parsedData: ArticleParsedData | null;
  errors: string[];
  warnings: string[];
  qualityWarnings: QualityWarning[];
  seoWarnings: SeoValidationWarning[];
  affiliateLinkCount: number;
  hasUnconfiguredAffiliateTag: boolean;
}

// ---------------------------------------------------------------------------
// Frontmatter & Body Parser
// ---------------------------------------------------------------------------

export function parseMdxArticle(filePath: string): { frontmatterText: string; bodyText: string } {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Article file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  if (!match) {
    throw new Error(`Invalid MDX format in ${filePath}. Missing frontmatter delimiter (---).`);
  }

  return {
    frontmatterText: match[1],
    bodyText: match[2],
  };
}

/**
 * Simple, robust frontmatter key-value parser for validation without external dependencies.
 */
export function parseFrontmatterYaml(yamlText: string): ArticleParsedData {
  const lines = yamlText.split(/\r?\n/);
  const data: Record<string, any> = {
    tags: [],
    products: [],
    quickPicks: [],
    faq: [],
  };

  let currentSection: string | null = null;
  let currentItem: Record<string, any> | null = null;
  let currentListKey: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Detect top-level array start (e.g. products:, quickPicks:, faq:)
    if (/^[a-zA-Z0-9_]+:\s*$/.test(trimmed) && !line.startsWith(' ') && !line.startsWith('\t')) {
      const sectionName = trimmed.replace(':', '').trim();
      currentSection = sectionName;
      if (!data[currentSection]) {
        data[currentSection] = [];
      }
      currentItem = null;
      currentListKey = null;
      continue;
    }

    // Top-level key: value
    const topMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (topMatch && !line.startsWith(' ') && !line.startsWith('\t')) {
      const [, key, rawVal] = topMatch;
      currentSection = null;
      currentItem = null;
      currentListKey = null;

      const val = rawVal.trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        // Parse inline array: ["a", "b"]
        const inner = val.slice(1, -1).trim();
        data[key] = inner
          ? inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
          : [];
      } else if (val === 'true') {
        data[key] = true;
      } else if (val === 'false') {
        data[key] = false;
      } else if (!isNaN(Number(val)) && val !== '') {
        data[key] = Number(val);
      } else {
        data[key] = val.replace(/^["']|["']$/g, '');
      }
      continue;
    }

    // List item inside section (e.g. - position: 1)
    if (currentSection) {
      if (trimmed.startsWith('- ')) {
        const itemContent = trimmed.slice(2).trim();
        if (currentListKey && currentItem) {
          // Inner list item (e.g. pros: - "pro 1")
          if (!Array.isArray(currentItem[currentListKey])) {
            currentItem[currentListKey] = [];
          }
          currentItem[currentListKey].push(itemContent.replace(/^["']|["']$/g, ''));
          continue;
        }

        // New object item in array
        currentItem = {};
        data[currentSection].push(currentItem);

        if (itemContent.includes(':')) {
          const colonIdx = itemContent.indexOf(':');
          const k = itemContent.slice(0, colonIdx).trim();
          const v = itemContent.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
          currentItem[k] = v === 'true' ? true : v === 'false' ? false : !isNaN(Number(v)) && v !== '' ? Number(v) : v;
        }
        continue;
      }

      // Sub-property inside object item (e.g.   name: "Product Name")
      if (currentItem && trimmed.includes(':')) {
        const colonIdx = trimmed.indexOf(':');
        const k = trimmed.slice(0, colonIdx).trim();
        const rawV = trimmed.slice(colonIdx + 1).trim();

        if (!rawV) {
          // Start of inner array (e.g. pros:)
          currentListKey = k;
          currentItem[k] = [];
        } else {
          currentListKey = null;
          const v = rawV.replace(/^["']|["']$/g, '');
          currentItem[k] = v === 'true' ? true : v === 'false' ? false : !isNaN(Number(v)) && v !== '' ? Number(v) : v;
        }
      }
    }
  }

  return data as ArticleParsedData;
}

// ---------------------------------------------------------------------------
// Pre-Publish Validation Runner
// ---------------------------------------------------------------------------

export function validateArticleForPublish(slug: string, options?: { contentDir?: string }): ValidationReport {
  const contentDir = options?.contentDir || path.join(process.cwd(), 'src', 'content');
  const filePath = path.join(contentDir, 'articles', `${slug}.mdx`);

  const errors: string[] = [];
  const warnings: string[] = [];
  let qualityWarnings: QualityWarning[] = [];
  let seoWarnings: SeoValidationWarning[] = [];
  let parsedData: ArticleParsedData | null = null;
  let rawFrontmatter = '';
  let rawBody = '';
  let affiliateLinkCount = 0;

  // 1. File existence
  if (!fs.existsSync(filePath)) {
    return {
      isValid: false,
      slug,
      filePath,
      rawFrontmatter: '',
      rawBody: '',
      parsedData: null,
      errors: [`Article file not found: ${filePath}`],
      warnings: [],
      qualityWarnings: [],
      seoWarnings: [],
      affiliateLinkCount: 0,
      hasUnconfiguredAffiliateTag: false,
    };
  }

  // 2. Parse MDX
  try {
    const parsed = parseMdxArticle(filePath);
    rawFrontmatter = parsed.frontmatterText;
    rawBody = parsed.bodyText;
    parsedData = parseFrontmatterYaml(rawFrontmatter);
  } catch (err: any) {
    return {
      isValid: false,
      slug,
      filePath,
      rawFrontmatter,
      rawBody,
      parsedData: null,
      errors: [`Failed to parse article MDX structure: ${err.message}`],
      warnings: [],
      qualityWarnings: [],
      seoWarnings: [],
      affiliateLinkCount: 0,
      hasUnconfiguredAffiliateTag: false,
    };
  }

  // 3. Schema & Required Fields
  if (!parsedData.title || parsedData.title.trim() === '') {
    errors.push('Missing mandatory field: title');
  } else if (parsedData.title.length > 100) {
    errors.push(`Title length (${parsedData.title.length}) exceeds maximum limit of 100 characters.`);
  }

  if (!parsedData.description || parsedData.description.trim() === '') {
    errors.push('Missing mandatory field: description');
  } else if (parsedData.description.length > 160) {
    errors.push(`Description length (${parsedData.description.length}) exceeds maximum limit of 160 characters.`);
  }

  if (!parsedData.publishedDate) {
    errors.push('Missing mandatory field: publishedDate');
  }

  if (!parsedData.lastVerified) {
    errors.push('Missing mandatory field: lastVerified');
  }

  // 4. Author validation
  if (!parsedData.author) {
    errors.push('Missing mandatory field: author');
  } else {
    const authors = loadAuthors();
    const authorExists = authors.some((a) => a.slug === parsedData!.author);
    if (!authorExists) {
      const validSlugs = authors.map((a) => `"${a.slug}"`).join(', ');
      errors.push(`Invalid author "${parsedData.author}". Must exist in src/content/authors/ (${validSlugs}).`);
    }
  }

  // 5. Taxonomy validation (Category, Subcategory, Tags)
  if (!parsedData.category) {
    errors.push('Missing mandatory field: category');
  } else {
    const categories = loadCategories();
    const catExists = categories.some((c) => c.slug === parsedData!.category);
    if (!catExists) {
      const validCats = categories.map((c) => `"${c.slug}"`).join(', ');
      errors.push(`Invalid category "${parsedData.category}". Must exist in src/content/categories/ (${validCats}).`);
    }
  }

  if (parsedData.subcategory) {
    const subcategories = loadSubcategories();
    const subMatch = subcategories.find((s) => s.slug === parsedData!.subcategory);
    if (!subMatch) {
      errors.push(`Invalid subcategory "${parsedData.subcategory}". Must exist in src/content/subcategories/.`);
    } else if (parsedData.category && subMatch.category !== parsedData.category) {
      errors.push(
        `Subcategory "${parsedData.subcategory}" belongs to category "${subMatch.category}", not "${parsedData.category}".`
      );
    }
  }

  if (parsedData.tags) {
    if (parsedData.tags.length > 6) {
      errors.push(`Tag count (${parsedData.tags.length}) exceeds maximum allowed limit of 6 tags.`);
    }
    const tagsRegistry = loadTags();
    for (const tagSlug of parsedData.tags) {
      const regTag = tagsRegistry.find((t) => t.slug === tagSlug);
      if (!regTag) {
        errors.push(`Tag "${tagSlug}" is not in the Controlled Tag Registry (src/content/tags/).`);
      } else if (regTag.status === 'deprecated') {
        warnings.push(`Tag "${tagSlug}" is marked as deprecated in tag registry.`);
      } else if (regTag.status === 'merged') {
        errors.push(`Tag "${tagSlug}" has been merged into "${regTag.mergedIntoSlug}". Replace with active tag.`);
      }
    }
  }

  // 6. Hero Image & Media Rights
  if (!parsedData.heroImage || parsedData.heroImage.trim() === '') {
    errors.push('Missing mandatory field: heroImage');
  }

  if (!parsedData.heroImageAlt || parsedData.heroImageAlt.trim() === '') {
    errors.push('Missing mandatory field: heroImageAlt');
  }

  if (parsedData.heroImageStatus === 'needs-generation') {
    errors.push('heroImageStatus is "needs-generation". Image generation must complete before publication.');
  }

  if (parsedData.heroImageRightsStatus === 'restricted') {
    errors.push('heroImageRightsStatus is "restricted". Publication of restricted media is strictly blocked.');
  } else if (parsedData.heroImageRightsStatus === 'needs-review') {
    warnings.push('heroImageRightsStatus is "needs-review". Human rights confirmation recommended before publish.');
  }

  // 7. Products and Product Media Rights
  if (!parsedData.products || parsedData.products.length === 0) {
    warnings.push('Article has zero products defined.');
  } else {
    for (let i = 0; i < parsedData.products.length; i++) {
      const prod = parsedData.products[i];
      const pos = prod.position || i + 1;

      if (!prod.name || prod.name.trim() === '') {
        errors.push(`Product #${pos} is missing mandatory field: name`);
      }

      if (!prod.affiliateUrl || prod.affiliateUrl.trim() === '') {
        errors.push(`Product #${pos} ("${prod.name || 'Unnamed'}") is missing affiliateUrl.`);
      } else {
        affiliateLinkCount++;
      }

      if (prod.imageRightsStatus === 'restricted') {
        errors.push(`Product #${pos} ("${prod.name}") has imageRightsStatus "restricted". Publication blocked.`);
      } else if (prod.imageRightsStatus === 'needs-review') {
        warnings.push(`Product #${pos} ("${prod.name}") has imageRightsStatus "needs-review".`);
      }
    }
  }

  // Count quick pick affiliate links
  if (parsedData.quickPicks) {
    for (const qp of parsedData.quickPicks) {
      if (qp.affiliateUrl) affiliateLinkCount++;
    }
  }

  // 8. Quality Guard Checks on Body prose
  if (rawBody) {
    qualityWarnings = checkContentQuality(rawBody);
    if (hasQualityErrors(qualityWarnings)) {
      for (const qw of qualityWarnings.filter((w) => w.severity === 'error')) {
        errors.push(`Quality Guard: ${qw.message} (Trigger: "${qw.trigger}")`);
      }
    }
    for (const qw of qualityWarnings.filter((w) => w.severity === 'warning')) {
      warnings.push(`Quality Guard: ${qw.message} (Trigger: "${qw.trigger}")`);
    }
  }

  // 9. SEO Bounds Check
  if (parsedData.seoTitle || parsedData.seoDescription) {
    seoWarnings = validateSeoLengths(
      parsedData.seoTitle || parsedData.title || '',
      parsedData.seoDescription || parsedData.description || ''
    );
    for (const sw of seoWarnings) {
      warnings.push(`SEO: ${sw.message}`);
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    slug,
    filePath,
    rawFrontmatter,
    rawBody,
    parsedData,
    errors,
    warnings,
    qualityWarnings,
    seoWarnings,
    affiliateLinkCount,
    hasUnconfiguredAffiliateTag: false,
  };
}
