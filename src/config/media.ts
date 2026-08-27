/**
 * Media Configuration & Centralized Dimensions
 *
 * Centralized specifications for all image roles used in DesiOffers Guides.
 * Components, normalizers, and brief generators must reference these values
 * rather than hard-coding dimensions across the codebase.
 */

import type { MediaRole } from '../lib/media/types.js';

export interface ImageRoleSpec {
  role: MediaRole;
  width: number;
  height: number;
  aspectRatio: string;
  maxSizeBytes: number;
  description: string;
}

export const MEDIA_ROLE_SPECS: Record<MediaRole, ImageRoleSpec> = {
  hero: {
    role: 'hero',
    width: 1600,
    height: 900,
    aspectRatio: '16/9',
    maxSizeBytes: 5 * 1024 * 1024,
    description: 'Article header banner editorial image',
  },
  category: {
    role: 'category',
    width: 1200,
    height: 800,
    aspectRatio: '3/2',
    maxSizeBytes: 5 * 1024 * 1024,
    description: 'Category hub and category card visual',
  },
  article: {
    role: 'article',
    width: 1200,
    height: 800,
    aspectRatio: '3/2',
    maxSizeBytes: 5 * 1024 * 1024,
    description: 'Inline article illustration / comparison figure',
  },
  product: {
    role: 'product',
    width: 1000,
    height: 1000,
    aspectRatio: '1/1',
    maxSizeBytes: 5 * 1024 * 1024,
    description: 'Square product card illustration or authorized product image',
  },
  social: {
    role: 'social',
    width: 1200,
    height: 630,
    aspectRatio: '1.91/1',
    maxSizeBytes: 5 * 1024 * 1024,
    description: 'Open Graph (OG) / Twitter social share banner',
  },
  author: {
    role: 'author',
    width: 400,
    height: 400,
    aspectRatio: '1/1',
    maxSizeBytes: 2 * 1024 * 1024,
    description: 'Square author headshot / editorial avatar',
  },
};

export const STANDARD_NEGATIVE_PROMPT =
  'no logos, no text overlay, no watermarks, no brand names, no product model numbers, ' +
  'no packaging, no low-resolution artifacts, no blurry details, no people faces close-up, ' +
  'no fake commercial badges, no stock photo watermarks';
