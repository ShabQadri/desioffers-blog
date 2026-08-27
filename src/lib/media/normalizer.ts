/**
 * Media Normalizer
 *
 * Deterministic image normalization, binary inspection, content hashing,
 * and SEO-friendly filename generation.
 *
 * SAFETY RULES:
 * - Validates binary magic bytes (never trusts client headers alone).
 * - Enforces size limit (5 MB max).
 * - Rejects executables, scripts, HTML, and SVGs.
 * - Generates clean, meaningful filenames (no keyword stuffing, no camera noise).
 * - Calculates SHA-256 hash for deduplication.
 */

import crypto from 'crypto';
import path from 'path';
import type { SupportedImageMimeType, ImageDimensions, MediaRole } from './types.js';

export const MAX_MEDIA_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_MIME_TYPES: SupportedImageMimeType[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

// ---------------------------------------------------------------------------
// Binary Magic Bytes Validation
// ---------------------------------------------------------------------------

export function inspectImageMagicBytes(buffer: Buffer): { isValid: boolean; detectedMime?: SupportedImageMimeType; error?: string } {
  if (!buffer || buffer.length < 12) {
    return { isValid: false, error: 'File is empty or too small to be a valid image.' };
  }

  // 1. Check for dangerous executables & scripts
  // DOS / Windows PE executable: 'MZ'
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { isValid: false, error: 'Executable binary file rejected.' };
  }
  // ELF binary: 0x7F 'ELF'
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return { isValid: false, error: 'Executable binary file rejected.' };
  }

  // Text/HTML/Script inspection on first 128 bytes
  const headerText = buffer.subarray(0, Math.min(128, buffer.length)).toString('utf-8').toLowerCase();
  if (
    headerText.includes('<script') ||
    headerText.includes('<?php') ||
    headerText.includes('<!doctype html') ||
    headerText.includes('<html') ||
    headerText.includes('<svg')
  ) {
    return { isValid: false, error: 'HTML, SVG, or script content rejected.' };
  }

  // 2. Validate Image Magic Bytes
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, detectedMime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, detectedMime: 'image/png' };
  }

  // WebP: 'RIFF' .... 'WEBP'
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { isValid: true, detectedMime: 'image/webp' };
  }

  // AVIF: .... 'ftypavif' or 'ftypavis' or 'ftypmif1'
  if (buffer.length >= 16 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    const brand = buffer.subarray(8, 12).toString('ascii');
    if (brand === 'avif' || brand === 'avis' || brand === 'mif1' || brand === 'miaf') {
      return { isValid: true, detectedMime: 'image/avif' };
    }
  }

  return { isValid: false, error: 'Unsupported or corrupted image format. Only JPEG, PNG, WebP, AVIF are allowed.' };
}

// ---------------------------------------------------------------------------
// Dimension Extractor (Fast header parsing)
// ---------------------------------------------------------------------------

export function extractImageDimensions(buffer: Buffer, mime: SupportedImageMimeType): ImageDimensions {
  let width = 1200;
  let height = 800;

  try {
    if (mime === 'image/png' && buffer.length >= 24) {
      width = buffer.readUInt32BE(16);
      height = buffer.readUInt32BE(20);
    } else if (mime === 'image/jpeg' && buffer.length >= 10) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        const marker = buffer.readUInt16BE(offset);
        offset += 2;
        // SOF0, SOF1, SOF2 markers contain dimensions
        if ((marker >= 0xffc0 && marker <= 0xffc3) || (marker >= 0xffc5 && marker <= 0xffc7)) {
          height = buffer.readUInt16BE(offset + 3);
          width = buffer.readUInt16BE(offset + 5);
          break;
        } else if (marker === 0xffda || marker === 0xffd9) {
          break; // Start of scan or end of image
        } else {
          const length = buffer.readUInt16BE(offset);
          offset += length;
        }
      }
    } else if (mime === 'image/webp' && buffer.length >= 30) {
      // VP8 chunk
      if (buffer.subarray(12, 16).toString('ascii') === 'VP8 ') {
        width = buffer.readUInt16LE(26) & 0x3fff;
        height = buffer.readUInt16LE(28) & 0x3fff;
      } else if (buffer.subarray(12, 16).toString('ascii') === 'VP8X') {
        // Extended WebP
        width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
        height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
      }
    }
  } catch {
    // Fallback to default editorial dimensions if header parse fails
    width = 1200;
    height = 800;
  }

  // Calculate simple aspect ratio
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height) || 1;
  const aspectW = Math.round(width / divisor);
  const aspectH = Math.round(height / divisor);

  return {
    width,
    height,
    aspectRatio: `${aspectW}:${aspectH}`,
  };
}

