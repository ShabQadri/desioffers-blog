/**
 * Product Fact Sheet Creation, Category Discovery & Conflict Engine
 *
 * Provides deterministic utilities to:
 * - Construct audited, category-aware ProductFactSheet instances
 * - Dynamically determine relevant facts by category/subcategory/productType
 * - Rank source authority
 * - Detect and isolate material specification conflicts
 * - Verify product identity (Brand, Model, Variant vs ASIN)
 */

import type {
  ProductFactSheet,
  FactSheetBuilderInput,
  SpecificationFact,
  SourceAuthority,
  FactConflict,
  ProductIdentity,
  ProductCategoryInfo,
  IdentityStatus,
} from './fact-sheet-types.js';

/**
 * Dynamically resolves relevant specification fields for a given product/category.
 * Does NOT enforce a single universal checklist across unrelated product categories.
 */
export function getRelevantFactFields(categoryInfo?: ProductCategoryInfo): string[] {
  const normCat = categoryInfo?.category?.toLowerCase().trim() || '';
  const normSub = categoryInfo?.subcategory?.toLowerCase().trim() || '';
  const normType = categoryInfo?.productType?.toLowerCase().trim() || '';

  // Audio / Neckbands / Earbuds / Headphones
  if (
    normCat === 'electronics-audio' ||
    normSub === 'headphones' ||
    normSub === 'earbuds' ||
    normType.includes('neckband') ||
    normType.includes('earbud') ||
    normType.includes('headphone')
  ) {
    return [
      'driverSize',
      'batteryLife',
      'chargingSpeed',
      'ipRating',
      'bluetoothVersion',
      'latency',
      'anc',
      'enc',
      'codecs',
    ];
  }

  // Gaming Keyboards
  if (
    normSub === 'gaming-keyboards' ||
    normType.includes('keyboard')
  ) {
    return [
      'switchType',
      'layout',
      'pollingRate',
      'connectionType',
      'keyRollover',
      'backlight',
      'compatibility',
    ];
  }

  // Gaming Mice
  if (normSub === 'gaming-mice' || normType.includes('mouse')) {
    return [
      'sensor',
      'dpi',
      'weight',
      'switches',
      'connectionType',
      'batteryLife',
      'pollingRate',
    ];
  }

  // Kitchen Appliances / Air Fryers
  if (
    normCat === 'kitchen-appliances' ||
    normSub === 'air-fryers' ||
    normType.includes('air-fryer')
  ) {
    return [
      'capacity',
      'wattage',
      'temperatureRange',
      'presetCount',
      'basketType',
      'controls',
    ];
  }

  // Beauty & Makeup
  if (
    normCat === 'beauty-makeup' ||
    normSub === 'makeup-kits' ||
    normType.includes('makeup')
  ) {
    return [
      'itemCount',
      'skinType',
      'finish',
      'ingredients',
      'crueltyFree',
    ];
  }

  // Home & Organization / Desk Accessories
  if (
    normCat === 'home-living' ||
    normSub === 'home-organization' ||
    normType.includes('desk') ||
    normType.includes('organizer')
  ) {
    return [
      'material',
      'dimensions',
      'weightCapacity',
      'color',
    ];
  }

  return [];
}

/**
 * Returns numeric rank for source authority. 1 is highest priority.
 */
export function getSourceAuthorityRank(authority: SourceAuthority): number {
  switch (authority) {
    case 'manufacturer-official':
    case 'official-documentation':
      return 1;
    case 'amazon-listing':
      return 2;
    case 'reputable-retailer-or-press':
      return 3;
    case 'secondary-source':
      return 4;
    case 'manual-unverified':
    default:
      return 5;
  }
}

/**
 * Normalizes string for strict matching (lowercase, trimmed, collapse whitespace)
 */
export function normalizeIdentityString(str: string): string {
  return str.toLowerCase().replace(/[\s_\-\.]+/g, ' ').trim();
}

/**
 * Verifies expected product identity against FactSheet identity
 */
export function verifyProductIdentity(
  expected: {
    asin?: string;
    brand?: string;
    model?: string;
    productName?: string;
    variant?: string;
  },
  factSheet: ProductFactSheet
): {
  isMatch: boolean;
  status: IdentityStatus;
  reasons: string[];
} {
  const reasons: string[] = [];

  // 1. ASIN check
  if (expected.asin) {
    const normExpectedAsin = expected.asin.toUpperCase().trim();
    const normFactAsin = factSheet.asin.toUpperCase().trim();
    if (normExpectedAsin !== normFactAsin) {
      reasons.push(`ASIN mismatch: expected "${normExpectedAsin}" but fact sheet is "${normFactAsin}"`);
    }
  }

  // 2. Brand check
  if (expected.brand) {
    const normExpectedBrand = normalizeIdentityString(expected.brand);
    const normFactBrand = normalizeIdentityString(factSheet.identity.brand);
    if (normExpectedBrand !== normFactBrand) {
      reasons.push(`Brand mismatch: expected "${expected.brand}" but fact sheet is "${factSheet.identity.brand}"`);
    }
  }

  // 3. Model check (Strict - e.g. Z2 vs Z3)
  if (expected.model) {
    const normExpectedModel = normalizeIdentityString(expected.model);
    const normFactModel = normalizeIdentityString(factSheet.identity.model);
    if (normExpectedModel !== normFactModel) {
      reasons.push(`Model mismatch: expected "${expected.model}" but fact sheet is "${factSheet.identity.model}"`);
    }
  } else if (expected.productName) {
    const normName = normalizeIdentityString(expected.productName);
    const normFactModel = normalizeIdentityString(factSheet.identity.model);
    if (normFactModel && !normName.includes(normFactModel)) {
      const versionMatchFact = normFactModel.match(/\b([a-z0-9]+)\b/g);
      if (versionMatchFact && versionMatchFact.some((v) => v.length >= 2 && !normName.includes(v))) {
        reasons.push(`Product name "${expected.productName}" does not match fact sheet model "${factSheet.identity.model}"`);
      }
    }
  }

  // 4. Variant check if specified
  if (expected.variant && factSheet.identity.variant) {
    const normExpectedVar = normalizeIdentityString(expected.variant);
    const normFactVar = normalizeIdentityString(factSheet.identity.variant);
    if (normExpectedVar !== normFactVar) {
      reasons.push(`Variant mismatch: expected "${expected.variant}" but fact sheet is "${factSheet.identity.variant}"`);
    }
  }

  const isMatch = reasons.length === 0;
  const status: IdentityStatus = isMatch ? 'verified' : 'mismatch';

  return { isMatch, status, reasons };
}

