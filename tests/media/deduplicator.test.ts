import { describe, it, expect } from 'vitest';
import { MediaDeduplicator } from '../../src/lib/media/deduplicator.js';
import type { MediaRecord } from '../../src/lib/media/types.js';

describe('Phase 4 — Media Deduplicator', () => {
  const sampleRecord: MediaRecord = {
    r2Key: 'articles/2026/08/air-fryer-guide/hero.webp',
    publicUrl: '/cdn-cgi/image/w=1200,f=auto/articles/2026/08/air-fryer-guide/hero.webp',
    contentHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    originalFilename: 'hero.png',
    normalizedFilename: 'air-fryer-guide-hero.webp',
    mimeType: 'image/webp',
    sizeBytes: 150000,
    dimensions: { width: 1600, height: 900, aspectRatio: '16/9' },
    role: 'hero',
    source: 'ai-generated',
    rightsStatus: 'original',
    altText: 'Air fryer on counter',
    contextSlug: 'air-fryer-guide',
    createdAt: new Date().toISOString(),
  };

  it('should detect duplicate when matching content hash is checked', () => {
    const deduplicator = new MediaDeduplicator([sampleRecord]);
    const check = deduplicator.check('8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4');

    expect(check.isDuplicate).toBe(true);
    expect(check.existingKey).toBe('articles/2026/08/air-fryer-guide/hero.webp');
    expect(check.existingUrl).toContain('/cdn-cgi/image/');
  });

  it('should return isDuplicate: false when hash does not exist', () => {
    const deduplicator = new MediaDeduplicator([sampleRecord]);
    const check = deduplicator.check('nonexistent_hash_1234567890');

    expect(check.isDuplicate).toBe(false);
    expect(check.existingKey).toBeUndefined();
  });

  it('should register new records dynamically', () => {
    const deduplicator = new MediaDeduplicator();
    expect(deduplicator.check(sampleRecord.contentHash).isDuplicate).toBe(false);

    deduplicator.register(sampleRecord);
    expect(deduplicator.check(sampleRecord.contentHash).isDuplicate).toBe(true);
  });
});
