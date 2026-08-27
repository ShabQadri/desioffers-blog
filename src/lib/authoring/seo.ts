/**
 * SEO Metadata Formatter
 *
 * Deterministic utilities for generating and validating SEO metadata.
 * No AI reasoning. Input → formatted/validated output.
 *
 * Antigravity provides the raw title and description text.
 * This module ensures they conform to length and format constraints.
 */

import type { SeoResult } from './types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hard character limit for SEO title (Google typically truncates beyond ~60) */
export const SEO_TITLE_MAX = 60;

/** Hard character limit for SEO description (Google typically truncates beyond ~160) */
export const SEO_DESCRIPTION_MAX = 160;

/** Recommended minimum for meta description to be useful */
export const SEO_DESCRIPTION_MIN = 50;

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

/**
 * Generates a URL-safe, SEO-friendly slug from a title string.
 *
 * Rules:
 * - Lowercase
 * - ASCII characters only (transliterates common Unicode)
 * - Words separated by single hyphens
 * - No leading/trailing hyphens
 * - No consecutive hyphens
 * - Special characters and punctuation removed
 * - Numbers preserved (e.g. ₹5000 → 5000, "5 Best" → 5-best)
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    // Transliterate ₹ to rs (common in Indian product content)
    .replace(/₹/g, 'rs')
    // Remove commas between digits (e.g. 5,000 -> 5000)
    .replace(/(\d),(\d)/g, '$1$2')
    // Remove apostrophes/quotes without leaving gaps
    .replace(/[''""]/g, '')
    // Replace non-alphanumeric characters (except hyphens) with spaces
    .replace(/[^a-z0-9\s-]/g, ' ')
    // Collapse multiple spaces/hyphens into single hyphen
    .replace(/[\s-]+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// SEO title formatting
// ---------------------------------------------------------------------------

/**
 * Formats an SEO title, appending site name if it fits within the limit.
 * Returns the title as-is (trimmed) if appending site name would exceed limit.
 *
 * @param title       - The article title or custom SEO title
 * @param siteName    - The site brand name (e.g. 'DesiOffers Guides')
 * @param separator   - Separator between title and site name (default ' — ')
 */
export function formatSeoTitle(
  title: string,
  siteName: string = 'DesiOffers Guides',
  separator: string = ' — '
): string {
  const trimmed = title.trim();
  const withSite = `${trimmed}${separator}${siteName}`;

  if (withSite.length <= SEO_TITLE_MAX) {
    return withSite;
  }

  // Try without site name
  if (trimmed.length <= SEO_TITLE_MAX) {
    return trimmed;
  }

  // Title itself is too long — truncate at last word boundary before limit
  return trimmed.slice(0, SEO_TITLE_MAX - 1).replace(/\s+\S*$/, '').trimEnd();
}

// ---------------------------------------------------------------------------
// SEO description formatting
// ---------------------------------------------------------------------------

/**
 * Validates and trims an SEO description to the character limit.
 * Truncates at the last full sentence or word boundary if over limit.
 */
export function formatSeoDescription(description: string): string {
  const trimmed = description.trim();

  if (trimmed.length <= SEO_DESCRIPTION_MAX) {
    return trimmed;
  }

  // Try to cut at last sentence boundary within limit
  const truncated = trimmed.slice(0, SEO_DESCRIPTION_MAX);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastBoundary = Math.max(lastPeriod, lastQuestion);

  if (lastBoundary > SEO_DESCRIPTION_MAX * 0.6) {
    return truncated.slice(0, lastBoundary + 1).trim();
  }

  // Fall back to word boundary
  return truncated.replace(/\s+\S*$/, '').trimEnd() + '…';
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface SeoValidationWarning {
  field: 'seoTitle' | 'seoDescription';
  message: string;
}

/**
 * Validates SEO metadata lengths and returns any warnings.
 * Does not throw — returns warning list.
 */
export function validateSeoLengths(
  seoTitle: string,
  seoDescription: string
): SeoValidationWarning[] {
  const warnings: SeoValidationWarning[] = [];

  if (seoTitle.length > SEO_TITLE_MAX) {
    warnings.push({
      field: 'seoTitle',
      message: `SEO title is ${seoTitle.length} characters (max ${SEO_TITLE_MAX}). Google may truncate in search results.`,
    });
  }

  if (seoDescription.length > SEO_DESCRIPTION_MAX) {
    warnings.push({
      field: 'seoDescription',
      message: `SEO description is ${seoDescription.length} characters (max ${SEO_DESCRIPTION_MAX}). Google may truncate in search results.`,
    });
  }

  if (seoDescription.length < SEO_DESCRIPTION_MIN) {
    warnings.push({
      field: 'seoDescription',
      message: `SEO description is only ${seoDescription.length} characters. A minimum of ${SEO_DESCRIPTION_MIN} is recommended.`,
    });
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Combined generator — Antigravity passes raw text; this returns structured result
// ---------------------------------------------------------------------------

/**
 * Generates a complete SEO metadata result from raw title and description.
 *
 * @param rawTitle       - Article title (Antigravity-generated)
 * @param rawDescription - Article description (Antigravity-generated)
 * @param siteName       - Site brand name from SITE_CONFIG
 */
export function generateSeoMetadata(
  rawTitle: string,
  rawDescription: string,
  siteName: string = 'DesiOffers Guides'
): SeoResult {
  const slug = generateSlug(rawTitle);
  const seoTitle = formatSeoTitle(rawTitle, siteName);
  const seoDescription = formatSeoDescription(rawDescription);
  const validationWarnings = validateSeoLengths(seoTitle, seoDescription);

  return {
    slug,
    seoTitle,
    seoDescription,
    warnings: validationWarnings.map((w) => w.message),
  };
}
