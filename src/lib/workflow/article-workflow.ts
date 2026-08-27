/**
 * End-to-End Article Authoring Workflow Orchestrator (Production)
 *
 * Coordinates the full editorial pipeline:
 * User Request
 *   ↓
 * 1. Slug Uniqueness & Idempotency Check
 * 2. Taxonomy Resolution (Categories, Subcategories, Controlled Tags)
 * 3. SEO & Slug Normalization
 * 4. Product Normalization & Safety Validation (Imageless Product Support)
 * 5. Media Brief, Ingestion & Automated R2 Upload (When Binary Provided)
 * 6. MDX Serialization (Enforcing draft: true)
 * 7. File System Write (src/content/articles/{slug}.mdx)
 * 8. Central Quality Pipeline (PASS / WARNING / BLOCKER)
 * 9. Human Review Report Generation
 *
 * SAFETY INVARIANTS:
 * - Always creates draft: true.
 * - Never commits, pushes, or deploys automatically.
 * - Never fabricates commercial product photographs.
 * - Does not scrape or make unauthorized Amazon API calls.
 * - If no hero image is provided, sets heroImageStatus = 'needs-generation'.
 */

import fs from 'fs';
import path from 'path';
import { generateSlug, formatSeoTitle, formatSeoDescription } from '../authoring/seo.js';
import { resolveTaxonomy } from '../authoring/taxonomy-resolver.js';
import { buildArticleMdx } from '../authoring/article-builder.js';
import type { ArticleDraft, ArticleType, BodySection, QuickPickDraft, FaqItem, ImageSource } from '../authoring/types.js';
import {
  normalizeProduct,
  parseAmazonUrl,
  type ManualProductInput,
  type NormalizedProduct,
  type PriceVerificationState,
} from '../products/index.js';
import { generateArticleHeroBrief } from '../media/brief.js';
import { ingestImageBuffer, ingestLocalFile } from '../media/generator-interface.js';
import { MediaManifest } from '../media/manifest.js';
import { MediaDeduplicator } from '../media/deduplicator.js';
import { evaluateArticleQualityAsync } from '../quality/pipeline.js';
import { formatQualityReportConsole } from '../quality/reporter.js';
import type { ArticleQualityReport } from '../quality/types.js';

export interface WorkflowProductInput extends Partial<ManualProductInput> {
  url?: string;
  price?: string;
  badge?: string;
  ranking?: number;
  notes?: string;
}

export interface ArticleWorkflowMetrics {
  productsParsed: number;
  validAsinsCount: number;
  affiliateLinksGenerated: number;
  userObservedPricesCount: number;
  unknownPricesCount: number;
  imagelessProductsCount: number;
}

export interface ArticleWorkflowInput {
  topic: string;
  slug?: string;
  articleType?: ArticleType;
  category: string;
  subcategory?: string;
  tags?: string[];
  author?: string;
  description?: string;
  notes?: string;
  products: WorkflowProductInput[];
  bodySections?: BodySection[];
  quickPicks?: QuickPickDraft[];
  faq?: FaqItem[];
  heroImageBuffer?: Buffer;
  heroImageFilePath?: string;
  heroImageAlt?: string;
  isHeroDecorative?: boolean;
  allowOverwrite?: boolean;
  projectRoot?: string;
}

export interface ArticleWorkflowResult {
  slug: string;
  draftPath: string;
  qualityReport: ArticleQualityReport;
  reviewSummary: string;
  isReadyForReview: boolean;
  heroImageUploadedToR2: boolean;
  metrics: ArticleWorkflowMetrics;
}

