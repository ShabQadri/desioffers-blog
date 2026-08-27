import { describe, it, expect } from 'vitest';
import {
  inspectImageMagicBytes,
  normalizeFilename,
  calculateContentHash,
  extractImageDimensions,
  normalizeMediaBuffer,
  MAX_MEDIA_SIZE_BYTES,
} from '../../src/lib/media/normalizer.js';

describe('Phase 4 — Media Normalizer & Binary Inspection', () => {
  // Mock image binary buffers
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x00, 0x00]);
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
  const webpHeader = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20]);
  const avifHeader = Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66, 0x00, 0x00, 0x00, 0x00]);

  // Malicious buffers
  const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
  const htmlBuffer = Buffer.from('<!doctype html><html><script>alert(1)</script></html>', 'utf-8');
  const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>', 'utf-8');

  describe('1. Binary Magic Bytes Validation', () => {
    it('should validate valid JPEG binary headers', () => {
      const res = inspectImageMagicBytes(jpegHeader);
      expect(res.isValid).toBe(true);
      expect(res.detectedMime).toBe('image/jpeg');
    });

    it('should validate valid PNG binary headers', () => {
      const res = inspectImageMagicBytes(pngHeader);
      expect(res.isValid).toBe(true);
      expect(res.detectedMime).toBe('image/png');
    });

    it('should validate valid WebP binary headers', () => {
      const res = inspectImageMagicBytes(webpHeader);
      expect(res.isValid).toBe(true);
      expect(res.detectedMime).toBe('image/webp');
    });

    it('should validate valid AVIF binary headers', () => {
      const res = inspectImageMagicBytes(avifHeader);
      expect(res.isValid).toBe(true);
      expect(res.detectedMime).toBe('image/avif');
    });

    it('should reject Windows PE / DOS executables (MZ)', () => {
      const res = inspectImageMagicBytes(exeBuffer);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Executable');
    });

    it('should reject HTML, script, and SVG text disguised as images', () => {
      expect(inspectImageMagicBytes(htmlBuffer).isValid).toBe(false);
      expect(inspectImageMagicBytes(svgBuffer).isValid).toBe(false);
    });
  });

  describe('2. Filename Normalization', () => {
    it('should strip camera noise and format clean SEO name', () => {
      const name = normalizeFilename({
        originalFilename: 'IMG_20260827_123456.jpg',
        contextSlug: 'best-gaming-keyboards-under-5000',
        role: 'hero',
      });
      expect(name).toBe('best-gaming-keyboards-under-5000-hero.jpg');
    });

    it('should strip screenshot timestamps and format clean name', () => {
      const name = normalizeFilename({
        originalFilename: 'Screenshot 2026-08-27 at 12.30 PM.png',
        contextSlug: 'air-fryers-review',
        role: 'hero',
      });
      expect(name).toBe('air-fryers-review-hero.png');
    });

    it('should sanitize special characters from descriptive filenames', () => {
      const name = normalizeFilename({
        originalFilename: 'Best Gaming Keyboard Under ₹5,000!!.webp',
        role: 'hero',
      });
      expect(name).toBe('best-gaming-keyboard-under-rs5000-hero.webp');
    });
  });

  describe('3. Content Hashing & Dimensions', () => {
    it('should calculate deterministic SHA-256 hash', () => {
      const hash1 = calculateContentHash(pngHeader);
      const hash2 = calculateContentHash(pngHeader);
      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
    });

    it('should extract dimensions and calculate aspect ratio', () => {
      const dims = extractImageDimensions(pngHeader, 'image/png');
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
      expect(dims.aspectRatio).toBeDefined();
    });
  });

  describe('4. Complete Media Buffer Runner', () => {
    it('should reject oversized buffers exceeding 5MB limit', () => {
      const oversized = Buffer.alloc(MAX_MEDIA_SIZE_BYTES + 1024);
      const res = normalizeMediaBuffer({
        buffer: oversized,
        originalFilename: 'photo.jpg',
        contextSlug: 'article-slug',
      });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('exceeds maximum allowed limit');
    });

    it('should normalize and process valid image buffer', () => {
      const res = normalizeMediaBuffer({
        buffer: webpHeader,
        originalFilename: 'IMG_9999.webp',
        contextSlug: 'best-tws-earbuds',
        role: 'hero',
      });
      expect(res.isValid).toBe(true);
      expect(res.mimeType).toBe('image/webp');
      expect(res.normalizedFilename).toBe('best-tws-earbuds-hero.webp');
      expect(res.contentHash).toBeDefined();
    });
  });
});
