import { describe, it, expect } from 'vitest';
import { getImageUrl, getImageAttributes, FALLBACK_IMAGE_URL } from '../src/utils/image';

describe('Image Utility & Transformation Delivery', () => {
  it('should return fallback image URL when image source is null or empty', () => {
    expect(getImageUrl(null)).toBe(FALLBACK_IMAGE_URL);
    expect(getImageUrl(undefined)).toBe(FALLBACK_IMAGE_URL);
  });

  it('should return static local path directly if source starts with /', () => {
    const path = '/images/brand/logo.png';
    expect(getImageUrl(path)).toBe(path);
  });

  it('should generate Cloudflare transformation URL with controlled variant width for R2 object keys', () => {
    const key = 'articles/2026/08/hero.webp';
    const url = getImageUrl(key, 'hero');
    expect(url).toContain('/cdn-cgi/image/w=1600');
    expect(url).toContain('articles/2026/08/hero.webp');
  });

  it('should provide explicit width, height, and aspect ratio attributes to prevent CLS', () => {
    const attrs = getImageAttributes('card');
    expect(attrs.width).toBe(400);
    expect(attrs.height).toBe(267);
    expect(attrs.style).toContain('aspect-ratio');
  });
});
