import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { validateArticleForPublish } from '../../src/lib/publish/validator.js';

describe('Phase 3 — Pre-Publish Validator', () => {
  const tempArticlesDir = path.join(process.cwd(), 'tests', 'fixtures', 'articles');
  const fixturesContentDir = path.join(process.cwd(), 'tests', 'fixtures');

  beforeAll(() => {
    fs.mkdirSync(tempArticlesDir, { recursive: true });
  });

  afterAll(() => {
    try {
      if (fs.existsSync(fixturesContentDir)) {
        fs.rmSync(fixturesContentDir, { recursive: true, force: true });
      }
    } catch {}
  });

  function createFixtureArticle(slug: string, frontmatter: string, body: string = 'Valid body content.'): void {
    const filePath = path.join(tempArticlesDir, `${slug}.mdx`);
    fs.writeFileSync(filePath, `---\n${frontmatter}\n---\n\n${body}\n`, 'utf-8');
  }

  const validFrontmatter = `
title: "5 Best Air Fryers for Indian Kitchens"
slug: "best-air-fryers-india"
description: "Compare top air fryers with energy efficiency, basket capacity, and warranty."
publishedDate: 2026-08-27
lastVerified: 2026-08-27
author: "shaaz"
category: "kitchen-appliances"
subcategory: "air-fryers"
tags: ["budget", "indian-homes"]
heroImage: "/images/hero.webp"
heroImageAlt: "Air fryer on kitchen counter"
heroImageStatus: "ready"
heroImageRightsStatus: "original"
draft: true
products:
  - position: 1
    name: "Philips Digital Air Fryer HD9252"
    brand: "Philips"
    shortDescription: "Rapid Air technology with digital touch screen."
    bestFor: "Small to medium Indian households"
    pros:
      - "Consistent cooking temperature"
      - "Easy to clean basket"
    cons:
      - "Power cord is short"
    priceDisplay: "₹7,999"
    affiliateUrl: "https://www.amazon.in/dp/B08HN7W781"
`;

  it('should validate a fully compliant draft article successfully', () => {
    createFixtureArticle('best-air-fryers-india', validFrontmatter);
    const report = validateArticleForPublish('best-air-fryers-india', { contentDir: fixturesContentDir });

    expect(report.isValid).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.affiliateLinkCount).toBe(1);
  });

  it('should block publishing if heroImageRightsStatus is restricted', () => {
    const fm = validFrontmatter.replace('heroImageRightsStatus: "original"', 'heroImageRightsStatus: "restricted"');
    createFixtureArticle('restricted-hero', fm);
    const report = validateArticleForPublish('restricted-hero', { contentDir: fixturesContentDir });

    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes('heroImageRightsStatus is "restricted"'))).toBe(true);
  });

  it('should block publishing if heroImageStatus is needs-generation', () => {
    const fm = validFrontmatter.replace('heroImageStatus: "ready"', 'heroImageStatus: "needs-generation"');
    createFixtureArticle('needs-gen-hero', fm);
    const report = validateArticleForPublish('needs-gen-hero', { contentDir: fixturesContentDir });

    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes('needs-generation'))).toBe(true);
  });

  it('should block publishing if any product has imageRightsStatus restricted', () => {
    const fm = validFrontmatter + '\n    imageRightsStatus: "restricted"';
    createFixtureArticle('restricted-prod', fm);
    const report = validateArticleForPublish('restricted-prod', { contentDir: fixturesContentDir });

    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes('has imageRightsStatus "restricted"'))).toBe(true);
  });

  it('should block publishing if category does not exist in registry', () => {
    const fm = validFrontmatter.replace('category: "kitchen-appliances"', 'category: "unregistered-category"');
    createFixtureArticle('bad-cat', fm);
    const report = validateArticleForPublish('bad-cat', { contentDir: fixturesContentDir });

    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes('Invalid category'))).toBe(true);
  });

  it('should block publishing if subcategory does not belong to category', () => {
    const fm = validFrontmatter.replace('subcategory: "air-fryers"', 'subcategory: "gaming-keyboards"');
    createFixtureArticle('mismatched-sub', fm);
    const report = validateArticleForPublish('mismatched-sub', { contentDir: fixturesContentDir });

    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes('belongs to category'))).toBe(true);
  });

  it('should block publishing if author is invalid', () => {
    const fm = validFrontmatter.replace('author: "shaaz"', 'author: "non-existent-author"');
    createFixtureArticle('bad-author', fm);
    const report = validateArticleForPublish('bad-author', { contentDir: fixturesContentDir });

    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes('Invalid author'))).toBe(true);
  });

  it('should block publishing if body contains fabricated testing claims', () => {
    createFixtureArticle('fabricated-claims', validFrontmatter, 'In our lab review, we tested this product for 3 weeks.');
    const report = validateArticleForPublish('fabricated-claims', { contentDir: fixturesContentDir });

    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes('Quality Guard'))).toBe(true);
  });
});