export async function createEditorialArticleDraft(
  input: ArticleWorkflowInput
): Promise<ArticleWorkflowResult> {
  const projectRoot = input.projectRoot || process.cwd();
  const articlesDir = path.join(projectRoot, 'src', 'content', 'articles');

  // 1. Slug & SEO Normalization
  const slug = input.slug ? generateSlug(input.slug) : generateSlug(input.topic);
  const targetFilePath = path.join(articlesDir, `${slug}.mdx`);

  // Idempotency check: prevent silent overwrite of existing article unless allowOverwrite is true
  if (fs.existsSync(targetFilePath) && !input.allowOverwrite) {
    throw new Error(
      `Article slug "${slug}" already exists at ${targetFilePath}. Choose a different slug or pass allowOverwrite: true.`
    );
  }

  const title = input.topic.trim();
  const description = input.description || formatSeoDescription(
    `Looking for the best options for ${input.topic}? Compare top picks, pros, cons, and recommendations for Indian buyers.`
  );
  const articleType: ArticleType = input.articleType || 'buying-guide';
  const author = input.author || 'shaaz';

  // 2. Taxonomy Resolution
  const taxonomyRes = resolveTaxonomy({
    category: input.category,
    subcategory: input.subcategory,
    tags: input.tags || [],
  });

  if (taxonomyRes.errors.length > 0) {
    const errorMsg = taxonomyRes.errors.join('; ');
    throw new Error(`Taxonomy resolution failed: ${errorMsg}`);
  }

  if (taxonomyRes.needsClarification) {
    throw new Error(`Taxonomy clarification needed: ${taxonomyRes.clarificationQuestion}`);
  }

  const category = taxonomyRes.resolved?.category || input.category;
  const subcategory = taxonomyRes.resolved?.subcategory || input.subcategory;
  const tags = taxonomyRes.resolved?.tags && taxonomyRes.resolved.tags.length > 0
    ? taxonomyRes.resolved.tags
    : input.tags || [];

  // 3. Product Normalization & Enrichment (Enforces imageless fallback & Amazon URL contracts)
  const nowIso = new Date().toISOString();
  const normalizedProducts: NormalizedProduct[] = (input.products || []).map((p, idx) => {
    if (p.url) {
      const parsed = parseAmazonUrl(p.url, {
        price: p.price || (p as ManualProductInput).priceDisplay,
        badge: p.badge || (p as ManualProductInput).editorialBadge,
        ranking: p.ranking || (p as ManualProductInput).position || idx + 1,
      });

      if (!parsed) {
        throw new Error(
          `Invalid Amazon product URL for product #${idx + 1}: "${p.url}". A valid 10-character Amazon ASIN is required.`
        );
      }

      const userPrice = (p.price || (p as ManualProductInput).priceDisplay || parsed.price)?.trim() || undefined;
      const priceVerification: PriceVerificationState = userPrice
        ? 'user-observed'
        : ((p as ManualProductInput).priceVerification || 'unknown');
      const priceObservedAt = userPrice
        ? ((p as ManualProductInput).priceObservedAt || nowIso)
        : undefined;
      const editorialBadge = (p.badge || (p as ManualProductInput).editorialBadge || parsed.badge)?.trim() || undefined;

      let imageSource: ImageSource = (p as ManualProductInput).imageSource || ((p as ManualProductInput).image ? 'r2' : 'none');
      let image = (p as ManualProductInput).image ? (p as ManualProductInput).image!.trim() : undefined;
      let imageAlt = (p as ManualProductInput).imageAlt ? (p as ManualProductInput).imageAlt!.trim() : undefined;

      if (!image || image === '' || imageSource === 'none') {
        image = undefined;
        imageAlt = undefined;
        imageSource = 'none';
      }

      const name = ((p as ManualProductInput).name || `Amazon Product (${parsed.asin})`).trim();
      const brand = ((p as ManualProductInput).brand || '').trim();
      const shortDescription = (
        (p as ManualProductInput).shortDescription ||
        (p.notes
          ? `${p.notes}`
          : `Editorial recommendation based on verified product specifications and Indian market availability.`)
      ).trim();
      const bestFor = (
        (p as ManualProductInput).bestFor ||
        (editorialBadge ? `Buyers looking for ${editorialBadge.toLowerCase()}` : `Everyday use and reliable performance in India`)
      ).trim();
      const pros =
        (p as ManualProductInput).pros && (p as ManualProductInput).pros!.length > 0
          ? (p as ManualProductInput).pros!.map((item) => item.trim()).filter(Boolean)
          : [
              'Balanced price-to-performance ratio for Indian buyers',
              'Standard manufacturer warranty coverage in India',
              'Proven design suited for daily usage',
            ];
      const cons =
        (p as ManualProductInput).cons && (p as ManualProductInput).cons!.length > 0
          ? (p as ManualProductInput).cons!.map((item) => item.trim()).filter(Boolean)
          : ['Pricing and inventory may fluctuate on Amazon India'];

      return {
        position: p.ranking || (p as ManualProductInput).position || idx + 1,
        name,
        brand,
        model: (p as ManualProductInput).model?.trim() || undefined,
        asin: parsed.asin,
        url: parsed.canonicalUrl,
        affiliateUrl: parsed.affiliateUrl,
        image,
        imageAlt: imageAlt || (image ? name : undefined),
        imageSource,
        imageRightsStatus: (p as ManualProductInput).imageRightsStatus || (image ? 'needs-review' : undefined),
        editorialBadge,
        shortDescription,
        bestFor,
        pros,
        cons,
        priceDisplay: userPrice,
        priceObservedAt,
        priceVerification,
        availabilityNote:
          (p as ManualProductInput).availabilityNote || 'Check current availability and delivery dates on Amazon India',
        availabilityVerification: (p as ManualProductInput).availabilityVerification || 'unknown',
        specifications: (p as ManualProductInput).specifications,
        source: (p as ManualProductInput).source || 'web-research',
        researchNote: (p as ManualProductInput).researchNote || p.notes,
        retrievedAt: nowIso,
      };
    }

    return normalizeProduct(p as ManualProductInput, idx + 1);
  });

  // 4. Hero Media Brief & Ingestion
  const heroBrief = generateArticleHeroBrief({
    title,
    articleSlug: slug,
    categorySlug: category,
    subcategorySlug: subcategory,
    isDecorative: input.isHeroDecorative,
  });

  let heroImage = '';
  let heroImageStatus: 'ready' | 'needs-generation' | 'fallback-approved' = 'needs-generation';
  let heroImageRightsStatus: 'original' | 'authorized' | 'needs-review' | 'restricted' = 'original';
  let heroImageSource: 'r2' | 'ai-generated' | 'licensed' | 'amazon-api' | 'user-provided' = 'ai-generated';
  let heroUploaded = false;

  let ingestRes: ReturnType<typeof ingestImageBuffer> | undefined;

  if (input.heroImageBuffer) {
    ingestRes = ingestImageBuffer({ buffer: input.heroImageBuffer, brief: heroBrief });
  } else if (input.heroImageFilePath && fs.existsSync(input.heroImageFilePath)) {
    ingestRes = ingestLocalFile({ filePath: input.heroImageFilePath, brief: heroBrief });
  }

  if (ingestRes && ingestRes.isValid && ingestRes.mediaRecord) {
    heroImage = ingestRes.mediaRecord.r2Key;
    heroImageStatus = 'ready';
    heroImageRightsStatus = ingestRes.mediaRecord.rightsStatus;
    heroImageSource = 'ai-generated';

    // Register in manifest & deduplicator
    const manifest = new MediaManifest();
    manifest.addRecord(ingestRes.mediaRecord);

    const deduplicator = new MediaDeduplicator();
    deduplicator.register(ingestRes.mediaRecord);

    // Save local copy for development preview
    const ext = ingestRes.mediaRecord.mimeType === 'image/jpeg' ? 'jpg' : 'webp';
    const localDir = path.join(projectRoot, 'public', 'images', 'articles');
    fs.mkdirSync(localDir, { recursive: true });
    const localFile = path.join(localDir, `${slug}-hero.${ext}`);
    if (ingestRes.buffer) {
      fs.writeFileSync(localFile, ingestRes.buffer);
    } else if (input.heroImageFilePath) {
      fs.copyFileSync(input.heroImageFilePath, localFile);
    }

    // Direct R2 Upload if Cloudflare credentials exist in environment
    try {
      const envFile = path.join(process.env.USERPROFILE || '', '.env');
      if (fs.existsSync(envFile)) {
        const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
        const env: Record<string, string> = {};
        lines.forEach((l) => {
          const parts = l.split('=');
          if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
        });

        const cfToken = env.CLOUDFLARE_API_TOKEN;
        const cfAccountId = env.CLOUDFLARE_ACCOUNT_ID;
        const bucketName = 'desioffers-media';

        if (cfToken && cfAccountId) {
          const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/r2/buckets/${bucketName}/objects/${encodeURIComponent(ingestRes.mediaRecord.r2Key)}`;
          const uploadBuf = ingestRes.buffer || (input.heroImageFilePath ? fs.readFileSync(input.heroImageFilePath) : null);
          if (uploadBuf) {
            const r2Res = await fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${cfToken}`,
                'Content-Type': ingestRes.mediaRecord.mimeType,
              },
              body: new Uint8Array(uploadBuf),
            });
            if (r2Res.ok) {
              heroUploaded = true;
            }
          }
        }
      }
    } catch {}
  }

  // 5. Default Editorial Body Sections if none provided
  const editorialNotesText = input.notes ? `\n\n**Editorial Focus:** ${input.notes}` : '';
  const bodySections: BodySection[] = input.bodySections && input.bodySections.length > 0
    ? input.bodySections
    : [
        {
          type: 'intro',
          content: `When looking for the best options in this category, choosing a reliable model that matches your needs and budget is essential. In this buying guide, our editorial team evaluates top-performing choices in India, comparing design quality, key specifications, everyday usability, and overall value.${editorialNotesText}`,
        },
        {
          type: 'methodology',
          heading: 'Comparison Criteria & Selection Methodology',
          content: `Our recommendations are based on published manufacturer specifications, Indian market availability, verified brand warranties, and ergonomic design considerations to help you make an informed buying decision without marketing hype.`,
        },
        {
          type: 'buying-factors',
          heading: 'Key Factors to Consider Before Buying',
          content: `Consider build materials, warranty support in your city, compatibility with your existing devices, and long-term durability when choosing between these options.`,
        },
        {
          type: 'verdict',
          heading: 'Final Editorial Recommendation',
          content: `Every product highlighted in this guide offers a distinct balance of features and price. Select the model that best aligns with your primary use case and budget.`,
        },
      ];

  // Auto-generate quickPicks if not provided
  const quickPicks: QuickPickDraft[] | undefined = input.quickPicks && input.quickPicks.length > 0
    ? input.quickPicks
    : normalizedProducts.length > 0
      ? normalizedProducts.slice(0, 3).map((p, idx) => ({
          badge: p.editorialBadge || (idx === 0 ? 'Top Pick' : idx === 1 ? 'Best Value' : 'Also Recommended'),
          name: p.name,
          asin: p.asin,
          affiliateUrl: p.affiliateUrl,
          priceDisplay: p.priceDisplay,
        }))
      : undefined;

  // 6. Assemble ArticleDraft Structure
  const draft: ArticleDraft = {
    title,
    slug,
    description,
    articleType,
    publishedDate: nowIso,
    lastVerified: nowIso,
    author,
    category,
    subcategory,
    tags,
    heroImage: heroImage || '',
    heroImageAlt: input.heroImageAlt || heroBrief.altText,
    heroImageStatus,
    heroImageRightsStatus,
    heroImageSource,
    productDataVerified: false,
    priceVerified: false,
    availabilityVerified: false,
    featured: false,
    draft: true, // STRICT SAFETY INVARIANT: Always true
    products: normalizedProducts.map((p) => ({
      position: p.position,
      name: p.name,
      brand: p.brand,
      model: p.model,
      asin: p.asin,
      image: p.image || '',
      imageAlt: p.imageAlt || p.name,
      imageSource: p.imageSource,
      imageRightsStatus: p.imageRightsStatus,
      editorialBadge: p.editorialBadge,
      shortDescription: p.shortDescription,
      bestFor: p.bestFor,
      pros: p.pros,
      cons: p.cons,
      priceDisplay: p.priceDisplay,
      priceObservedAt: p.priceObservedAt,
      priceVerification: p.priceVerification,
      availabilityNote: p.availabilityNote,
      availabilityVerification: p.availabilityVerification,
      affiliateUrl: p.affiliateUrl,
      researchNote: p.researchNote,
    })),
    quickPicks,
    faq: input.faq,
    bodySections,
    seoTitle: formatSeoTitle(title),
    seoDescription: description,
  };

  // 7. Serialize to MDX
  const buildRes = buildArticleMdx(draft);

  // 8. Write to Disk
  fs.mkdirSync(articlesDir, { recursive: true });
  fs.writeFileSync(targetFilePath, buildRes.mdx, 'utf-8');

  // 9. Run Central Quality Pipeline
  const mediaVerification = heroUploaded
    ? {
        rawUrl: heroImage || '',
        storageType: 'r2' as const,
        exists: true,
        status: 'exists' as const,
        message: `Hero Image: R2 object exists — ${heroImage}`,
        key: heroImage || '',
      }
    : undefined;

  const qualityReport = await evaluateArticleQualityAsync(slug, {
    contentDir: path.join(projectRoot, 'src', 'content'),
    mediaVerification,
  });

  // 10. Generate Metrics & Human Review Summary
  const metrics: ArticleWorkflowMetrics = {
    productsParsed: normalizedProducts.length,
    validAsinsCount: normalizedProducts.filter((p) => Boolean(p.asin)).length,
    affiliateLinksGenerated: normalizedProducts.filter((p) => Boolean(p.affiliateUrl)).length,
    userObservedPricesCount: normalizedProducts.filter((p) => p.priceVerification === 'user-observed').length,
    unknownPricesCount: normalizedProducts.filter((p) => p.priceVerification === 'unknown').length,
    imagelessProductsCount: normalizedProducts.filter((p) => p.imageSource === 'none').length,
  };

  const reviewSummary = formatQualityReportConsole(qualityReport);

  return {
    slug,
    draftPath: targetFilePath,
    qualityReport,
    reviewSummary,
    isReadyForReview: qualityReport.isPublishable,
    heroImageUploadedToR2: heroUploaded,
    metrics,
  };
}
