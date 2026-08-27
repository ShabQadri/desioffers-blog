/**
 * Media Model & Metadata Types
 *
 * Defines the core types for the DesiOffers media pipeline.
 *
 * MEDIA RIGHTS TERMINOLOGY:
 * - AI-generated:  source = 'ai-generated',  rightsStatus = 'original'
 * - User-provided: source = 'user-provided', rightsStatus = 'needs-review' (or 'authorized' once confirmed)
 * - Licensed:      source = 'licensed',       rightsStatus = 'authorized'
 * - Restricted:    rightsStatus = 'restricted' (publication is blocked)
 * - None:          source = 'none' (for products without authorized images)
 */

import type { ImageSource, ImageRightsStatus, ImageVariantRole } from '../authoring/types.js';

export type { ImageSource, ImageRightsStatus, ImageVariantRole };

export type MediaRole =
  | 'hero'
  | 'product'
  | 'category'
  | 'article'
  | 'author'
  | 'social';

export type SupportedImageMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/avif';

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: string;
}

export interface NormalizedMediaAsset {
  originalFilename: string;
  normalizedFilename: string;
  mimeType: SupportedImageMimeType;
  extension: string;
  sizeBytes: number;
  contentHash: string; // SHA-256 hex string
  dimensions: ImageDimensions;
  role: MediaRole;
  source: ImageSource;
  rightsStatus: ImageRightsStatus;
  altText: string;
  caption?: string;
  contextSlug: string; // Article or category slug
  buffer: Buffer;
}

export interface MediaRecord {
  r2Key: string;
  publicUrl: string;
  contentHash: string;
  originalFilename: string;
  normalizedFilename: string;
  mimeType: SupportedImageMimeType;
  sizeBytes: number;
  dimensions: ImageDimensions;
  role: MediaRole;
  source: ImageSource;
  rightsStatus: ImageRightsStatus;
  altText: string;
  contextSlug: string;
  createdAt: string; // ISO 8601
}

export interface MediaUploadResult {
  success: boolean;
  isDuplicate: boolean;
  r2Key: string;
  publicUrl: string;
  contentHash: string;
  dimensions: ImageDimensions;
  error?: string;
}
