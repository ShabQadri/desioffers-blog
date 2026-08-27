import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  checkR2ObjectExistence,
  extractR2Key,
  classifyMediaStorage,
} from '../../src/lib/media/verifier.js';
import {
  evaluateArticleQuality,
  evaluateArticleQualityAsync,
  formatQualityReportConsole,
  formatQualityReportJson,
} from '../../src/lib/quality/index.js';

describe('Phase 11C — R2 Media Existence Verification & Review Pipeline', () => {
  const articlesDir = path.join(process.cwd(), 'src', 'content', 'articles');
  const createdSlugs: string[] = [];

  afterEach(() => {
    for (const slug of createdSlugs) {
      const p = path.join(articlesDir, `${slug}.mdx`);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {}
      }
    }
    createdSlugs.length = 0;
  });

  const validBody = `
When setting up a gaming workspace on a budget, finding reliable gaming peripherals makes a major difference in daily productivity and competitive gaming responsiveness. In this buying guide, our editorial team evaluates top-performing hardware in India across build quality, switch durability, sensor tracking accuracy, ergonomic comfort, and manufacturer warranty coverage across reputable consumer brands.
`.trim();

  function createTestFixture(slug: string, frontmatter: string, body: string = validBody): void {
    const fullContent = `---\n${frontmatter}\n---\n\n${body}`;
    const p = path.join(articlesDir, `${slug}.mdx`);
    fs.writeFileSync(p, fullContent, 'utf-8');
    createdSlugs.push(slug);
  }

  function getBaseFrontmatter(heroImage: string, heroStatus = 'ready', heroRights = 'original') {
    return `
title: "5 Best Gaming Gear Under ₹3,000 in India (2026 Test)"
description: "Looking for top gaming gear under ₹3,000 in India? Compare sensors, durability, and ergonomics."
publishedDate: 2026-08-27T00:00:00.000Z
articleType: "buying-guide"
category: "gaming"
tags:
  - "budget"
author: "shaaz"
heroImage: "${heroImage}"
heroImageStatus: "${heroStatus}"
heroImageRightsStatus: "${heroRights}"
productDataVerified: false
products:
  - position: 1
    name: "Logitech G304 Lightspeed Mouse"
    brand: "Logitech"
    asin: "B07CGP569X"
    url: "https://www.amazon.in/dp/B07CGP569X"
    affiliateUrl: "https://www.amazon.in/dp/B07CGP569X"
    imageSource: "none"
    shortDescription: "Hero 12K optical sensor wireless mouse."
    bestFor: "Budget gamers"
    pros:
      - "Hero sensor"
    cons:
      - "AA battery"
`.trim();
  }

  describe('1. Key Extraction & Storage Classification', () => {
    it('should extract clean R2 key from direct R2 paths and transformed paths', () => {
      expect(extractR2Key('articles/2026/08/slug/hero.jpg')).toBe('articles/2026/08/slug/hero.jpg');
      expect(extractR2Key('/articles/2026/08/slug/hero.jpg')).toBe('articles/2026/08/slug/hero.jpg');
      expect(
        extractR2Key('/cdn-cgi/image/w=1200,f=auto/articles/2026/08/slug/hero.jpg')
      ).toBe('articles/2026/08/slug/hero.jpg');
    });

    it('should classify storage types accurately', () => {
      expect(classifyMediaStorage('articles/2026/08/slug/hero.jpg')).toBe('r2');
      expect(classifyMediaStorage('/images/articles/hero.webp')).toBe('local-static');
      expect(classifyMediaStorage('https://example.com/image.jpg')).toBe('external');
      expect(classifyMediaStorage('')).toBe('imageless');
    });
  });

  describe('2. R2 Existence Verification Engine', () => {
    it('should return exists=true and status="exists" when mock reports object exists', async () => {
      const res = await checkR2ObjectExistence('articles/2026/08/slug/hero.jpg', {
        mockR2Exists: true,
      });

      expect(res.exists).toBe(true);
      expect(res.status).toBe('exists');
      expect(res.message).toContain('R2 object exists');
    });

    it('should return exists=false and status="not_found" when mock reports object is missing', async () => {
      const res = await checkR2ObjectExistence('articles/2026/08/slug/hero.jpg', {
        mockR2Exists: false,
      });

      expect(res.exists).toBe(false);
      expect(res.status).toBe('not_found');
      expect(res.message).toContain('R2 object not found');
    });

    it('should fail closed with status="r2_unavailable" when credentials/network unavailable', async () => {
      const res = await checkR2ObjectExistence('articles/2026/08/slug/hero.jpg', {
        r2Token: 'invalid_token',
        r2AccountId: 'invalid_account',
      });

      expect(res.exists).toBe(false);
      expect(res.status).toBe('r2_unavailable');
      expect(res.message).toContain('R2');
    });
  });

  describe('3. Quality Pipeline Review-Time Media States', () => {
    it('should PASS when R2 hero object exists in storage', async () => {
      createTestFixture(
        'test-r2-exists-article',
        getBaseFrontmatter('articles/2026/08/test/hero.jpg', 'ready')
      );

      const report = await evaluateArticleQualityAsync('test-r2-exists-article', {
        mockR2Exists: true,
      });

      expect(report.isPublishable).toBe(true);
      const mediaCheck = report.checks.find((c) => c.id === 'media-hero-valid');
      expect(mediaCheck).toBeDefined();
      expect(mediaCheck?.severity).toBe('PASS');
      expect(mediaCheck?.message).toContain('R2 object exists');
    });

    it('should BLOCK publication when R2 hero object is not found in storage', async () => {
      createTestFixture(
        'test-r2-missing-article',
        getBaseFrontmatter('articles/2026/08/test/hero.jpg', 'ready')
      );

      const report = await evaluateArticleQualityAsync('test-r2-missing-article', {
        mockR2Exists: false,
      });

      expect(report.isPublishable).toBe(false);
      expect(report.status).toBe('BLOCKED');
      expect(report.blockers.some((b) => b.includes('R2 object not found'))).toBe(true);
    });

    it('should BLOCK publication when heroImageStatus="needs-generation"', async () => {
      createTestFixture(
        'test-needs-gen-article',
        getBaseFrontmatter('articles/2026/08/test/hero.jpg', 'needs-generation')
      );

      const report = evaluateArticleQuality('test-needs-gen-article');

      expect(report.isPublishable).toBe(false);
      expect(report.status).toBe('BLOCKED');
      expect(report.blockers.some((b) => b.includes('needs-generation'))).toBe(true);
    });

    it('should BLOCK publication when heroImage is empty and marked ready', () => {
      createTestFixture('test-empty-hero-ready-article', getBaseFrontmatter('', 'ready'));

      const report = evaluateArticleQuality('test-empty-hero-ready-article');

      expect(report.isPublishable).toBe(false);
      expect(report.status).toBe('BLOCKED');
      expect(report.blockers.some((b) => b.includes('Hero image is required'))).toBe(true);
    });

    it('should PASS when heroImageStatus="fallback-approved" even without image', () => {
      createTestFixture(
        'test-fallback-approved-article',
        getBaseFrontmatter('', 'fallback-approved')
      );

      const report = evaluateArticleQuality('test-fallback-approved-article');

      expect(report.isPublishable).toBe(true);
      const fallbackCheck = report.checks.find((c) => c.id === 'media-hero-fallback');
      expect(fallbackCheck).toBeDefined();
      expect(fallbackCheck?.severity).toBe('PASS');
    });

    it('should handle local static demo images without incorrectly invoking R2 verification', () => {
      createTestFixture(
        'test-local-demo-article',
        getBaseFrontmatter('/images/articles/gaming-mice-hero.webp', 'ready')
      );

      const report = evaluateArticleQuality('test-local-demo-article');

      expect(report.isPublishable).toBe(true);
      const mediaCheck = report.checks.find((c) => c.id === 'media-hero-valid');
      expect(mediaCheck).toBeDefined();
      expect(mediaCheck?.severity).toBe('PASS');
      expect(mediaCheck?.message).toContain('Legacy demo fixture reference');
    });

    it('should fail closed when R2 verification is unavailable', async () => {
      createTestFixture(
        'test-r2-fail-closed-article',
        getBaseFrontmatter('articles/2026/08/test/hero.jpg', 'ready')
      );

      // Force empty credentials so R2 check fails closed
      const report = await evaluateArticleQualityAsync('test-r2-fail-closed-article', {
        r2Token: '',
        r2AccountId: '',
      });

      expect(report.isPublishable).toBe(false);
      expect(report.status).toBe('BLOCKED');
      expect(report.blockers.some((b) => b.includes('Hero Image Storage Existence'))).toBe(true);
    });

    it('should include heroMediaVerification in JSON and console reporting', async () => {
      createTestFixture(
        'test-reporting-media-article',
        getBaseFrontmatter('articles/2026/08/test/hero.jpg', 'ready')
      );

      const report = await evaluateArticleQualityAsync('test-reporting-media-article', {
        mockR2Exists: true,
      });

      const jsonStr = formatQualityReportJson(report);
      const consoleStr = formatQualityReportConsole(report);

      expect(jsonStr).toContain('"heroMediaVerification"');
      expect(jsonStr).toContain('"status": "exists"');
      expect(consoleStr).toContain('R2 object exists');
    });
  });
});
