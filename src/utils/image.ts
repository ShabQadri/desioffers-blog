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

/**
 * Fallback WebP / Data SVG image URL if an image fails or is missing.
 */
export const FALLBACK_IMAGE_URL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="700" fill="%2364748b">DesiOffers Guides</text></svg>`;

/**
 * Generates a public Cloudflare Images transformation URL for a private R2 object key.
 * Enforces controlled variant widths and protects private R2 bucket access.
 */
export function getImageUrl(sourceKey: string | undefined | null, variant: ImageVariant = 'card'): string {
  if (!sourceKey) {
    return FALLBACK_IMAGE_URL;
  }

  // If sourceKey is already a local static asset (e.g. starting with /images/)
  if (sourceKey.startsWith('/')) {
    return sourceKey;
  }

  const dimensions = IMAGE_VARIANTS[variant] || IMAGE_VARIANTS.card;
  const widthParam = `w=${dimensions.width}`;
  const fitParam = dimensions.height ? `h=${dimensions.height},fit=crop` : 'fit=scale-down';
  const formatParam = 'f=auto,q=85';

  // Cloudflare Images Transformation delivery URL structure:
  // https://blog.desioffers.com/cdn-cgi/image/w=800,fit=crop,f=auto/articles/2026/08/hero.webp
  const cleanKey = sourceKey.replace(/^\/+/, '');
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
