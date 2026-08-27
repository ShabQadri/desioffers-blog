/**
 * Media Audit & Review Package
 *
 * Scans articles and categorizes all media references into:
 * - real / local (exists in public/images/...)
 * - demo (legacy demo references not present on disk)
 * - placeholder (brand placeholder fallback)
 * - r2 (R2 object key or /cdn-cgi/image/... path)
 * - amazon (external Amazon CDN asset)
 * - missing (referenced path does not exist on disk)
 * - imageless (explicitly imageless product card)
 * - external / unknown
 *
 * Provides human review summaries without modifying any existing content.
 */

import fs from 'fs';
import path from 'path';
import { parseMdxArticle, parseFrontmatterYaml } from '../publish/validator.js';

export type MediaReferenceType =
  | 'real'
  | 'demo'
  | 'placeholder'
  | 'r2'
  | 'amazon'
  | 'missing'
  | 'imageless'
  | 'external'
  | 'unknown';

export interface MediaReferenceAudit {
  field: 'heroImage' | 'productImage' | 'authorAvatar';
  articleSlug: string;
  productPosition?: number;
  productName?: string;
  rawUrl: string;
  type: MediaReferenceType;
  existsOnDisk: boolean;
  notes: string;
}

export interface ArticleMediaAuditSummary {
  slug: string;
  title: string;
  category: string;
  heroStatus: string;
  heroRights: string;
  totalProducts: number;
  imagelessProducts: number;
  references: MediaReferenceAudit[];
}

export interface FullSiteMediaAudit {
  scannedArticlesCount: number;
  totalReferencesCount: number;
  typeCounts: Record<MediaReferenceType, number>;
  articles: ArticleMediaAuditSummary[];
}

