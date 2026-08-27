/**
 * R2 Object Key Generator
 *
 * Generates deterministic, collision-resistant storage keys for the private
 * `desioffers-media` R2 bucket.
 *
 * RULES:
 * - Sanitizes all path segments (prevents path traversal, no `..`, no leading slashes).
 * - Stable, clean hierarchical paths based on media role:
 *     articles/{YYYY}/{MM}/{article-slug}/{role}.{ext}
 *     categories/{category-slug}/category.{ext}
 *     authors/{author-slug}/avatar.{ext}
 *     social/{article-slug}/og.{ext}
 * - Never includes user-supplied un-sanitized paths.
 */

import type { MediaRole } from './types.js';

export function sanitizePathSegment(segment: string): string {
  return segment
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateR2ObjectKey(params: {
  role: MediaRole;
  contextSlug: string;
  extension?: string;
  date?: Date;
  contentHash?: string;
  customFilename?: string;
}): string {
  const { role, contextSlug, extension = 'webp', date = new Date(), contentHash, customFilename } = params;

  const cleanSlug = sanitizePathSegment(contextSlug) || 'media';
  const cleanExt = (extension.startsWith('.') ? extension.slice(1) : extension).toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  switch (role) {
    case 'category':
      return `categories/${cleanSlug}/category.${cleanExt}`;

    case 'author':
      return `authors/${cleanSlug}/avatar.${cleanExt}`;

    case 'social':
      return `social/${cleanSlug}/og.${cleanExt}`;

    case 'hero':
      return `articles/${year}/${month}/${cleanSlug}/hero.${cleanExt}`;

    case 'product':
      const prodName = customFilename ? sanitizePathSegment(customFilename) : contentHash ? contentHash.slice(0, 8) : 'item';
      return `articles/${year}/${month}/${cleanSlug}/product-${prodName}.${cleanExt}`;

    case 'article':
    default:
      const name = customFilename ? sanitizePathSegment(customFilename) : contentHash ? contentHash.slice(0, 8) : 'inline';
      return `articles/${year}/${month}/${cleanSlug}/${name}.${cleanExt}`;
  }
}
