/**
 * Media Metadata Manifest & Record Builder
 *
 * Manages media metadata, rights status defaults, and publishability checks.
 *
 * PROVENANCE RULES:
 * - source = 'ai-generated'  → default rights = 'original' (we own the output)
 * - source = 'user-provided' → default rights = 'needs-review' (requires human confirmation)
 * - source = 'licensed'      → default rights = 'authorized'
 * - rights = 'restricted'    → publication is blocked
 * - source = 'none'          → imageless card presentation
 */

import type {
  MediaRecord,
  NormalizedMediaAsset,
  ImageSource,
  ImageRightsStatus,
  MediaRole,
  ImageDimensions,
} from './types.js';

export function getDefaultRightsForSource(source: ImageSource): ImageRightsStatus {
  switch (source) {
    case 'ai-generated':
      return 'original';
    case 'licensed':
      return 'authorized';
    case 'user-provided':
      return 'needs-review';
    case 'amazon-api':
    case 'r2':
    case 'none':
    default:
      return 'original';
  }
}

export function isRightsStatusPublishable(rightsStatus?: ImageRightsStatus): boolean {
  if (!rightsStatus) return true; // Default to true if unconfigured
  if (rightsStatus === 'restricted') return false;
  return true;
}

export function buildMediaRecord(params: {
  r2Key: string;
  publicUrl: string;
  contentHash: string;
  originalFilename: string;
  normalizedFilename: string;
  mimeType: NormalizedMediaAsset['mimeType'];
  sizeBytes: number;
  dimensions: ImageDimensions;
  role: MediaRole;
  source: ImageSource;
  rightsStatus?: ImageRightsStatus;
  altText: string;
  contextSlug: string;
}): MediaRecord {
  const {
    r2Key,
    publicUrl,
    contentHash,
    originalFilename,
    normalizedFilename,
    mimeType,
    sizeBytes,
    dimensions,
    role,
    source,
    rightsStatus,
    altText,
    contextSlug,
  } = params;

  return {
    r2Key,
    publicUrl,
    contentHash,
    originalFilename,
    normalizedFilename,
    mimeType,
    sizeBytes,
    dimensions,
    role,
    source,
    rightsStatus: rightsStatus || getDefaultRightsForSource(source),
    altText,
    contextSlug,
    createdAt: new Date().toISOString(),
  };
}