export function classifyMediaUrl(rawUrl?: string, projectRoot: string = process.cwd()): { type: MediaReferenceType; existsOnDisk: boolean; notes: string } {
  if (!rawUrl || rawUrl.trim() === '') {
    return { type: 'imageless', existsOnDisk: false, notes: 'No image specified (clean imageless presentation)' };
  }

  const trimmed = rawUrl.trim();

  // Placeholder
  if (trimmed.includes('placeholder.webp') || trimmed.includes('placeholder.png') || trimmed.includes('placeholder.svg')) {
    const localPath = path.join(projectRoot, 'public', trimmed.replace(/^\//, ''));
    const exists = fs.existsSync(localPath);
    return { type: 'placeholder', existsOnDisk: exists, notes: 'Default brand placeholder asset' };
  }

  // Amazon CDN
  if (trimmed.includes('media-amazon.com') || trimmed.includes('images-amazon.com') || trimmed.includes('ssl-images-amazon.com')) {
    return { type: 'amazon', existsOnDisk: false, notes: 'External Amazon CDN image URL' };
  }

  // Cloudflare Images or R2 Key
  if (trimmed.startsWith('/cdn-cgi/image/') || trimmed.startsWith('articles/') || trimmed.startsWith('categories/') || trimmed.startsWith('authors/')) {
    return { type: 'r2', existsOnDisk: false, notes: 'Cloudflare R2 private bucket reference / transformation path' };
  }

  // External generic URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return { type: 'external', existsOnDisk: false, notes: 'External web image URL' };
  }

  // Local /images/ path
  if (trimmed.startsWith('/images/') || trimmed.startsWith('images/')) {
    const localPath = path.join(projectRoot, 'public', trimmed.replace(/^\//, ''));
    const exists = fs.existsSync(localPath);
    if (exists) {
      return { type: 'real', existsOnDisk: true, notes: 'Local static asset in public/images/' };
    }
    // If not present on disk, classify whether it is a known demo pattern or missing file
    const isDemoPattern = trimmed.includes('/articles/') || trimmed.includes('/products/');
    return {
      type: isDemoPattern ? 'demo' : 'missing',
      existsOnDisk: false,
      notes: isDemoPattern
        ? 'Legacy demo fixture reference (file not on local disk, falls back to SVG/brand placeholder)'
        : `Missing local file: ${localPath}`,
    };
  }

  return { type: 'unknown', existsOnDisk: false, notes: 'Unclassified media reference format' };
}

export function auditArticleMedia(articleSlug: string, projectRoot: string = process.cwd()): ArticleMediaAuditSummary {
  const filePath = path.join(projectRoot, 'src', 'content', 'articles', `${articleSlug}.mdx`);
  const { frontmatterText } = parseMdxArticle(filePath);
  const data = parseFrontmatterYaml(frontmatterText);

  const references: MediaReferenceAudit[] = [];

  // 1. Hero Image
  const heroClassification = classifyMediaUrl(data.heroImage, projectRoot);
  references.push({
    field: 'heroImage',
    articleSlug,
    rawUrl: data.heroImage || '',
    type: heroClassification.type,
    existsOnDisk: heroClassification.existsOnDisk,
    notes: heroClassification.notes,
  });

  // 2. Product Images
  let imagelessCount = 0;
  for (const prod of data.products || []) {
    const prodClassification = classifyMediaUrl(prod.image, projectRoot);
    if (prodClassification.type === 'imageless') {
      imagelessCount++;
    }
    references.push({
      field: 'productImage',
      articleSlug,
      productPosition: prod.position,
      productName: prod.name,
      rawUrl: prod.image || '',
      type: prodClassification.type,
      existsOnDisk: prodClassification.existsOnDisk,
      notes: prodClassification.notes,
    });
  }

  return {
    slug: articleSlug,
    title: data.title || articleSlug,
    category: data.category || 'unknown',
    heroStatus: data.heroImageStatus || 'ready',
    heroRights: data.heroImageRightsStatus || 'original',
    totalProducts: (data.products || []).length,
    imagelessProducts: imagelessCount,
    references,
  };
}

export function auditAllArticlesMedia(projectRoot: string = process.cwd()): FullSiteMediaAudit {
  const articlesDir = path.join(projectRoot, 'src', 'content', 'articles');
  const files = fs.readdirSync(articlesDir).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));

  const summaries: ArticleMediaAuditSummary[] = [];
  const typeCounts: Record<MediaReferenceType, number> = {
    real: 0,
    demo: 0,
    placeholder: 0,
    r2: 0,
    amazon: 0,
    missing: 0,
    imageless: 0,
    external: 0,
    unknown: 0,
  };

  let totalReferences = 0;

  for (const file of files) {
    const filePath = path.join(articlesDir, file);
    if (!fs.existsSync(filePath)) continue;
    const slug = file.replace(/\.mdx?$/, '');
    try {
      const summary = auditArticleMedia(slug, projectRoot);
      summaries.push(summary);

      for (const ref of summary.references) {
        totalReferences++;
        typeCounts[ref.type] = (typeCounts[ref.type] || 0) + 1;
      }
    } catch {
      // Ignore files deleted concurrently during test suites
      continue;
    }
  }

  return {
    scannedArticlesCount: summaries.length,
    totalReferencesCount: totalReferences,
    typeCounts,
    articles: summaries,
  };
}

export function formatMediaAuditReport(audit: FullSiteMediaAudit): string {
  const lines: string[] = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'DESIOFFERS GUIDES — EXISTING MEDIA REFERENCE AUDIT REPORT',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `📊 SUMMARY: Scanned ${audit.scannedArticlesCount} articles (${audit.totalReferencesCount} total media references)`,
    `   - Real Local Assets:           ${audit.typeCounts.real}`,
    `   - Legacy Demo References:      ${audit.typeCounts.demo}`,
    `   - R2 Bucket References:        ${audit.typeCounts.r2}`,
    `   - Imageless / None:            ${audit.typeCounts.imageless}`,
    `   - Brand Placeholder Assets:    ${audit.typeCounts.placeholder}`,
    `   - External Amazon CDN:         ${audit.typeCounts.amazon}`,
    `   - Missing Local Assets:        ${audit.typeCounts.missing}`,
    `   - External Web Images:         ${audit.typeCounts.external}`,
    `   - Unknown Formats:             ${audit.typeCounts.unknown}`,
    '',
    '📄 PER-ARTICLE MEDIA STATUS:',
  ];

  for (const art of audit.articles) {
    lines.push(`\n▶ [${art.category}] ${art.title} (${art.slug})`);
    for (const ref of art.references) {
      const icon = ref.type === 'demo' || ref.type === 'placeholder' ? 'ℹ️' : ref.type === 'real' || ref.type === 'r2' ? '✅' : '⚠️';
      const label = ref.field === 'heroImage' ? 'Hero Image' : `Product #${ref.productPosition} (${ref.productName})`;
      lines.push(`   ${icon} ${label}: [${ref.type.toUpperCase()}] ${ref.rawUrl || '(none)'}`);
    }
  }

  lines.push('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}
