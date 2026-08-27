/**
 * AI Image Generation & Ingestion Interface
 *
 * Provides a decoupled abstraction for ingesting and processing AI-generated
 * and user-supplied images.
 *
 * ARCHITECTURAL BOUNDARY:
 * - Antigravity (the AI agent) orchestrates image generation using its agent tools.
 * - This module defines the deterministic ingestion pipeline:
 *     Input Buffer / Local File
 *             ↓
 *     Binary Normalizer & Hashing (Magic bytes, SHA-256)
 *             ↓
 *     SEO Filename & Metadata Attachment
 *             ↓
 *     Deduplication Check
 *             ↓
 *     Authenticated R2 Upload via /api/upload
 */

import fs from 'fs';
import type { DetailedImageBrief } from './brief.js';
import { normalizeMediaBuffer } from './normalizer.js';
import { buildMediaRecord } from './metadata.js';
import { generateR2ObjectKey } from './key-generator.js';
import type { MediaRecord, SupportedImageMimeType } from './types.js';

export interface IngestedImageResult {
  isValid: boolean;
  mediaRecord?: MediaRecord;
  buffer?: Buffer;
  error?: string;
}

/**
 * Pluggable Generator Adapter interface for future automated image generation providers.
 */
export interface ImageGeneratorAdapter {
  name: string;
  generateImage(brief: DetailedImageBrief): Promise<{ buffer: Buffer; mimeType: SupportedImageMimeType }>;
}

/**
 * Ingests an image buffer (from Antigravity generation or memory) and builds a normalized MediaRecord.
 */
export function ingestImageBuffer(params: {
  buffer: Buffer;
  brief: DetailedImageBrief;
}): IngestedImageResult {
  const { buffer, brief } = params;

  // 1. Normalize and inspect binary buffer
  const normResult = normalizeMediaBuffer({
    buffer,
    originalFilename: brief.filename,
    contextSlug: brief.contextSlug,
    role: brief.role,
  });

  if (!normResult.isValid || !normResult.contentHash || !normResult.dimensions || !normResult.mimeType) {
    return {
      isValid: false,
      error: normResult.error || 'Failed to normalize image buffer.',
    };
  }

  // 2. Generate deterministic R2 Key
  const r2Key = generateR2ObjectKey({
    role: brief.role,
    contextSlug: brief.contextSlug,
    extension: normResult.extension,
    contentHash: normResult.contentHash,
  });

  const publicUrl = `/cdn-cgi/image/w=${brief.targetDimensions.width},f=auto,q=85/${r2Key}`;

  // 3. Build comprehensive MediaRecord
  const mediaRecord = buildMediaRecord({
    r2Key,
    publicUrl,
    contentHash: normResult.contentHash,
    originalFilename: brief.filename,
    normalizedFilename: normResult.normalizedFilename || brief.filename,
    mimeType: normResult.mimeType,
    sizeBytes: buffer.length,
    dimensions: normResult.dimensions,
    role: brief.role,
    source: brief.provenance,
    rightsStatus: brief.rightsStatus,
    altText: brief.altText,
    contextSlug: brief.contextSlug,
  });

  return {
    isValid: true,
    mediaRecord,
    buffer,
  };
}

/**
 * Ingests a local file from disk and processes it through the media pipeline.
 */
export function ingestLocalFile(params: {
  filePath: string;
  brief: DetailedImageBrief;
}): IngestedImageResult {
  const { filePath, brief } = params;

  if (!fs.existsSync(filePath)) {
    return {
      isValid: false,
      error: `File not found at path: ${filePath}`,
    };
  }

  const buffer = fs.readFileSync(filePath);
  return ingestImageBuffer({ buffer, brief });
}
