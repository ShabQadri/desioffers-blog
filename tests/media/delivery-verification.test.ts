import { describe, it, expect } from 'vitest';
import { onRequestGet as handleMediaGet } from '../../functions/media/[[path]].js';
import { onRequestGet as handleArticlesGet } from '../../functions/articles/[[path]].js';
import { IMAGE_VARIANTS, getImageAttributes, getImageUrl } from '../../src/utils/image.js';

describe('Phase 6 — Media Delivery & Verification', () => {
  describe('1. Pages Function Media Route (/media/[[path]])', () => {
    it('should return HTTP 503 if R2_BUCKET binding is missing', async () => {
      const res = await handleMediaGet({
        request: new Request('https://blog.desioffers.com/media/test.webp'),
        params: { path: ['test.webp'] },
        env: {},
      });
      expect(res.status).toBe(503);
    });

    it('should return HTTP 404 if requested object does not exist in R2', async () => {
      const mockEnv = {
        R2_BUCKET: {
          get: async () => null,
        },
      };
      const res = await handleMediaGet({
        request: new Request('https://blog.desioffers.com/media/missing.webp'),
        params: { path: ['missing.webp'] },
        env: mockEnv,
      });
      expect(res.status).toBe(404);
    });

    it('should serve R2 object with immutable Cache-Control and ETag when found', async () => {
      const mockBuffer = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
      const mockEnv = {
        R2_BUCKET: {
          get: async (key: string) => ({
            key,
            body: mockBuffer,
            httpEtag: '"etag-12345"',
            writeHttpMetadata: (_headers: Headers) => {},
          }),
        },
      };

      const res = await handleMediaGet({
        request: new Request('https://blog.desioffers.com/media/articles/2026/08/hero.webp'),
        params: { path: ['articles', '2026', '08', 'hero.webp'] },
        env: mockEnv,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
      expect(res.headers.get('ETag')).toBe('"etag-12345"');
      expect(res.headers.get('Content-Type')).toBe('image/webp');
    });

    it('should return HTTP 304 Not Modified on matching If-None-Match header', async () => {
      const mockEnv = {
        R2_BUCKET: {
          get: async (key: string) => ({
            key,
            httpEtag: '"etag-12345"',
            writeHttpMetadata: () => {},
          }),
        },
      };

      const req = new Request('https://blog.desioffers.com/media/test.webp', {
        headers: { 'If-None-Match': '"etag-12345"' },
      });

      const res = await handleMediaGet({
        request: req,
        params: { path: ['test.webp'] },
        env: mockEnv,
      });

      expect(res.status).toBe(304);
    });
  });

  describe('2. Articles Direct Route (/articles/[[path]])', () => {
    it('should prepend articles/ prefix and query R2 bucket correctly', async () => {
      let requestedKey = '';
      const mockEnv = {
        R2_BUCKET: {
          get: async (key: string) => {
            requestedKey = key;
            return {
              key,
              body: new Uint8Array([1, 2, 3]),
              httpEtag: '"test-etag"',
              writeHttpMetadata: () => {},
            };
          },
        },
      };

      const res = await handleArticlesGet({
        request: new Request('https://blog.desioffers.com/articles/2026/08/slug/hero.webp'),
        params: { path: ['2026', '08', 'slug', 'hero.webp'] },
        env: mockEnv,
      });

      expect(res.status).toBe(200);
      expect(requestedKey).toBe('articles/2026/08/slug/hero.webp');
    });
  });

  describe('3. Responsive Image Attributes & CLS Prevention', () => {
    it('should provide explicit width, height, and aspect ratio for all variants', () => {
      const variants = Object.keys(IMAGE_VARIANTS) as (keyof typeof IMAGE_VARIANTS)[];
      for (const variant of variants) {
        const attrs = getImageAttributes(variant);
        expect(attrs.width).toBeGreaterThan(0);
        expect(attrs.height).toBeGreaterThan(0);
        expect(attrs.style).toContain('aspect-ratio:');
      }
    });

    it('should generate valid Cloudflare Images transformation URLs', () => {
      const heroUrl = getImageUrl('articles/2026/08/slug/hero.webp', 'hero');
      expect(heroUrl).toContain('/cdn-cgi/image/');
      expect(heroUrl).toContain('w=1600');
      expect(heroUrl).toContain('articles/2026/08/slug/hero.webp');
    });
  });
});
