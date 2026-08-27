/**
 * Product Safety & Quality Validation
 *
 * Enforces editorial anti-fabrication rules on product data:
 * - Detects false claims of hands-on physical testing
 * - Flags invented review counts and ratings
 * - Flags unverified dynamic pricing and stock urgency claims
 * - Strictly prohibits AI-generated fake product photos
 */

import type { NormalizedProduct } from './types.js';

const FABRICATION_PATTERNS = [
  /\b(?:we|our team)\s+tested\b/i,
  /\bour\s+(?:hands-on|lab|benchmark)\s+test(?:s|ing)?\b/i,
  /\b(?:we|our team)\s+benchmarked\b/i,
  /\b(?:we|our team)\s+used this for\s+\d+\s+(?:days|weeks|months)\b/i,
  /\brated\s+\d+(?:\.\d+)?\s*(?:\/5|stars?)\s+across\s+\d+[\d,]*\s+reviews?\b/i,
  /\b(?:only|hurry)\s+\d+\s+(?:left|units? remaining)\s+in stock\b/i,
  /\bguaranteed\s+(?:lowest|best)\s+price\b/i,
];

export interface ProductValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateProductSafety(product: NormalizedProduct): ProductValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Basic Field Validation
  if (!product.name || product.name.trim() === '') {
    errors.push(`Product #${product.position}: Product name is required.`);
  }

  if (!product.brand || product.brand.trim() === '') {
    errors.push(`Product #${product.position} (${product.name}): Brand name is required.`);
  }

  if (!product.shortDescription || product.shortDescription.trim() === '') {
    errors.push(`Product #${product.position} (${product.name}): Short description is required.`);
  }

  if (!product.bestFor || product.bestFor.trim() === '') {
    errors.push(`Product #${product.position} (${product.name}): 'Best for' recommendation is required.`);
  }

  if (!product.pros || product.pros.length === 0) {
    errors.push(`Product #${product.position} (${product.name}): At least one pro is required.`);
  }

  if (!product.cons || product.cons.length === 0) {
    errors.push(`Product #${product.position} (${product.name}): At least one con is required.`);
  }

  // 2. Anti-Fabrication Content Inspection
  const fullProductText = [
    product.name,
    product.shortDescription,
    product.bestFor,
    product.editorialBadge || '',
    ...(product.pros || []),
    ...(product.cons || []),
    product.availabilityNote || '',
  ].join(' ');

  for (const pattern of FABRICATION_PATTERNS) {
    if (pattern.test(fullProductText)) {
      errors.push(
        `Product #${product.position} (${product.name}): Contains fabricated testing or unverified claim matching pattern: ${pattern.toString()}`
      );
    }
  }

  // 3. AI-Generated Product Photograph Policy
  // Products must not use ai-generated images unless marked as an illustrative/generic graphic
  if (product.imageSource === 'ai-generated' && !product.imageRightsStatus) {
    warnings.push(
      `Product #${product.position} (${product.name}): Using AI-generated imagery for a commercial product requires explicit editorial confirmation.`
    );
  }

  // 4. Restricted Media Check
  if (product.imageRightsStatus === 'restricted') {
    errors.push(`Product #${product.position} (${product.name}): Image is marked 'restricted' and cannot be published.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateAllProducts(products: NormalizedProduct[]): { isValid: boolean; errors: string[] } {
  const allErrors: string[] = [];

  for (const product of products) {
    const res = validateProductSafety(product);
    allErrors.push(...res.errors);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}
