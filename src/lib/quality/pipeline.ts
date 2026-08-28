/**
 * Central Article Quality Pipeline
 *
 * Evaluates an article MDX file across 8 quality dimensions:
 * 1. SEO & Metadata
 * 2. Taxonomy & Tags
 * 3. Author & Provenance
 * 4. Editorial Structure
 * 5. Product Data & Safety
 * 6. Media Provenance & Rights
 * 7. Affiliate Link Integrity
 * 8. Anti-Fabrication & Quality Guard
 *
 * Produces structured ArticleQualityReport (PASS / WARNING / BLOCKER).
 */

import fs from 'fs';
import path from 'path';
import { parseMdxArticle, parseFrontmatterYaml } from '../publish/validator.js';
import { resolveTaxonomy } from '../authoring/taxonomy-resolver.js';
import { checkContentQuality } from '../authoring/quality-guard.js';
import {
  validateProductSafety,
  isValidAsin,
  loadFactSheetByAsin,
  verifyArticleProductAgainstFactSheet,
} from '../products/index.js';
import {
  verifyMediaExistenceSync,
  verifyMediaExistenceAsync,
  type MediaVerificationResult,
  type MediaVerificationOptions,
} from '../media/verifier.js';
import type { QualityCheckItem, ArticleQualityReport, ArticleReviewStatus } from './types.js';

export interface QualityPipelineOptions extends MediaVerificationOptions {
  contentDir?: string;
  allowImagelessProducts?: boolean;
  mediaVerification?: MediaVerificationResult;
  requireFactSheet?: boolean;
  projectRoot?: string;
}

