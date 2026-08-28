/**
 * Product Claim Consistency Verifier
 *
 * Verifies that structured product data, ProductCard specs, and comparison-table
 * information strictly match approved ProductFactSheets.
 */

import { normalizeIdentityString, getRelevantFactFields, verifyProductIdentity } from './fact-sheet.js';
import type {
  ProductFactSheet,
  ProductClaimVerificationResult,
  ProductClaimVerificationIssue,
} from './fact-sheet-types.js';

export interface ArticleProductClaimInput {
  name: string;
  brand?: string;
  model?: string;
  asin?: string;
  editorialBadge?: string;
  shortDescription?: string;
  bestFor?: string;
  pros?: string[];
  cons?: string[];
  specifications?: Record<string, string | number | boolean>;
  priceDisplay?: string;
  priceObservedAt?: string;
  priceVerification?: string;
  availabilityNote?: string;
  affiliateUrl?: string;
}

export function verifyArticleProductAgainstFactSheet(
  product: ArticleProductClaimInput,
  factSheet: ProductFactSheet | null,
  options?: {
    requireFactSheet?: boolean;
    category?: string;
    subcategory?: string;
  }
): ProductClaimVerificationResult {
  const issues: ProductClaimVerificationIssue[] = [];
  const asin = product.asin ? product.asin.toUpperCase().trim() : 'UNKNOWN_ASIN';
  const productName = product.name || 'Unnamed Product';

  // 1. Missing Fact Sheet Check
  if (!factSheet) {
    const isRequired = options?.requireFactSheet !== false;
    issues.push({
      field: 'asin',
      severity: isRequired ? 'BLOCKER' : 'WARNING',
      code: 'MISSING_FACT_SHEET',
      message: isRequired
        ? `No approved ProductFactSheet found for ASIN "${asin}". Publication blocked for real buying guides.`
        : `No ProductFactSheet found for ASIN "${asin}". Data relies on unverified manual input.`,
      actual: asin,
    });

    return {
      asin,
      productName,
      hasBlockers: isRequired,
      hasWarnings: !isRequired,
      identityVerified: false,
      issues,
      verifiedFactsCount: 0,
      unverifiedFactsCount: 0,
      conflictsCount: 0,
    };
  }

  // 2. Identity Verification
  const idCheck = verifyProductIdentity(
    {
      asin: product.asin,
      brand: product.brand,
      model: product.model,
      productName: product.name,
    },
    factSheet
  );

  if (!idCheck.isMatch) {
    for (const reason of idCheck.reasons) {
      issues.push({
        field: 'identity',
        severity: 'BLOCKER',
        code: 'PRODUCT_IDENTITY_MISMATCH',
        message: `Product identity mismatch: ${reason}`,
        expected: `${factSheet.identity.brand} ${factSheet.identity.model} (${factSheet.asin})`,
        actual: `${product.brand || ''} ${product.model || product.name} (${product.asin || ''})`,
      });
    }
  } else {
    issues.push({
      field: 'identity',
      severity: 'PASS',
      code: 'PRODUCT_IDENTITY_MATCH',
      message: `Exact product identity verified: ${factSheet.identity.brand} ${factSheet.identity.model} (${factSheet.asin})`,
    });
  }

  // 3. Unresolved Fact Conflicts in Fact Sheet
  const materialConflicts = factSheet.verification.conflicts.filter((c) => c.material);
  if (materialConflicts.length > 0) {
    for (const c of materialConflicts) {
      issues.push({
        field: c.field,
        severity: 'BLOCKER',
        code: 'FACT_CONFLICT',
        message: `Unresolved material conflict in fact sheet for field "${c.field}": "${c.valueA}" vs "${c.valueB}". ${c.recommendedAction}`,
      });
    }
  }

  // 4. Structured Specification Consistency
  let verifiedCount = 0;
  let unverifiedCount = 0;

  const relevantFields = new Set(
    getRelevantFactFields(factSheet.categoryInfo || { category: options?.category, subcategory: options?.subcategory })
  );

  if (product.specifications) {
    for (const [key, articleVal] of Object.entries(product.specifications)) {
      const fact = factSheet.specifications[key];
      if (fact && fact.status === 'verified') {
        const normArticle = normalizeIdentityString(String(articleVal));
        const normFact = normalizeIdentityString(String(fact.value));

        if (normArticle === normFact || normArticle.includes(normFact) || normFact.includes(normArticle)) {
          verifiedCount++;
          issues.push({
            field: key,
            severity: 'PASS',
            code: 'ARTICLE_FACT_MATCH',
            message: `Specification "${key}" matches approved fact sheet value "${fact.value}"`,
            expected: fact.value,
            actual: articleVal,
          });
        } else {
          issues.push({
            field: key,
            severity: 'BLOCKER',
            code: 'ARTICLE_FACT_MISMATCH',
            message: `Article specification "${key}" claims "${articleVal}" but approved fact sheet states "${fact.value}"`,
            expected: fact.value,
            actual: articleVal,
          });
        }
      } else {
        unverifiedCount++;
        const isRelevant = relevantFields.has(key);
        issues.push({
          field: key,
          severity: isRelevant ? 'BLOCKER' : 'WARNING',
          code: isRelevant ? 'UNAPPROVED_FACT_CLAIM' : 'UNKNOWN_NON_MATERIAL_FIELD',
          message: isRelevant
            ? `Article introduces unapproved specification "${key}: ${articleVal}" not verified in fact sheet`
            : `Article specification "${key}: ${articleVal}" is not verified in fact sheet`,
          actual: articleVal,
        });
      }
    }
  }

  const hasBlockers = issues.some((i) => i.severity === 'BLOCKER');
  const hasWarnings = issues.some((i) => i.severity === 'WARNING');

  return {
    asin,
    productName,
    hasBlockers,
    hasWarnings,
    identityVerified: idCheck.isMatch,
    issues,
    verifiedFactsCount: verifiedCount,
    unverifiedFactsCount: unverifiedCount,
    conflictsCount: materialConflicts.length,
  };
}
