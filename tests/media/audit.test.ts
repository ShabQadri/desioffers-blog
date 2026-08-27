import { describe, it, expect } from 'vitest';
import {
  classifyMediaUrl,
  auditArticleMedia,
  auditAllArticlesMedia,
  formatMediaAuditReport,
} from '../../src/lib/media/audit.js';

describe('Phase 5 — Media Reference Audit & Demo Verification', () => {
  describe('1. Media URL Classifier', () => {
    it('should classify empty image references as imageless', () => {
      expect(classifyMediaUrl('').type).toBe('imageless');
      expect(classifyMediaUrl(undefined).type).toBe('imageless');
    });

    it('should classify brand placeholder references', () => {
      expect(classifyMediaUrl('/images/brand/placeholder.svg').type).toBe('placeholder');
    });

    it('should classify R2 transformation paths', () => {
      expect(classifyMediaUrl('/cdn-cgi/image/w=1200/articles/2026/08/test/hero.webp').type).toBe('r2');
      expect(classifyMediaUrl('articles/2026/08/test/hero.webp').type).toBe('r2');
    });

    it('should classify external Amazon CDN links', () => {
      expect(classifyMediaUrl('https://m.media-amazon.com/images/I/71xyz.jpg').type).toBe('amazon');
    });

    it('should classify demo fixture references', () => {
      const res = classifyMediaUrl('/images/articles/gaming-keyboards-hero.webp');
      expect(res.type).toBe('demo');
      expect(res.notes).toContain('Legacy demo fixture reference');
    });
  });

  describe('2. Audit of Existing 10 Demo Articles', () => {
    it('should audit an individual article successfully without modifying content', () => {
      const summary = auditArticleMedia('best-gaming-keyboards-under-5000');
      expect(summary.slug).toBe('best-gaming-keyboards-under-5000');
      expect(summary.totalProducts).toBe(5);
      expect(summary.references.length).toBe(6); // 1 hero + 5 products
    });

    it('should scan all existing articles across the site', () => {
      const fullAudit = auditAllArticlesMedia();
      expect(fullAudit.scannedArticlesCount).toBeGreaterThanOrEqual(10);
      expect(fullAudit.totalReferencesCount).toBeGreaterThan(40);
      expect(fullAudit.typeCounts.demo).toBeGreaterThan(0);
    });

    it('should format a complete readable audit report', () => {
      const fullAudit = auditAllArticlesMedia();
      const report = formatMediaAuditReport(fullAudit);

      expect(report).toContain('DESIOFFERS GUIDES — EXISTING MEDIA REFERENCE AUDIT REPORT');
      expect(report).toMatch(/SUMMARY: Scanned \d+ articles/);
      expect(report).toContain('Legacy Demo References');
    });
  });
});
