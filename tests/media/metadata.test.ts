import { describe, it, expect } from 'vitest';
import {
  getDefaultRightsForSource,
  isRightsStatusPublishable,
  buildMediaRecord,
} from '../../src/lib/media/metadata.js';

describe('Phase 4 — Media Metadata & Provenance Model', () => {
  it('should map ai-generated media to default rights original', () => {
    expect(getDefaultRightsForSource('ai-generated')).toBe('original');
  });

  it('should map user-provided media to default rights needs-review', () => {
    expect(getDefaultRightsForSource('user-provided')).toBe('needs-review');
  });

  it('should map licensed media to default rights authorized', () => {
    expect(getDefaultRightsForSource('licensed')).toBe('authorized');
  });

  it('should identify restricted rights status as non-publishable', () => {
    expect(isRightsStatusPublishable('restricted')).toBe(false);
    expect(isRightsStatusPublishable('original')).toBe(true);
    expect(isRightsStatusPublishable('authorized')).toBe(true);
  });

  it('should build a complete MediaRecord manifest structure', () => {
    const record = buildMediaRecord({
      r2Key: 'articles/2026/08/article-slug/hero.webp',
      publicUrl: '/cdn-cgi/image/w=1200,f=auto/articles/2026/08/article-slug/hero.webp',
      contentHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      originalFilename: 'hero_image.png',
      normalizedFilename: 'article-slug-hero.webp',
      mimeType: 'image/webp',
      sizeBytes: 250000,
      dimensions: { width: 1600, height: 900, aspectRatio: '16/9' },
      role: 'hero',
      source: 'ai-generated',
      rightsStatus: 'original',
      altText: 'Clean modern desk setup with RGB keyboard',
      contextSlug: 'article-slug',
    });

    expect(record.r2Key).toContain('hero.webp');
    expect(record.source).toBe('ai-generated');
    expect(record.rightsStatus).toBe('original');
    expect(record.dimensions.width).toBe(1600);
    expect(record.createdAt).toBeDefined();
  });
});
