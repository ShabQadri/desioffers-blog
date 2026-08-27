/**
 * Media Resolver
 *
 * Centralized utility to resolve product and editorial image URLs,
 * enforce fallback rules, and provide CLS-prevention attributes.
 *
 * RULES:
 * - imageSource = 'none'         → returns null (imageless product presentation)
 * - imageSource = 'amazon-api'    → returns null while Creators API is disabled
 * - rightsStatus = 'restricted'  → returns null (strictly blocked from rendering)
 * - valid R2/ai-generated/licensed → returns transformed Cloudflare Images URL
 */

import { getImageUrl, getImageAttributes, type ImageVariant } from '../../utils/image.js';
import type { ImageSource, ImageRightsStatus } from './types.js';

export interface ResolvedImageResult {
  hasImage: boolean;
  src: string | null;
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  style?: string;
  isImageless: boolean;
}

export function resolveProductImage(params: {
  image?: string;
  imageAlt?: string;
  imageSource?: ImageSource;
  imageRightsStatus?: ImageRightsStatus;
  variant?: ImageVariant;
}): ResolvedImageResult {
  const { image, imageAlt = '', imageSource = 'none', imageRightsStatus, variant = 'medium' } = params;

  // 1. Check if restricted
  if (imageRightsStatus === 'restricted') {
    return {
      hasImage: false,
      src: null,
      alt: imageAlt,
      isImageless: true,
    };
  }

  // 2. Check if imageless or disabled API
  if (imageSource === 'none' || imageSource === 'amazon-api' || !image || image.trim() === '') {
    return {
      hasImage: false,
      src: null,
      alt: imageAlt,
      isImageless: true,
    };
  }

  // 3. Resolve R2, AI-generated, or licensed image
  const deliveryUrl = getImageUrl(image, variant);
  const attrs = getImageAttributes(variant);

  return {
    hasImage: true,
    src: deliveryUrl,
    alt: imageAlt,
    width: attrs.width,
    height: attrs.height,
    aspectRatio: attrs.style.replace('aspect-ratio: ', '').replace(';', ''),
    style: attrs.style,
    isImageless: false,
  };
}
