/**
 * Product Research Data Contract & Stub
 *
 * Defines the structured contract for AI-assisted / web-researched product metadata.
 *
 * ARCHITECTURAL SAFETY GUARANTEES:
 * - This is NOT an Amazon scraper.
 * - This does NOT make unauthorized network calls or fake Amazon API calls.
 * - Explicitly marks `source = 'web-research'` and `productDataVerified = false`.
 * - Never fabricates live prices, review counts, user ratings, or stock urgency.
 * - Clearly documents the boundary between manual/AI research and authoritative verification.
 */

export type ResearchConfidence = 'high' | 'medium' | 'low' | 'unknown';

export interface ProductResearchResult {
  asin: string;
  name: string;
  brand: string;
  model?: string;
  shortDescription: string;
  specifications?: Record<string, string>;
  bestFor: string;
  pros: string[];
  cons: string[];
  source: 'web-research';
  productDataVerified: false;
  confidence: ResearchConfidence;
  researchNote?: string;
}

export interface ResearchStubOptions {
  confidence?: ResearchConfidence;
  researchNote?: string;
}

/**
 * Creates an empty research result template for a given ASIN.
 * Used as a structured contract that Antigravity / human researchers can populate.
 */
export function createEmptyResearchResult(
  asin: string,
  options?: ResearchStubOptions
): ProductResearchResult {
  return {
    asin: asin.trim().toUpperCase(),
    name: '',
    brand: '',
    shortDescription: '',
    bestFor: '',
    pros: [],
    cons: [],
    source: 'web-research',
    productDataVerified: false,
    confidence: options?.confidence || 'unknown',
    researchNote: options?.researchNote || 'Structured research contract placeholder; pending research population.',
  };
}

/**
 * Constructs a fully structured ProductResearchResult while enforcing
 * safety invariants (source = 'web-research', productDataVerified = false).
 */
export function createResearchResult(
  data: Omit<ProductResearchResult, 'source' | 'productDataVerified'>
): ProductResearchResult {
  return {
    ...data,
    asin: data.asin.trim().toUpperCase(),
    name: data.name.trim(),
    brand: data.brand.trim(),
    model: data.model?.trim() || undefined,
    shortDescription: data.shortDescription.trim(),
    bestFor: data.bestFor.trim(),
    pros: (data.pros || []).map((p) => p.trim()).filter(Boolean),
    cons: (data.cons || []).map((c) => c.trim()).filter(Boolean),
    specifications: data.specifications,
    source: 'web-research',
    productDataVerified: false,
    confidence: data.confidence || 'medium',
    researchNote: data.researchNote?.trim() || undefined,
  };
}

/**
 * Research Provider Stub
 *
 * In the absence of an official Amazon Creators API, this returns a structured
 * research template for an ASIN. Network-free and deterministic.
 */
export async function researchProductByAsin(
  asin: string,
  options?: ResearchStubOptions
): Promise<ProductResearchResult> {
  return createEmptyResearchResult(asin, options);
}