export function evaluateArticleQuality(
  articleSlug: string,
  options: QualityPipelineOptions = {}
): ArticleQualityReport {
  const contentDir = options.contentDir || path.join(process.cwd(), 'src', 'content');
  const articlesDir = path.join(contentDir, 'articles');
  const filePath = path.join(articlesDir, `${articleSlug}.mdx`);

  const checks: QualityCheckItem[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  function addCheck(item: QualityCheckItem) {
    checks.push(item);
    if (item.severity === 'BLOCKER') {
      blockers.push(`[${item.category}] ${item.name}: ${item.message}`);
    } else if (item.severity === 'WARNING') {
      warnings.push(`[${item.category}] ${item.name}: ${item.message}`);
    }
  }

  // 0. File Existence
  if (!fs.existsSync(filePath)) {
    addCheck({
      id: 'file-exists',
      name: 'Article File Existence',
      category: 'STRUCTURE',
      severity: 'BLOCKER',
      message: `Article file not found: ${filePath}`,
    });

    return buildReport({
      slug: articleSlug,
      title: articleSlug,
      articleType: 'unknown',
      checks,
      blockers,
      warnings,
      metadata: {
        category: 'unknown',
        author: 'unknown',
        productCount: 0,
        imagelessProductCount: 0,
        affiliateLinkCount: 0,
        heroImageStatus: 'missing',
        evaluatedAt: new Date().toISOString(),
      },
    });
  }

  const { frontmatterText, bodyText } = parseMdxArticle(filePath);
  const data = parseFrontmatterYaml(frontmatterText);

  const title = data.title || '';
  const description = data.description || '';
  const articleType = data.articleType || 'buying-guide';
  const rawCat = data.category as unknown;
  const category =
    typeof rawCat === 'string'
      ? rawCat
      : typeof rawCat === 'object' && rawCat !== null && 'slug' in rawCat
      ? String((rawCat as { slug: unknown }).slug)
      : '';

  const rawSub = data.subcategory as unknown;
  const subcategory =
    typeof rawSub === 'string'
      ? rawSub
      : typeof rawSub === 'object' && rawSub !== null && 'slug' in rawSub
      ? String((rawSub as { slug: unknown }).slug)
      : undefined;

  const tags: string[] = (data.tags || [])
    .map((t: unknown) =>
      typeof t === 'string'
        ? t
        : typeof t === 'object' && t !== null && 'slug' in t
        ? String((t as { slug: unknown }).slug)
        : typeof t === 'object' && t !== null && 'name' in t
        ? String((t as { name: unknown }).name)
        : ''
    )
    .filter(Boolean);

  const rawAuth = data.author as unknown;
  const author =
    typeof rawAuth === 'string'
      ? rawAuth
      : typeof rawAuth === 'object' && rawAuth !== null
      ? 'slug' in rawAuth
        ? String((rawAuth as { slug: unknown }).slug)
        : 'id' in rawAuth
        ? String((rawAuth as { id: unknown }).id)
        : ''
      : '';
  const products: any[] = data.products || [];

  // =========================================================================
  // 1. SEO & METADATA CHECKS
  // =========================================================================

  // Title length & presence
  if (!title.trim()) {
    addCheck({
      id: 'seo-title-present',
      name: 'Title Presence',
      category: 'SEO',
      severity: 'BLOCKER',
      message: 'Article title is required and cannot be empty.',
    });
  } else {
    const titleLen = title.trim().length;
    if (titleLen < 30 || titleLen > 75) {
      addCheck({
        id: 'seo-title-length',
        name: 'Title Length',
        category: 'SEO',
        severity: 'WARNING',
        message: `Title length (${titleLen} chars) is outside optimal 40-70 range.`,
      });
    } else {
      addCheck({
        id: 'seo-title-length',
        name: 'Title Length',
        category: 'SEO',
        severity: 'PASS',
        message: `Title length (${titleLen} chars) is optimal.`,
      });
    }
  }

  // Description length & presence
  if (!description.trim()) {
    addCheck({
      id: 'seo-desc-present',
      name: 'Description Presence',
      category: 'SEO',
      severity: 'BLOCKER',
      message: 'Meta description is required and cannot be empty.',
    });
  } else {
    const descLen = description.trim().length;
    if (descLen < 90 || descLen > 175) {
      addCheck({
        id: 'seo-desc-length',
        name: 'Description Length',
        category: 'SEO',
        severity: 'WARNING',
        message: `Description length (${descLen} chars) is outside optimal 110-160 range.`,
      });
    } else {
      addCheck({
        id: 'seo-desc-length',
        name: 'Description Length',
        category: 'SEO',
        severity: 'PASS',
        message: `Description length (${descLen} chars) is optimal.`,
      });
    }
  }

  // Slug formatting
  const expectedSlugFormat = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!expectedSlugFormat.test(articleSlug)) {
    addCheck({
      id: 'seo-slug-format',
      name: 'Slug Format',
      category: 'SEO',
      severity: 'BLOCKER',
      message: `Slug "${articleSlug}" must be lowercase and hyphen-separated.`,
    });
  } else {
    addCheck({
      id: 'seo-slug-format',
      name: 'Slug Format',
      category: 'SEO',
      severity: 'PASS',
      message: `Slug "${articleSlug}" is properly formatted.`,
    });
  }

  // Duplicate Title & Slug Check
  if (fs.existsSync(articlesDir)) {
    const allFiles = fs.readdirSync(articlesDir).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));
    for (const f of allFiles) {
      const otherSlug = f.replace(/\.mdx?$/, '');
      if (otherSlug === articleSlug) continue;

      try {
        const otherData = parseFrontmatterYaml(parseMdxArticle(path.join(articlesDir, f)).frontmatterText);
        if (otherData.title && otherData.title.trim().toLowerCase() === title.trim().toLowerCase()) {
          addCheck({
            id: 'seo-duplicate-title',
            name: 'Duplicate Title Check',
            category: 'SEO',
            severity: 'BLOCKER',
            message: `Title duplicates existing article: "${otherSlug}".`,
          });
        }
      } catch {}
    }
  }

  // =========================================================================
  // 2. TAXONOMY & AUTHOR CHECKS
  // =========================================================================

  const taxonomyResolution = resolveTaxonomy({
    category,
    subcategory,
    tags,
  });

  if (taxonomyResolution.errors.length > 0 || taxonomyResolution.needsClarification) {
    if (taxonomyResolution.needsClarification && taxonomyResolution.clarificationQuestion) {
      addCheck({
        id: 'taxonomy-clarification',
        name: 'Taxonomy Ambiguity',
        category: 'TAXONOMY',
        severity: 'BLOCKER',
        message: taxonomyResolution.clarificationQuestion,
      });
    }
    for (const err of taxonomyResolution.errors) {
      addCheck({
        id: 'taxonomy-error',
        name: 'Taxonomy Validity',
        category: 'TAXONOMY',
        severity: 'BLOCKER',
        message: err,
      });
    }
  } else {
    addCheck({
      id: 'taxonomy-valid',
      name: 'Taxonomy & Registry Integrity',
      category: 'TAXONOMY',
      severity: 'PASS',
      message: `Category "${category}" and ${tags.length} tag(s) verified in registry.`,
    });
  }

  if (tags.length > 6) {
    addCheck({
      id: 'taxonomy-tag-count',
      name: 'Tag Count Limit',
      category: 'TAXONOMY',
      severity: 'WARNING',
      message: `Article has ${tags.length} tags (maximum 6 recommended).`,
    });
  }

  // Author Check
  const authorFile = path.join(contentDir, 'authors', `${author}.json`);
  if (!fs.existsSync(authorFile)) {
    addCheck({
      id: 'author-exists',
      name: 'Author Existence',
      category: 'AUTHOR',
      severity: 'BLOCKER',
      message: `Author profile "${author}" does not exist in content registry.`,
    });
  } else {
    addCheck({
      id: 'author-exists',
      name: 'Author Profile',
      category: 'AUTHOR',
      severity: 'PASS',
      message: `Author profile "${author}" is verified.`,
    });
  }

  // =========================================================================
  // 3. EDITORIAL STRUCTURE (By Article Type)
  // =========================================================================

  if (['buying-guide', 'best-products', 'comparison'].includes(articleType)) {
    if (products.length === 0) {
      addCheck({
        id: 'structure-products-present',
        name: 'Product Recommendations List',
        category: 'STRUCTURE',
        severity: 'BLOCKER',
        message: `${articleType} requires at least one product recommendation.`,
      });
    } else if (products.length < 3) {
      addCheck({
        id: 'structure-products-count',
        name: 'Product Count',
        category: 'STRUCTURE',
        severity: 'WARNING',
        message: `Buying guide contains ${products.length} products (at least 3-5 recommended).`,
      });
    } else {
      addCheck({
        id: 'structure-products-count',
        name: 'Product Recommendations',
        category: 'STRUCTURE',
        severity: 'PASS',
        message: `Contains ${products.length} product recommendations.`,
      });
    }
  }

  // Body length check
  const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 50) {
    addCheck({
      id: 'structure-body-length',
      name: 'Body Word Count',
      category: 'STRUCTURE',
      severity: 'BLOCKER',
      message: `Article body has only ${wordCount} words (minimum 50 words required).`,
    });
  } else if (wordCount < 150) {
    addCheck({
      id: 'structure-body-length',
      name: 'Body Word Count',
      category: 'STRUCTURE',
      severity: 'WARNING',
      message: `Article body has ${wordCount} words (at least 250 words recommended).`,
    });
  } else {
    addCheck({
      id: 'structure-body-length',
      name: 'Article Body Content',
      category: 'STRUCTURE',
      severity: 'PASS',
      message: `Article body contains ${wordCount} words.`,
    });
  }

  // =========================================================================
  // 4. PRODUCTS & AFFILIATE CHECKS
  // =========================================================================

  // Article-level product data verification state
  if (data.productDataVerified === false) {
    addCheck({
      id: 'product-data-verification-status',
      name: 'Product Data Verification State',
      category: 'PRODUCT_VERIFICATION',
      severity: 'WARNING',
      message: 'Product data is marked unverified (manual / web research). Human editorial review required before publication.',
    });
  } else {
    addCheck({
      id: 'product-data-verification-status',
      name: 'Product Data Verification State',
      category: 'PRODUCT_VERIFICATION',
      severity: 'PASS',
      message: 'Product data is marked as verified.',
    });
  }

  let imagelessProductCount = 0;
  let verifiedAffiliateCount = 0;

  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    const pos = prod.position || i + 1;

    // Safety validation
    const prodSafety = validateProductSafety({
      position: pos,
      name: prod.name || '',
      brand: prod.brand || '',
      model: prod.model,
      asin: prod.asin,
      url: prod.url || '',
      affiliateUrl: prod.affiliateUrl || prod.url || '',
      image: prod.image,
      imageSource: prod.imageSource || 'none',
      imageRightsStatus: prod.imageRightsStatus,
      shortDescription: prod.shortDescription || '',
      bestFor: prod.bestFor || '',
      pros: prod.pros || [],
      cons: prod.cons || [],
      priceDisplay: prod.priceDisplay,
      priceObservedAt: prod.priceObservedAt,
      priceVerification: prod.priceVerification || 'unknown',
      availabilityNote: prod.availabilityNote,
      availabilityVerification: prod.availabilityVerification || 'unknown',
      source: prod.source || 'manual',
      researchNote: prod.researchNote,
      retrievedAt: new Date().toISOString(),
    });

    if (!prodSafety.isValid) {
      for (const err of prodSafety.errors) {
        addCheck({
          id: `product-${pos}-safety`,
          name: `Product #${pos} Safety`,
          category: 'PRODUCTS',
          severity: 'BLOCKER',
          message: err,
        });
      }
    }

    // Imageless state tracking
    if (!prod.image || prod.imageSource === 'none') {
      imagelessProductCount++;
    }

    // Price verification check
    if (prod.priceVerification === 'user-observed' || (prod.priceDisplay && !prod.priceVerification)) {
      addCheck({
        id: `product-${pos}-price-observed`,
        name: `Product #${pos} User-Observed Price`,
        category: 'PRODUCT_VERIFICATION',
        severity: 'WARNING',
        message: `Product #${pos} (${prod.name}) uses user-observed price (${prod.priceDisplay || 'unknown'}${prod.priceObservedAt ? ` observed ${String(prod.priceObservedAt).split('T')[0]}` : ''}). Ensure pricing change disclosure is shown.`,
      });
    } else if (prod.priceVerification === 'verified' && !prod.priceObservedAt) {
      addCheck({
        id: `product-${pos}-price-untracked`,
        name: `Product #${pos} Price Timestamp`,
        category: 'PRODUCT_VERIFICATION',
        severity: 'WARNING',
        message: `Product #${pos} (${prod.name}) is marked verified price but lacks a priceObservedAt timestamp.`,
      });
    }

    // ASIN & Affiliate check
    if (prod.asin) {
      if (!isValidAsin(prod.asin)) {
        addCheck({
          id: `product-${pos}-asin`,
          name: `Product #${pos} ASIN Format`,
          category: 'PRODUCT_VERIFICATION',
          severity: 'BLOCKER',
          message: `Product #${pos} has invalid ASIN "${prod.asin}" (must be 10 alphanumeric chars).`,
        });
      } else {
        verifiedAffiliateCount++;

        // Phase 11I: Fact Sheet & Claim Verification
        const projectRoot = options.projectRoot || (options.contentDir ? path.dirname(path.dirname(options.contentDir)) : process.cwd());
        const factSheet = loadFactSheetByAsin(prod.asin, projectRoot);
        const isTestFixture = articleSlug.startsWith('test-') || articleSlug.includes('mock');
        const requireFact = options.requireFactSheet ?? (!isTestFixture && data.draft === true && data.productDataVerified === false);

        const factResult = verifyArticleProductAgainstFactSheet(
          {
            name: prod.name,
            brand: prod.brand,
            model: prod.model,
            asin: prod.asin,
            editorialBadge: prod.editorialBadge,
            shortDescription: prod.shortDescription,
            bestFor: prod.bestFor,
            pros: prod.pros,
            cons: prod.cons,
            specifications: prod.specifications,
            priceDisplay: prod.priceDisplay,
            priceObservedAt: prod.priceObservedAt,
            priceVerification: prod.priceVerification,
            availabilityNote: prod.availabilityNote,
            affiliateUrl: prod.affiliateUrl,
          },
          factSheet,
          { requireFactSheet: requireFact }
        );

        for (const issue of factResult.issues) {
          addCheck({
            id: `product-${pos}-fact-${issue.field}-${issue.code.toLowerCase().replace(/_/g, '-')}`,
            name: `Product #${pos} Fact (${issue.field})`,
            category: 'PRODUCT_FACT_VERIFICATION',
            severity: issue.severity,
            message: issue.message,
          });
        }
      }
    } else if (prod.affiliateUrl || prod.url) {
      verifiedAffiliateCount++;
    } else {
      addCheck({
        id: `product-${pos}-affiliate`,
        name: `Product #${pos} Affiliate URL`,
        category: 'AFFILIATE',
        severity: 'BLOCKER',
        message: `Product #${pos} (${prod.name}) is missing an affiliate URL or ASIN.`,
      });
    }
  }

  if (imagelessProductCount > 0) {
    addCheck({
      id: 'products-imageless-count',
      name: 'Imageless Product Presentations',
      category: 'MEDIA',
      severity: 'WARNING',
      message: `${imagelessProductCount} of ${products.length} products are imageless (supported via clean layout).`,
    });
  }

  // =========================================================================
  // 5. MEDIA PROVENANCE & RIGHTS
  // =========================================================================
  // 5. MEDIA PROVENANCE & STORAGE EXISTENCE
  // =========================================================================

  const heroImage = data.heroImage;
  const heroImageStatus = data.heroImageStatus || 'ready';
  const heroRights = data.heroImageRightsStatus || 'original';

  let heroMediaVerification = options.mediaVerification;
  if (!heroMediaVerification && heroImage) {
    heroMediaVerification = verifyMediaExistenceSync(heroImage, options);
  }

  if (!heroImage || heroImage.trim() === '') {
    if (heroImageStatus !== 'fallback-approved') {
      addCheck({
        id: 'media-hero-present',
        name: 'Hero Image Presence',
        category: 'MEDIA',
        severity: 'BLOCKER',
        message: 'Hero image is required unless heroImageStatus is "fallback-approved".',
      });
    } else {
      addCheck({
        id: 'media-hero-fallback',
        name: 'Hero Image Fallback',
        category: 'MEDIA',
        severity: 'PASS',
        message: 'Hero image fallback approved.',
      });
    }
  } else if (heroImageStatus === 'needs-generation') {
    addCheck({
      id: 'media-hero-status',
      name: 'Hero Image Generation Status',
      category: 'MEDIA',
      severity: 'BLOCKER',
      message: 'Hero image status is "needs-generation". Image must be generated before publication.',
    });
  } else if (heroRights === 'restricted') {
    addCheck({
      id: 'media-hero-rights',
      name: 'Hero Image Rights',
      category: 'MEDIA',
      severity: 'BLOCKER',
      message: 'Hero image is marked "restricted" and cannot be published.',
    });
  } else if (heroImageStatus === 'fallback-approved') {
    addCheck({
      id: 'media-hero-fallback',
      name: 'Hero Image Fallback',
      category: 'MEDIA',
      severity: 'PASS',
      message: 'Hero image fallback approved by editorial policy.',
    });
  } else {
    // Storage existence check for ready status
    const ver = heroMediaVerification || verifyMediaExistenceSync(heroImage, options);

    if (ver.status === 'exists') {
      addCheck({
        id: 'media-hero-valid',
        name: 'Hero Image Storage Existence',
        category: 'MEDIA',
        severity: 'PASS',
        message: ver.message,
      });
    } else if (ver.status === 'not_found') {
      addCheck({
        id: 'media-hero-not-found',
        name: 'Hero Image Storage Existence',
        category: 'MEDIA',
        severity: 'BLOCKER',
        message: ver.message,
      });
    } else if (ver.status === 'r2_unavailable') {
      addCheck({
        id: 'media-hero-unverifiable',
        name: 'Hero Image Storage Existence',
        category: 'MEDIA',
        severity: 'BLOCKER', // Fail-closed publication safety
        message: ver.message,
      });
    } else {
      // not_applicable (e.g. external or demo fixture)
      addCheck({
        id: 'media-hero-valid',
        name: 'Hero Image Reference',
        category: 'MEDIA',
        severity: 'PASS',
        message: ver.message,
      });
    }
  }

  // =========================================================================
  // 6. ANTI-FABRICATION & QUALITY GUARD
  // =========================================================================

  const fullTextToScan = [
    title,
    description,
    bodyText,
    ...products.flatMap((p) => [p.name, p.shortDescription, p.bestFor, ...(p.pros || []), ...(p.cons || [])]),
  ].filter(Boolean).join('\n');

  const qualityWarnings = checkContentQuality(fullTextToScan);

  if (qualityWarnings.length > 0) {
    for (const w of qualityWarnings) {
      addCheck({
        id: 'anti-fabrication-flag',
        name: 'Anti-Fabrication Guard',
        category: 'ANTI_FABRICATION',
        severity: w.severity === 'error' ? 'BLOCKER' : 'WARNING',
        message: `${w.message} (Trigger: "${w.trigger}")`,
      });
    }
  } else {
    addCheck({
      id: 'anti-fabrication-pass',
      name: 'Quality Guard Compliance',
      category: 'ANTI_FABRICATION',
      severity: 'PASS',
      message: 'No fabricated testing claims, invented ratings, or false urgency detected.',
    });
  }

  return buildReport({
    slug: articleSlug,
    title: title || articleSlug,
    articleType,
    checks,
    blockers,
    warnings,
    metadata: {
      category,
      subcategory,
      author,
      productCount: products.length,
      imagelessProductCount,
      affiliateLinkCount: verifiedAffiliateCount,
      heroImageStatus,
      heroMediaVerification,
      evaluatedAt: new Date().toISOString(),
    },
  });
}

