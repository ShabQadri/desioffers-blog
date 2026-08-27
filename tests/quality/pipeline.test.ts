import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  evaluateArticleQuality,
  formatQualityReportConsole,
  formatQualityReportJson,
} from '../../src/lib/quality/index.js';

describe('Phase 8 — Central Article Quality Pipeline', () => {
  const realArticlesDir = path.join(process.cwd(), 'src', 'content', 'articles');
  const createdSlugs: string[] = [];

  afterEach(() => {
    // Clean up any test fixtures created in articles dir
    for (const slug of createdSlugs) {
      const p = path.join(realArticlesDir, `${slug}.mdx`);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {}
      }
    }
    createdSlugs.length = 0;
  });

  const longValidBody = `
When setting up a gaming or productivity workspace on a budget, choosing the right mechanical keyboard makes a noticeable difference in typing comfort, durability, and input speed. In this buying guide, our editorial team evaluates top-performing options under 5000 rupees in India. We compare switch varieties including linear red switches and tactile blue switches, build materials, per-key RGB backlighting quality, keycap longevity, and warranty coverage across reputable brands like Redragon, Cosmic Byte, and Ant Esports. Whether you need a compact tenkeyless form factor for tight desk setups or full-sized layouts for daily productivity, these curated recommendations provide reliable value.
`.trim();

  function createFixture(slug: string, frontmatter: string, body: string = longValidBody): void {
    const fullContent = `---\n${frontmatter}\n---\n\n${body}`;
    const p = path.join(realArticlesDir, `${slug}.mdx`);
    fs.writeFileSync(p, fullContent, 'utf-8');
    createdSlugs.push(slug);
  }

  function getBaseFrontmatter(title: string) {
    return `
title: "${title}"
description: "Looking for a mechanical gaming keyboard under ₹5,000 in India? Compare top picks with RGB, Outemu switches, and durable builds."
publishedDate: 2026-08-27T00:00:00.000Z
articleType: "buying-guide"
category: "gaming"
subcategory: "gaming-keyboards"
tags:
  - "mechanical"
  - "rgb"
  - "budget"
author: "shaaz"
heroImage: "/images/articles/gaming-keyboards-hero.webp"
heroImageStatus: "ready"
heroImageRightsStatus: "original"
products:
  - position: 1
    name: "Redragon K552 Kumara RGB Mechanical Gaming Keyboard"
    brand: "Redragon"
    asin: "B016MAK38U"
    url: "https://www.amazon.in/dp/B016MAK38U"
    affiliateUrl: "https://www.amazon.in/dp/B016MAK38U"
    imageSource: "none"
    shortDescription: "Compact 87-key TKL mechanical keyboard with tactile blue switches."
    bestFor: "Budget gamers wanting tactile clicky feedback"
    pros:
      - "Sturdy metal construction"
      - "Vibrant RGB lighting"
    cons:
      - "Loud clicky switches"
    priceVerification: "unknown"
    availabilityVerification: "unknown"
`.trim();
  }

  it('should pass a fully compliant draft article with status READY_FOR_REVIEW or HAS_WARNINGS', () => {
    createFixture('test-valid-guide', getBaseFrontmatter('5 Best Quality Keyboards For Gaming In India (2026)'));
    const report = evaluateArticleQuality('test-valid-guide');

    expect(report.isPublishable).toBe(true);
    expect(report.blockers).toHaveLength(0);
    expect(report.summary.passCount).toBeGreaterThan(5);
  });

  it('should block publication if heroImage is missing and not fallback-approved', () => {
    const missingHeroFm = getBaseFrontmatter('Test Missing Hero Guide Title (2026 Edition)').replace(
      'heroImage: "/images/articles/gaming-keyboards-hero.webp"',
      'heroImage: ""'
    );
    createFixture('test-missing-hero-guide', missingHeroFm);
    const report = evaluateArticleQuality('test-missing-hero-guide');

    expect(report.isPublishable).toBe(false);
    expect(report.status).toBe('BLOCKED');
    expect(report.blockers.some((b) => b.includes('Hero image is required'))).toBe(true);
  });

  it('should block publication if heroImageStatus is needs-generation', () => {
    const needsGenFm = getBaseFrontmatter('Test Needs Gen Hero Guide Title (2026 Edition)').replace(
      'heroImageStatus: "ready"',
      'heroImageStatus: "needs-generation"'
    );
    createFixture('test-needs-gen-hero-guide', needsGenFm);
    const report = evaluateArticleQuality('test-needs-gen-hero-guide');

    expect(report.isPublishable).toBe(false);
    expect(report.status).toBe('BLOCKED');
    expect(report.blockers.some((b) => b.includes('needs-generation'))).toBe(true);
  });

  it('should block publication if heroImageRightsStatus is restricted', () => {
    const restrictedHeroFm = getBaseFrontmatter('Test Restricted Hero Guide Title (2026 Edition)').replace(
      'heroImageRightsStatus: "original"',
      'heroImageRightsStatus: "restricted"'
    );
    createFixture('test-restricted-hero-guide', restrictedHeroFm);
    const report = evaluateArticleQuality('test-restricted-hero-guide');

    expect(report.isPublishable).toBe(false);
    expect(report.status).toBe('BLOCKED');
    expect(report.blockers.some((b) => b.includes('restricted'))).toBe(true);
  });

  it('should allow imageless products while generating an advisory warning', () => {
    createFixture('test-imageless-guide', getBaseFrontmatter('Test Imageless Guide Title (2026 Edition)'));
    const report = evaluateArticleQuality('test-imageless-guide');

    expect(report.isPublishable).toBe(true);
    expect(report.warnings.some((w) => w.includes('imageless'))).toBe(true);
  });

  it('should allow unknown price and unknown stock verification without blocking', () => {
    createFixture('test-unknown-price-guide', getBaseFrontmatter('Test Unknown Price Guide Title (2026 Edition)'));
    const report = evaluateArticleQuality('test-unknown-price-guide');

    expect(report.isPublishable).toBe(true);
    expect(report.blockers).toHaveLength(0);
  });

  it('should block publication if category does not exist in registry', () => {
    const invalidCatFm = getBaseFrontmatter('Test Invalid Cat Guide Title (2026 Edition)').replace(
      'category: "gaming"',
      'category: "nonexistent-category"'
    );
    createFixture('test-invalid-cat-guide', invalidCatFm);
    const report = evaluateArticleQuality('test-invalid-cat-guide');

    expect(report.isPublishable).toBe(false);
    expect(report.status).toBe('BLOCKED');
    expect(report.blockers.some((b) => b.includes('Category'))).toBe(true);
  });

  it('should block publication if body contains fabricated hands-on testing claims', () => {
    const fakeBody = 'We tested this keyboard in our lab for 3 weeks and benchmarked the keystroke latency against competitors with our measurement tools.';
    createFixture('test-fake-claims-guide', getBaseFrontmatter('Test Fake Claims Guide Title (2026 Edition)'), fakeBody);
    const report = evaluateArticleQuality('test-fake-claims-guide');

    expect(report.isPublishable).toBe(false);
    expect(report.status).toBe('BLOCKED');
    expect(report.blockers.some((b) => b.includes('Claims hands-on testing'))).toBe(true);
  });

  it('should allow legitimate editorial use of "best" in title', () => {
    createFixture('test-best-title-guide', getBaseFrontmatter('5 Best Gaming Keyboards Under ₹5,000 in India (2026)'));
    const report = evaluateArticleQuality('test-best-title-guide');

    expect(report.isPublishable).toBe(true);
    expect(report.title).toContain('Best Gaming Keyboards');
  });

  it('should block publication if ASIN format is invalid', () => {
    const invalidAsinFm = getBaseFrontmatter('Test Invalid Asin Guide Title (2026 Edition)').replace(
      'asin: "B016MAK38U"',
      'asin: "invalid_asin"'
    );
    createFixture('test-invalid-asin-guide', invalidAsinFm);
    const report = evaluateArticleQuality('test-invalid-asin-guide');

    expect(report.isPublishable).toBe(false);
    expect(report.status).toBe('BLOCKED');
    expect(report.blockers.some((b) => b.includes('invalid ASIN'))).toBe(true);
  });

  it('should format console report and JSON output cleanly', () => {
    createFixture('test-reporting-guide', getBaseFrontmatter('Test Reporting Guide Output Title (2026 Edition)'));
    const report = evaluateArticleQuality('test-reporting-guide');

    const consoleOutput = formatQualityReportConsole(report);
    const jsonOutput = formatQualityReportJson(report);

    expect(consoleOutput).toContain('DESIOFFERS GUIDES — ARTICLE QUALITY REVIEW REPORT');
    expect(consoleOutput).toContain('Test Reporting Guide Output Title');
    expect(jsonOutput).toContain('"isPublishable": true');
  });
});