// ---------------------------------------------------------------------------
// Content Hash (SHA-256)
// ---------------------------------------------------------------------------

export function calculateContentHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ---------------------------------------------------------------------------
// Filename Normalization
// ---------------------------------------------------------------------------

const CAMERA_PATTERNS = [
  /^img[_-]?\d+/i,
  /^dsc[_-]?\d+/i,
  /^pxl[_-]?\d+/i,
  /^screenshot[_-]?\d*/i,
  /^photo[_-]?\d*/i,
  /^image\s*\(\d+\)/i,
  /^untitled/i,
];

/**
 * Normalizes an uploaded filename into a clean, SEO-friendly name.
 *
 * Rules:
 * - Strips camera noise (IMG_1234, Screenshot 2026-08...)
 * - Incorporates context slug and role if present
 * - Lowercase, hyphens only
 * - Preserves correct extension
 * - Avoids duplicate consecutive terms and keyword stuffing
 */
export function normalizeFilename(params: {
  originalFilename: string;
  contextSlug?: string;
  role?: MediaRole;
  extensionOverride?: string;
}): string {
  const { originalFilename, contextSlug, role, extensionOverride } = params;

  const ext = (extensionOverride || path.extname(originalFilename) || '.webp').toLowerCase().replace(/^\./, '');
  const baseWithoutExt = path.basename(originalFilename, path.extname(originalFilename)).trim();

  // Check if filename is generic camera / screenshot noise
  const isCameraNoise = CAMERA_PATTERNS.some((pattern) => pattern.test(baseWithoutExt));

  if (isCameraNoise || !baseWithoutExt) {
    // Construct clean name from context slug and role
    const ctx = (contextSlug || 'media').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const r = role ? `-${role}` : '';
    return `${ctx}${r}.${ext}`.replace(/^-+|-+$/g, '');
  }

  // Clean the descriptive filename
  const cleanBase = baseWithoutExt
    .toLowerCase()
    .replace(/₹/g, 'rs')
    .replace(/(\d),(\d)/g, '$1$2')
    .replace(/[''""]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // If role is specified and not already in filename, append role suffix
  const hasRole = role && cleanBase.includes(role);
  const finalBase = role && !hasRole ? `${cleanBase}-${role}` : cleanBase;

  return `${finalBase}.${ext}`;
}

// ---------------------------------------------------------------------------
// Complete Media Normalizer Runner
// ---------------------------------------------------------------------------

export function normalizeMediaBuffer(params: {
  buffer: Buffer;
  originalFilename: string;
  contextSlug: string;
  role?: MediaRole;
  maxSizeBytes?: number;
}): {
  isValid: boolean;
  normalizedFilename?: string;
  contentHash?: string;
  dimensions?: ImageDimensions;
  mimeType?: SupportedImageMimeType;
  extension?: string;
  error?: string;
} {
  const { buffer, originalFilename, contextSlug, role = 'hero', maxSizeBytes = MAX_MEDIA_SIZE_BYTES } = params;

  // 1. Size Validation
  if (buffer.length > maxSizeBytes) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowed limit of ${maxMb} MB.`,
    };
  }

  // 2. Binary Magic Bytes Validation
  const magicCheck = inspectImageMagicBytes(buffer);
  if (!magicCheck.isValid || !magicCheck.detectedMime) {
    return {
      isValid: false,
      error: magicCheck.error || 'Invalid image file content.',
    };
  }

  const mimeType = magicCheck.detectedMime;
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'avif';

  // 3. Content Hash
  const contentHash = calculateContentHash(buffer);

  // 4. Normalized Filename
  const normalizedFilename = normalizeFilename({
    originalFilename,
    contextSlug,
    role,
    extensionOverride: ext,
  });

  // 5. Dimensions
  const dimensions = extractImageDimensions(buffer, mimeType);

  return {
    isValid: true,
    normalizedFilename,
    contentHash,
    dimensions,
    mimeType,
    extension: ext,
  };
}