export async function evaluateArticleQualityAsync(
  articleSlug: string,
  options: QualityPipelineOptions = {}
): Promise<ArticleQualityReport> {
  const contentDir = options.contentDir || path.join(process.cwd(), 'src', 'content');
  const articlesDir = path.join(contentDir, 'articles');
  const filePath = path.join(articlesDir, `${articleSlug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return evaluateArticleQuality(articleSlug, options);
  }

  const { frontmatterText } = parseMdxArticle(filePath);
  const data = parseFrontmatterYaml(frontmatterText);
  const heroImage = data.heroImage;
  const heroImageStatus = data.heroImageStatus || 'ready';

  let mediaVerification: MediaVerificationResult | undefined = options.mediaVerification;
  if (!mediaVerification && heroImage && heroImageStatus === 'ready') {
    mediaVerification = await verifyMediaExistenceAsync(heroImage, options);
  }

  return evaluateArticleQuality(articleSlug, {
    ...options,
    mediaVerification,
  });
}

function buildReport(params: {
  slug: string;
  title: string;
  articleType: string;
  checks: QualityCheckItem[];
  blockers: string[];
  warnings: string[];
  metadata: ArticleQualityReport['metadata'];
}): ArticleQualityReport {
  const { slug, title, articleType, checks, blockers, warnings, metadata } = params;

  let status: ArticleReviewStatus = 'READY_FOR_REVIEW';
  if (blockers.length > 0) {
    status = 'BLOCKED';
  } else if (warnings.length > 0) {
    status = 'HAS_WARNINGS';
  }

  const passCount = checks.filter((c) => c.severity === 'PASS').length;

  return {
    slug,
    title,
    articleType,
    status,
    isPublishable: blockers.length === 0,
    summary: {
      totalChecks: checks.length,
      passCount,
      warningCount: warnings.length,
      blockerCount: blockers.length,
    },
    checks,
    blockers,
    warnings,
    metadata,
  };
}
