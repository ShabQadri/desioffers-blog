/**
 * Amazon URL Parser & ASIN Extractor
 *
 * Deterministically parses Amazon product URLs to extract valid 10-character ASINs
 * and construct clean canonical and affiliate links.
 *
 * SAFETY INVARIANTS:
 * - Does NOT make network requests or scrape Amazon.
 * - Enforces Amazon domain validation (rejects third-party/malicious URLs).
 * - Enforces 10-character alphanumeric ASIN validation.
 * - Always targets Amazon.in as canonical purchase destination.
 */

import { buildAmazonAffiliateUrl } from '../../utils/affiliate.js';
import type { AmazonUrlInput } from './types.js';

export const ASIN_REGEX = /^[A-Z0-9]{10}$/;

const ALLOWED_AMAZON_HOSTNAMES = [
  'amazon.in',
  'www.amazon.in',
  'amzn.in',
  'amzn.to',
  'amazon.com',
  'www.amazon.com',
];

export interface ParsedAmazonProduct {
  asin: string;
  canonicalUrl: string;
  affiliateUrl: string;
  price?: string;
  badge?: string;
  ranking?: number;
}

/**
 * Validates if an ASIN string matches the standard 10-character alphanumeric format.
 */
export function isValidAsinFormat(asin?: string): boolean {
  if (!asin) return false;
  return ASIN_REGEX.test(asin.trim().toUpperCase());
}

export const isValidAsin = isValidAsinFormat;

/**
 * Extracts a 10-character ASIN from an Amazon URL string.
 * Supports /dp/ASIN, /gp/product/ASIN, /product/ASIN, /d/ASIN, etc.
 */
export function extractAsin(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();

  // 1. Direct ASIN input
  if (ASIN_REGEX.test(trimmed.toUpperCase())) {
    return trimmed.toUpperCase();
  }

  // 2. Validate hostname if full URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const hostname = parsed.hostname.toLowerCase();
      const isAllowed = ALLOWED_AMAZON_HOSTNAMES.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      );
      if (!isAllowed) {
        return null;
      }
    } catch {
      return null;
    }
  }

  // 3. Match common Amazon URL paths
  const patterns = [
    /(?:\/dp\/|\/gp\/product\/|\/product\/|\/d\/)([A-Z0-9]{10})(?:[/?&#]|$)/i,
    /(?:[?&]asin=)([A-Z0-9]{10})(?:[&#]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1] && isValidAsinFormat(match[1])) {
      return match[1].toUpperCase();
    }
  }

  return null;
}

/**
 * Parses a single Amazon URL or AmazonUrlInput into a structured ParsedAmazonProduct.
 * Returns null if the URL is invalid or ASIN cannot be extracted.
 */
export function parseAmazonUrl(
  input: string | AmazonUrlInput,
  extra?: { price?: string; badge?: string; ranking?: number }
): ParsedAmazonProduct | null {
  const url = typeof input === 'string' ? input : input.url;
  const price = (typeof input === 'object' ? input.price : extra?.price)?.trim() || undefined;
  const badge = (typeof input === 'object' ? input.badge : extra?.badge)?.trim() || undefined;
  const ranking = typeof input === 'object' ? input.ranking : extra?.ranking;

  const asin = extractAsin(url);
  if (!asin) {
    return null;
  }

  const canonicalUrl = `https://www.amazon.in/dp/${asin}`;
  const affiliateUrl = buildAmazonAffiliateUrl(asin);

  return {
    asin,
    canonicalUrl,
    affiliateUrl,
    price,
    badge,
    ranking,
  };
}

/**
 * Batch parses an array of AmazonUrlInput items.
 * Ignores or filters invalid URLs.
 */
export function parseAmazonUrls(
  inputs: (string | AmazonUrlInput)[]
): ParsedAmazonProduct[] {
  const results: ParsedAmazonProduct[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const item = inputs[i];
    const parsed = parseAmazonUrl(item);
    if (parsed) {
      if (parsed.ranking === undefined) {
        parsed.ranking = i + 1;
      }
      results.push(parsed);
    }
  }

  return results;
}
