import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { evaluateArticleQuality } from '../../src/lib/quality/index.js';

describe('Phase 11A — Taxonomy Fix & Product Verification Checks', () => {
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
When setting up a gaming or productivity desk setup on a budget in India, choosing the right gaming mouse makes a significant difference in tracking accuracy, click responsiveness, and long-term wrist comfort. In this buying guide, our editorial team evaluates top-performing gaming mice under 3,000 rupees in India. We compare optical sensors including PixArt and Hero sensors, DPI ranges, switch durability, cable flexibility, and ergonomic builds suitable for palm and claw grip styles across reputable brands like Logitech, Razer, and Cosmic Byte.
`.trim();

  function createTestFixture(slug: string, frontmatter: string, body: string = validBody): void {
    const fullContent = `---\n${frontmatter}\n---\n\n${body}`;
    const p = path.join(articlesDir, `${slug}.mdx`);
    fs.writeFileSync(p, fullContent, 'utf-8');
    createdSlugs.push(slug);
  }

  function getBaseFrontmatter(category = 'gaming', subcategory = 'gaming-mice') {
    return `
title: "5 Best Gaming Mice Under ₹3,000 in India (2026 Test)"
description: "Looking for the best gaming mice under ₹3,000 in India? Compare top optical sensors, DPI, switches, and ergonomic builds."
publishedDate: 2026-08-27T00:00:00.000Z
articleType: "buying-guide"
category: "${category}"
subcategory: "${subcategory}"
tags:
  - "budget"
  - "rgb"
author: "shaaz"
heroImage: "/images/articles/gaming-mice-hero.webp"
heroImageStatus: "ready"
heroImageRightsStatus: "original"
productDataVerified: false
products:
  - position: 1
    name: "Logitech G304 Lightspeed Wireless Gaming Mouse"
    brand: "Logitech"
    asin: "B07CGP569X"
    url: "https://www.amazon.in/dp/B07CGP569X"
    affiliateUrl: "https://www.amazon.in/dp/B07CGP569X"
    imageSource: "none"
    shortDescription: "Hero 12K optical sensor with 1ms report rate."
    bestFor: "Budget wireless gamers"
    pros:
      - "Hero sensor"
      - "Long battery life"
    cons:
      - "No RGB"
    priceDisplay: "₹2,499"
    priceVerification: "user-observed"
    priceObservedAt: "2026-08-27T00:00:00.000Z"
    availabilityVerification: "unknown"
`.trim();
  }

  it('should correctly block an article with an invalid category via the fixed taxonomy check', () => {
    createTestFixture('test-invalid-taxonomy-article', getBaseFrontmatter('invalid-fake-category', 'gaming-mice'));
    const report = evaluateArticleQuality('test-invalid-taxonomy-article');

    expect(report.isPublishable).toBe(false);
    expect(report.status).toBe('BLOCKED');
    expect(report.blockers.some((b) => b.includes('Taxonomy') || b.includes('Category'))).toBe(true);
  });

  it('should pass taxonomy check and report PASS when category is valid in registry', () => {
    createTestFixture('test-valid-taxonomy-article', getBaseFrontmatter('gaming', 'gaming-mice'));
    const report = evaluateArticleQuality('test-valid-taxonomy-article');

    const taxCheck = report.checks.find((c) => c.id === 'taxonomy-valid');
    expect(taxCheck).toBeDefined();
    expect(taxCheck?.severity).toBe('PASS');
  });

  it('should emit a WARNING (not a BLOCKER) when productDataVerified is false', () => {
    createTestFixture('test-unverified-data-article', getBaseFrontmatter('gaming', 'gaming-mice'));
    const report = evaluateArticleQuality('test-unverified-data-article');

    expect(report.isPublishable).toBe(true); // Unverified data does NOT block publication
    const verifyCheck = report.checks.find((c) => c.id === 'product-data-verification-status');
    expect(verifyCheck).toBeDefined();
    expect(verifyCheck?.severity).toBe('WARNING');
    expect(verifyCheck?.message).toContain('unverified');
  });

  it('should emit a WARNING when product uses user-observed price to remind about disclosure', () => {
    createTestFixture('test-user-observed-price-article', getBaseFrontmatter('gaming', 'gaming-mice'));
    const report = evaluateArticleQuality('test-user-observed-price-article');

    const priceCheck = report.checks.find((c) => c.id === 'product-1-price-observed');
    expect(priceCheck).toBeDefined();
    expect(priceCheck?.severity).toBe('WARNING');
    expect(priceCheck?.message).toContain('user-observed price');
  });

  it('should block publication when an ASIN has invalid format', () => {
    const invalidAsinFm = getBaseFrontmatter('gaming', 'gaming-mice').replace(
      'asin: "B07CGP569X"',
      'asin: "INVALID_ASIN_123"'
    );
    createTestFixture('test-invalid-asin-format-article', invalidAsinFm);
    const report = evaluateArticleQuality('test-invalid-asin-format-article');

    expect(report.isPublishable).toBe(false);
    expect(report.status).toBe('BLOCKED');
    expect(report.blockers.some((b) => b.includes('invalid ASIN'))).toBe(true);
  });
});
