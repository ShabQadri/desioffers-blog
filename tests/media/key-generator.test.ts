import { describe, it, expect } from 'vitest';
import { generateR2ObjectKey, sanitizePathSegment } from '../../src/lib/media/key-generator.js';

describe('Phase 4 — R2 Object Key Generator', () => {
  const fixedDate = new Date('2026-08-27T10:00:00.000Z');

  it('should generate deterministic category key', () => {
    const key = generateR2ObjectKey({
      role: 'category',
      contextSlug: 'gaming',
      extension: 'webp',
    });
    expect(key).toBe('categories/gaming/category.webp');
  });

  it('should generate deterministic author key', () => {
    const key = generateR2ObjectKey({
      role: 'author',
      contextSlug: 'shaaz',
      extension: 'webp',
    });
    expect(key).toBe('authors/shaaz/avatar.webp');
  });

  it('should generate deterministic article hero key', () => {
    const key = generateR2ObjectKey({
      role: 'hero',
      contextSlug: 'best-gaming-keyboards-under-5000',
      extension: 'webp',
      date: fixedDate,
    });
    expect(key).toBe('articles/2026/08/best-gaming-keyboards-under-5000/hero.webp');
  });

  it('should generate deterministic article product key with content hash', () => {
    const key = generateR2ObjectKey({
      role: 'product',
      contextSlug: 'best-gaming-keyboards-under-5000',
      extension: 'png',
      date: fixedDate,
      contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    });
    expect(key).toBe('articles/2026/08/best-gaming-keyboards-under-5000/product-e3b0c442.png');
  });

  it('should sanitize path segments and block path traversal attempts', () => {
    const sanitized = sanitizePathSegment('../../etc/passwd/../evil_dir//');
    expect(sanitized).not.toContain('..');
    expect(sanitized).not.toContain('/');
    expect(sanitized).toBe('etc-passwd-evil-dir');
  });
});
