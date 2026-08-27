import { describe, it, expect } from 'vitest';
import { MediaManifest } from '../../src/lib/media/manifest.js';
import type { MediaRecord } from '../../src/lib/media/types.js';

describe('Phase 5 — Media Manifest', () => {
  const sampleRecords: MediaRecord[] = [
    {
      r2Key: 'articles/2026/08/best-gaming-keyboards-under-5000/hero.webp',
      publicUrl: '/cdn-cgi/image/w=1600,f=auto/articles/2026/08/best-gaming-keyboards-under-5000/hero.webp',
      contentHash: 'hash1234567890abcdef',
      originalFilename: 'hero.webp',
      normalizedFilename: 'best-gaming-keyboards-under-5000-hero.webp',
      mimeType: 'image/webp',
      sizeBytes: 300000,
      dimensions: { width: 1600, height: 900, aspectRatio: '16/9' },
      role: 'hero',
      source: 'ai-generated',
      rightsStatus: 'original',
      altText: 'Gaming keyboard with RGB',
      contextSlug: 'best-gaming-keyboards-under-5000',
      createdAt: '2026-08-27T00:00:00.000Z',
    },
    {
      r2Key: 'categories/gaming/category.webp',
      publicUrl: '/cdn-cgi/image/w=1200,f=auto/categories/gaming/category.webp',
      contentHash: 'cat_hash1234567890',
      originalFilename: 'gaming-category.webp',
      normalizedFilename: 'gaming-category.webp',
      mimeType: 'image/webp',
      sizeBytes: 250000,
      dimensions: { width: 1200, height: 800, aspectRatio: '3/2' },
      role: 'category',
      source: 'ai-generated',
      rightsStatus: 'original',
      altText: 'Gaming desk setup',
      contextSlug: 'gaming',
      createdAt: '2026-08-27T00:00:00.000Z',
    },
    {
      r2Key: 'articles/2026/08/best-gaming-keyboards-under-5000/product-k552.png',
      publicUrl: '/cdn-cgi/image/w=1000,f=auto/articles/2026/08/best-gaming-keyboards-under-5000/product-k552.png',
      contentHash: 'prod_hash1234567890',
      originalFilename: 'k552.png',
      normalizedFilename: 'best-gaming-keyboards-under-5000-product-k552.png',
      mimeType: 'image/png',
      sizeBytes: 400000,
      dimensions: { width: 1000, height: 1000, aspectRatio: '1/1' },
      role: 'product',
      source: 'user-provided',
      rightsStatus: 'needs-review',
      altText: 'Redragon K552 keyboard',
      contextSlug: 'best-gaming-keyboards-under-5000',
      createdAt: '2026-08-27T00:00:00.000Z',
    },
  ];

  it('should store and retrieve media records by R2 key', () => {
    const manifest = new MediaManifest(sampleRecords);
    const hero = manifest.getRecordByKey('articles/2026/08/best-gaming-keyboards-under-5000/hero.webp');
    expect(hero).toBeDefined();
    expect(hero?.source).toBe('ai-generated');
  });

  it('should query media records by article slug', () => {
    const manifest = new MediaManifest(sampleRecords);
    const articleAssets = manifest.getRecordsByArticle('best-gaming-keyboards-under-5000');
    expect(articleAssets.length).toBe(2);
  });

  it('should query category assets', () => {
    const manifest = new MediaManifest(sampleRecords);
    const catAssets = manifest.getRecordsByCategory('gaming');
    expect(catAssets.length).toBe(1);
    expect(catAssets[0].role).toBe('category');
  });

  it('should filter assets by rights status', () => {
    const manifest = new MediaManifest(sampleRecords);
    const reviewRequired = manifest.getRecordsByRightsStatus('needs-review');
    expect(reviewRequired.length).toBe(1);
    expect(reviewRequired[0].source).toBe('user-provided');
  });
});
