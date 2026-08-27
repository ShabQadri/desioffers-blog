/**
 * Central Quality Pipeline Types
 *
 * Defines the data structures for the DesiOffers unified article quality engine.
 * Supports PASS / WARNING / BLOCKER severity levels and produces both human-readable
 * and machine-readable review objects.
 */

import type { MediaVerificationResult } from '../media/verifier.js';

export type CheckSeverity = 'PASS' | 'WARNING' | 'BLOCKER';

export type ArticleReviewStatus =
  | 'READY_FOR_REVIEW'
  | 'HAS_WARNINGS'
  | 'BLOCKED';

export interface QualityCheckItem {
  id: string;
  name: string;
  category:
    | 'SEO'
    | 'TAXONOMY'
    | 'AUTHOR'
    | 'STRUCTURE'
    | 'PRODUCTS'
    | 'PRODUCT_VERIFICATION'
    | 'MEDIA'
    | 'AFFILIATE'
    | 'ANTI_FABRICATION';
  severity: CheckSeverity;
  message: string;
  details?: string[];
}

export interface ArticleQualityReport {
  slug: string;
  title: string;
  articleType: string;
  status: ArticleReviewStatus;
  isPublishable: boolean;
  summary: {
    totalChecks: number;
    passCount: number;
    warningCount: number;
    blockerCount: number;
  };
  checks: QualityCheckItem[];
  blockers: string[];
  warnings: string[];
  metadata: {
    category: string;
    subcategory?: string;
    author: string;
    productCount: number;
    imagelessProductCount: number;
    affiliateLinkCount: number;
    heroImageStatus: string;
    heroMediaVerification?: MediaVerificationResult;
    evaluatedAt: string;
  };
}
