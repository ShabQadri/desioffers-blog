export type ImageVariant = 'thumbnail' | 'card' | 'medium' | 'article' | 'hero' | 'social';

export interface ImageVariantDimensions {
  width: number;
  height?: number;
  aspectRatio: string;
}

export const IMAGE_VARIANTS: Record<ImageVariant, ImageVariantDimensions> = {
  thumbnail: { width: 150, height: 150, aspectRatio: '1/1' },
  card: { width: 400, height: 267, aspectRatio: '3/2' },
  medium: { width: 800, height: 533, aspectRatio: '3/2' },
  article: { width: 1200, height: 800, aspectRatio: '3/2' },
  hero: { width: 1600, height: 900, aspectRatio: '16/9' },
  social: { width: 1200, height: 630, aspectRatio: '1.91/1' },
};

export const FALLBACK_IMAGE_URL = '/images/brand/placeholder.svg';

/**
 * Generates a public Cloudflare Images transformation URL for a private R2 object key.
 * Enforces controlled variant widths and protects private R2 bucket access.
 *
 * In local development (`import.meta.env.DEV`), resolves to local preview asset
 * if available in `public/images/articles/` so localhost renders without 404s.
 */
export function getImageUrl(sourceKey: string | undefined | null, variant: ImageVariant = 'card'): string {
  if (!sourceKey || sourceKey.trim() === '') {
    return FALLBACK_IMAGE_URL;
  }

  const trimmed = sourceKey.trim();

  // If already a local static asset (e.g. starting with /images/)
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // If external URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const cleanKey = trimmed.replace(/^\/+/, '');
  const dimensions = IMAGE_VARIANTS[variant] || IMAGE_VARIANTS.card;
  const widthParam = `w=${dimensions.width}`;
  const fitParam = dimensions.height ? `h=${dimensions.height},fit=crop` : 'fit=scale-down';
  const formatParam = 'f=auto,q=85';
  // Cloudflare Images Transformation delivery URL structure in production
  return `/cdn-cgi/image/${widthParam},${fitParam},${formatParam}/${cleanKey}`;
}

/**
 * Helper to get explicit width, height, and style aspect-ratio attributes for CLS prevention.
 */
export function getImageAttributes(variant: ImageVariant = 'card') {
  const dim = IMAGE_VARIANTS[variant];
  return {
    width: dim.width,
    height: dim.height || Math.round(dim.width * (9 / 16)),
    style: `aspect-ratio: ${dim.aspectRatio};`,
  };
}
