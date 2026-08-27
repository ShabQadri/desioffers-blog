import { describe, it, expect } from 'vitest';
import { resolveProductImage } from '../../src/lib/media/resolver.js';

describe('Phase 4 — Media Resolver & Fallbacks', () => {
  it('should return isImageless: true when imageSource is none', () => {
    const res = resolveProductImage({
      image: '/images/products/item.webp',
      imageSource: 'none',
      imageAlt: 'Sample item',
    });

    expect(res.hasImage).toBe(false);
    expect(res.src).toBeNull();
    expect(res.isImageless).toBe(true);
  });

  it('should return isImageless: true when imageSource is amazon-api (while disabled)', () => {
    const res = resolveProductImage({
      image: '',
      imageSource: 'amazon-api',
      imageAlt: 'Amazon product',
    });

    expect(res.hasImage).toBe(false);
    expect(res.src).toBeNull();
    expect(res.isImageless).toBe(true);
  });

  it('should block rendering and return null when imageRightsStatus is restricted', () => {
    const res = resolveProductImage({
      image: 'articles/2026/08/test/product.webp',
      imageSource: 'r2',
      imageRightsStatus: 'restricted',
    });

    expect(res.hasImage).toBe(false);
    expect(res.src).toBeNull();
    expect(res.isImageless).toBe(true);
  });

  it('should resolve transformed delivery URL and provide CLS attributes for valid R2 images', () => {
    const res = resolveProductImage({
      image: 'articles/2026/08/best-gaming-keyboards/product-k552.webp',
      imageSource: 'r2',
      imageRightsStatus: 'original',
      variant: 'medium',
      imageAlt: 'Redragon K552',
    });

    expect(res.hasImage).toBe(true);
    expect(res.isImageless).toBe(false);
    expect(res.src).toContain('/cdn-cgi/image/w=800');
    expect(res.src).toContain('product-k552.webp');
    expect(res.width).toBe(800);
    expect(res.height).toBe(533);
    expect(res.style).toContain('aspect-ratio');
  });
});
