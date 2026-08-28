/**
 * Product Fact Sheet & Verification Types
 *
 * Defines the deterministic data structures for:
 * - Evidence-backed product specifications (category & product-aware)
 * - Source authority rankings
 * - Conflict detection records
 * - Product identity and claim verification
 */

import type { PriceVerificationState, AvailabilityVerificationState } from './types.js';

export type SourceType =
  | 'manufacturer'
  | 'official-documentation'
  | 'amazon'
  | 'reputable-retailer'
  | 'reputable-review'
  | 'manual'
  | 'other';

export type SourceAuthority =
  | 'manufacturer-official'       // Rank 1 (Highest)
  | 'official-documentation'     // Rank 1
  | 'amazon-listing'             // Rank 2
  | 'reputable-retailer-or-press'// Rank 3
  | 'secondary-source'           // Rank 4
  | 'manual-unverified';          // Rank 5 (Lowest)

export interface SourceRecord {
  id?: string;
  url?: string;
  sourceType: SourceType;
  authority: SourceAuthority;
  title?: string;
  retrievedAt: string; // ISO 8601
  evidence?: string;
  notes?: string;
}

export type FactStatus = 'verified' | 'unverified' | 'conflicted';
export type FactConfidence = 'high' | 'medium' | 'low';

export interface SpecificationFact<T = string | number | boolean> {
  field: string;
  label?: string;
  value: T;
  unit?: string;
  sourceId?: string;
  source: SourceRecord;
  confidence: FactConfidence;
  status: FactStatus;
  notes?: string;
}

export interface FactConflict {
  field: string;
  valueA: any;
  sourceA: SourceRecord;
  valueB: any;
  sourceB: SourceRecord;
  material: boolean;
  recommendedAction: string;
}

export interface ProductIdentity {
  asin: string;
  brand: string;
  productName: string;
  model: string;
  variant?: string;
  amazonUrl: string;
  canonicalAmazonUrl: string;
}

export interface ProductCategoryInfo {
  category?: string;
  subcategory?: string;
  productType?: string;
}

export interface ProductCommercialFacts {
  price?: string;
  priceVerification: PriceVerificationState;
  priceObservedAt?: string;
  availability?: string;
  availabilityVerification: AvailabilityVerificationState;
}

export type FactSheetLifecycleStatus =
  | 'FACTS_READY'
  | 'FACTS_CONFLICTED'
  | 'FACTS_UNVERIFIED'
  | 'IDENTITY_BLOCKED'
  | 'READY_FOR_EDITORIAL_WRITING';

export type IdentityStatus = 'verified' | 'unverified' | 'mismatch' | 'blocked';

export interface ProductFactSheetVerification {
  identityStatus: IdentityStatus;
  factStatus: 'facts_ready' | 'facts_conflicted' | 'facts_unverified';
  conflicts: FactConflict[];
  warnings: string[];
  missingFields: string[];
  verifiedFields: string[];
  unverifiedFields: string[];
}

export interface ProductFactSheet {
  asin: string;
  identity: ProductIdentity;
  categoryInfo?: ProductCategoryInfo;
  specifications: Record<string, SpecificationFact>;
  commercial: ProductCommercialFacts;
  sources: SourceRecord[];
  verification: ProductFactSheetVerification;
  status: FactSheetLifecycleStatus;
  createdAt: string;
  lastVerifiedAt: string;
}

export interface FactSheetBuilderInput {
  asin: string;
  identity: Omit<ProductIdentity, 'canonicalAmazonUrl' | 'amazonUrl'> & {
    amazonUrl?: string;
    canonicalAmazonUrl?: string;
  };
  categoryInfo?: ProductCategoryInfo;
  specifications?: Record<string, SpecificationFact | {
    field?: string;
    label?: string;
    value: string | number | boolean;
    unit?: string;
    source: SourceRecord;
    confidence?: FactConfidence;
    status?: FactStatus;
    notes?: string;
  }>;
  commercial?: Partial<ProductCommercialFacts>;
  sources?: SourceRecord[];
  conflicts?: FactConflict[];
}

export interface ProductClaimVerificationIssue {
  field: string;
  severity: 'BLOCKER' | 'WARNING' | 'PASS';
  code:
    | 'PRODUCT_IDENTITY_MATCH'
    | 'PRODUCT_IDENTITY_MISMATCH'
    | 'PRODUCT_IDENTITY_UNVERIFIED'
    | 'MISSING_FACT_SHEET'
    | 'ARTICLE_FACT_MATCH'
    | 'ARTICLE_FACT_MISMATCH'
    | 'UNAPPROVED_FACT_CLAIM'
    | 'FACT_CONFLICT'
    | 'UNKNOWN_NON_MATERIAL_FIELD';
  message: string;
  expected?: any;
  actual?: any;
}

export interface ProductClaimVerificationResult {
  asin: string;
  productName: string;
  hasBlockers: boolean;
  hasWarnings: boolean;
  identityVerified: boolean;
  issues: ProductClaimVerificationIssue[];
  verifiedFactsCount: number;
  unverifiedFactsCount: number;
  conflictsCount: number;
}
