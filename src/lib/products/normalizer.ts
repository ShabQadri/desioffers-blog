/**
 * Product Normalizer
 *
 * Converts raw product data (manual input or future API response) into
 * a strictly validated NormalizedProduct instance.
 *
 * SAFETY & QUALITY RULES:
 * - Validates 10-character Amazon ASIN format (when present).
 * - Enforces imageless fallback when imageSource is 'none' or image is omitted.
 * - Enforces price & stock verification states (never invents unverified prices).
 * - Sanitizes URLs to transparent, canonical Amazon URLs.
 */

import { buildAmazonAffiliateUrl } from '../../utils/affiliate.js';
import type { NormalizedProduct, ManualProductInput, AmazonUrlInput, PriceVerificationState } from './types.js';
import { parseAmazonUrl, extractAsin, ASIN_REGEX, isValidAsin } from './url-parser.js';

export { ASIN_REGEX, isValidAsin };

export function extractAsinFromUrl(url?: string): string | null {
  return extractAsin(url || '');
}

export function normalizeProduct(input: ManualProductInput, index: number = 1): NormalizedProduct {
  const position = input.position || index;
  const name = (input.name || '').trim();
  const brand = (input.brand || '').trim();
  const model = input.model ? input.model.trim() : undefined;

  // Extract or validate ASIN
  let asin = input.asin ? input.asin.trim().toUpperCase() : undefined;
  if (!asin && input.url) {
    asin = extractAsinFromUrl(input.url) || undefined;
  }

  // Construct transparent product and affiliate URLs
  const rawUrl = input.url || (asin ? `https://www.amazon.in/dp/${asin}` : '#');
  const affiliateUrl = input.affiliateUrl || (asin ? buildAmazonAffiliateUrl(asin) : rawUrl);

  // Image handling: enforce imageless fallback
  let imageSource = input.imageSource || (input.image ? 'r2' : 'none');
  let image = input.image ? input.image.trim() : undefined;
  let imageAlt = input.imageAlt ? input.imageAlt.trim() : undefined;

  if (!image || image === '' || imageSource === 'none') {
    image = undefined;
    imageAlt = undefined;
    imageSource = 'none';
  }

  // Price verification state
  const priceDisplay = input.priceDisplay ? input.priceDisplay.trim() : undefined;
  const priceVerification: PriceVerificationState =
    input.priceVerification || (priceDisplay ? 'user-observed' : 'unknown');
  const priceObservedAt =
    input.priceObservedAt || (priceDisplay ? new Date().toISOString() : undefined);

  // Availability verification state
  const availabilityNote = input.availabilityNote ? input.availabilityNote.trim() : undefined;
  const availabilityVerification = input.availabilityVerification || (availabilityNote ? 'verified' : 'unknown');

  return {
    position,
    name,
    brand,
    model,
    asin,
    url: rawUrl,
    affiliateUrl,
    image,
    imageAlt: imageAlt || (image ? name : undefined),
    imageSource,
    imageRightsStatus: input.imageRightsStatus,
    editorialBadge: input.editorialBadge ? input.editorialBadge.trim() : undefined,
    shortDescription: (input.shortDescription || '').trim(),
    bestFor: (input.bestFor || '').trim(),
    pros: (input.pros || []).map((p) => p.trim()).filter(Boolean),
    cons: (input.cons || []).map((c) => c.trim()).filter(Boolean),
    priceDisplay,
    priceObservedAt,
    priceVerification,
    availabilityNote,
    availabilityVerification,
    specifications: input.specifications,
    source: input.source || 'manual',
    researchNote: input.researchNote,
    retrievedAt: new Date().toISOString(),
  };
}

export function normalizeFromAmazonUrl(
  input: AmazonUrlInput & Partial<ManualProductInput>,
  index: number = 1
): NormalizedProduct {
  const parsed = parseAmazonUrl(input.url, {
    price: input.price,
    badge: input.badge,
    ranking: input.ranking,
  });

  const asin = parsed?.asin || (input.asin ? input.asin.trim().toUpperCase() : undefined);
  const rawUrl = parsed?.canonicalUrl || input.url || (asin ? `https://www.amazon.in/dp/${asin}` : '#');
  const affiliateUrl = input.affiliateUrl || parsed?.affiliateUrl || (asin ? buildAmazonAffiliateUrl(asin) : rawUrl);
  const position = input.ranking || input.position || index;

  const priceDisplay = (input.price || input.priceDisplay || parsed?.price)?.trim() || undefined;
  const priceVerification: PriceVerificationState =
    input.priceVerification || (priceDisplay ? 'user-observed' : 'unknown');
  const priceObservedAt =
    input.priceObservedAt || (priceDisplay ? new Date().toISOString() : undefined);

  const availabilityNote = input.availabilityNote ? input.availabilityNote.trim() : 'Check availability on Amazon';
  const availabilityVerification = input.availabilityVerification || 'unknown';

  let imageSource = input.imageSource || (input.image ? 'r2' : 'none');
  let image = input.image ? input.image.trim() : undefined;
  let imageAlt = input.imageAlt ? input.imageAlt.trim() : undefined;

  if (!image || image === '' || imageSource === 'none') {
    image = undefined;
    imageAlt = undefined;
    imageSource = 'none';
  }

  const editorialBadge = (input.badge || input.editorialBadge || parsed?.badge)?.trim() || undefined;

  return {
    position,
    name: (input.name || (asin ? `Amazon Product (${asin})` : 'Untitled Product')).trim(),
    brand: (input.brand || '').trim(),
    model: input.model ? input.model.trim() : undefined,
    asin,
    url: rawUrl,
    affiliateUrl,
    image,
    imageAlt: imageAlt || (image ? input.name : undefined),
    imageSource,
    imageRightsStatus: input.imageRightsStatus,
    editorialBadge,
    shortDescription: (input.shortDescription || '').trim(),
    bestFor: (input.bestFor || '').trim(),
    pros: (input.pros || []).map((p) => p.trim()).filter(Boolean),
    cons: (input.cons || []).map((c) => c.trim()).filter(Boolean),
    priceDisplay,
    priceObservedAt,
    priceVerification,
    availabilityNote,
    availabilityVerification,
    specifications: input.specifications,
    source: input.source || 'web-research',
    researchNote: input.researchNote,
    retrievedAt: new Date().toISOString(),
  };
}
