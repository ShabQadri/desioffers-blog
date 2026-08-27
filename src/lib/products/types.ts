/**
 * Product Data Model & Provider Types
 *
 * Defines the unified NormalizedProduct data structure and provider abstraction
 * for DesiOffers Guides.
 *
 * ARCHITECTURAL DESIGN:
 * - Provider-agnostic: The article system consumes NormalizedProduct regardless
 *   of whether data comes from manual entry, future Amazon API, or other sources.
 * - Imageless-ready: Fully supports products with `imageSource = 'none'` and no image.
 * - Explicit verification states for pricing and stock (prevents fabricated claims).
 */

import type {
  ImageSource,
  ImageRightsStatus,
  PriceVerificationState,
  AvailabilityVerificationState,
} from '../authoring/types.js';

export type { PriceVerificationState, AvailabilityVerificationState };

export type ProductDataSource =
  | 'manual'
  | 'amazon-creators-api'
  | 'user-provided'
  | 'licensed'
  | 'web-research';

export type ProductProviderStatus =
  | 'NOT_CONFIGURED'
  | 'READY'
  | 'DISABLED'
  | 'ERROR';

export interface AmazonUrlInput {
  url: string;
  price?: string;
  badge?: string;
  ranking?: number;
}

export interface NormalizedProduct {
  position: number;
  name: string;
  brand: string;
  model?: string;
  asin?: string;
  url: string;
  affiliateUrl: string;
  image?: string;
  imageAlt?: string;
  imageSource: ImageSource;
  imageRightsStatus?: ImageRightsStatus;
  editorialBadge?: string;
  shortDescription: string;
  bestFor: string;
  pros: string[];
  cons: string[];
  priceDisplay?: string;
  priceObservedAt?: string;
  priceVerification: PriceVerificationState;
  availabilityNote?: string;
  availabilityVerification: AvailabilityVerificationState;
  specifications?: Record<string, string>;
  source: ProductDataSource;
  researchNote?: string;
  retrievedAt: string; // ISO 8601
}

export interface ManualProductInput {
  position?: number;
  name: string;
  brand: string;
  model?: string;
  asin?: string;
  url?: string;
  affiliateUrl?: string;
  image?: string;
  imageAlt?: string;
  imageSource?: ImageSource;
  imageRightsStatus?: ImageRightsStatus;
  editorialBadge?: string;
  shortDescription: string;
  bestFor: string;
  pros: string[];
  cons: string[];
  priceDisplay?: string;
  priceObservedAt?: string;
  priceVerification?: PriceVerificationState;
  availabilityNote?: string;
  availabilityVerification?: AvailabilityVerificationState;
  specifications?: Record<string, string>;
  source?: ProductDataSource;
  researchNote?: string;
}

export interface ProductProvider {
  name: string;
  status(): ProductProviderStatus;
  getProductByAsin(asin: string): Promise<NormalizedProduct | null>;
  searchProducts(query: string): Promise<NormalizedProduct[]>;
}