/**
 * Detects conflicts across specification facts
 */
export function detectFactConflicts(facts: SpecificationFact[]): FactConflict[] {
  const conflicts: FactConflict[] = [];
  const fieldGroups = new Map<string, SpecificationFact[]>();

  for (const fact of facts) {
    const existing = fieldGroups.get(fact.field) || [];
    existing.push(fact);
    fieldGroups.set(fact.field, existing);
  }

  for (const [field, list] of fieldGroups.entries()) {
    if (list.length < 2) continue;

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const valA = String(a.value).trim().toLowerCase();
        const valB = String(b.value).trim().toLowerCase();

        if (valA !== valB) {
          conflicts.push({
            field,
            valueA: a.value,
            sourceA: a.source,
            valueB: b.value,
            sourceB: b.source,
            material: true,
            recommendedAction: `Human review required to resolve conflicting ${field} claims: "${a.value}" (${a.source.sourceType}) vs "${b.value}" (${b.source.sourceType})`,
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Builds a validated, category-aware ProductFactSheet
 */
export function createFactSheet(input: FactSheetBuilderInput): ProductFactSheet {
  const asin = input.asin.toUpperCase().trim();
  const canonicalAmazonUrl = `https://www.amazon.in/dp/${asin}`;
  const now = new Date().toISOString();

  const identity: ProductIdentity = {
    asin,
    brand: input.identity.brand.trim(),
    productName: input.identity.productName.trim(),
    model: input.identity.model.trim(),
    variant: input.identity.variant?.trim(),
    amazonUrl: input.identity.amazonUrl || canonicalAmazonUrl,
    canonicalAmazonUrl,
  };

  const categoryInfo = input.categoryInfo;
  const relevantFields = getRelevantFactFields(categoryInfo);

  const sources = input.sources || [];
  const normalizedSpecs: Record<string, SpecificationFact> = {};
  const verifiedFields: string[] = [];
  const unverifiedFields: string[] = [];
  const missingFields: string[] = [];

  if (input.specifications) {
    for (const [key, specInput] of Object.entries(input.specifications)) {
      const fact: SpecificationFact = {
        field: key,
        label: specInput.label || key,
        value: specInput.value,
        unit: specInput.unit,
        source: specInput.source,
        confidence: specInput.confidence || 'high',
        status: specInput.status || 'verified',
        notes: specInput.notes,
      };

      normalizedSpecs[key] = fact;
      if (fact.status === 'verified') {
        verifiedFields.push(key);
      } else {
        unverifiedFields.push(key);
      }
    }
  }

  // Check missing category-relevant fields
  for (const relField of relevantFields) {
    if (!normalizedSpecs[relField]) {
      missingFields.push(relField);
    }
  }

  // Detect conflicts
  const detectedConflicts = detectFactConflicts(Object.values(normalizedSpecs));
  const allConflicts = [...(input.conflicts || []), ...detectedConflicts];

  const hasMaterialConflicts = allConflicts.some((c) => c.material);
  const isIdentityComplete = Boolean(identity.brand && identity.productName && identity.model && identity.asin);

  let status: ProductFactSheet['status'] = 'FACTS_READY';
  if (!isIdentityComplete) {
    status = 'IDENTITY_BLOCKED';
  } else if (hasMaterialConflicts) {
    status = 'FACTS_CONFLICTED';
  } else if (verifiedFields.length === 0) {
    status = 'FACTS_UNVERIFIED';
  } else {
    status = 'READY_FOR_EDITORIAL_WRITING';
  }

  return {
    asin,
    identity,
    categoryInfo,
    specifications: normalizedSpecs,
    commercial: {
      price: input.commercial?.price,
      priceVerification: input.commercial?.priceVerification || 'user-observed',
      priceObservedAt: input.commercial?.priceObservedAt || now,
      availability: input.commercial?.availability || 'Available on Amazon India',
      availabilityVerification: input.commercial?.availabilityVerification || 'unknown',
    },
    sources,
    verification: {
      identityStatus: isIdentityComplete ? 'verified' : 'unverified',
      factStatus: hasMaterialConflicts ? 'facts_conflicted' : verifiedFields.length > 0 ? 'facts_ready' : 'facts_unverified',
      conflicts: allConflicts,
      warnings: missingFields.map((f) => `Category-relevant specification field "${f}" is not recorded in fact sheet`),
      missingFields,
      verifiedFields,
      unverifiedFields,
    },
    status,
    createdAt: now,
    lastVerifiedAt: now,
  };
}
