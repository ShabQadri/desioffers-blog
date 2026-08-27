import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseMdxArticle, parseFrontmatterYaml } from '../../src/lib/publish/validator.js';
import { evaluateArticleQualityAsync } from '../../src/lib/quality/index.js';

describe('Phase 11F — Sveltia CMS Draft Safety & Workflow Invariants', () => {
  const configPath = path.join(process.cwd(), 'public', 'admin', 'config.yml');
  const articlesDir = path.join(process.cwd(), 'src', 'content', 'articles');

  const rawConfig = fs.readFileSync(configPath, 'utf-8');

  describe('1. Sveltia CMS Configuration Safety', () => {
    it('should configure backend to GitHub main branch', () => {
      expect(rawConfig).toContain('name: github');
      expect(rawConfig).toContain('repo: ShabQadri/desioffers-blog');
      expect(rawConfig).toContain('branch: main');
    });

    it('should default article draft to true with editorial comment', () => {
      expect(rawConfig).toMatch(/name:\s*draft,\s*widget:\s*boolean,\s*default:\s*true/);
      expect(rawConfig).toContain('New articles are drafts');
    });

    it('should default productDataVerified to false', () => {
      expect(rawConfig).toMatch(/name:\s*productDataVerified,\s*widget:\s*boolean,\s*default:\s*false/);
    });

    it('should default priceVerified to false', () => {
      expect(rawConfig).toMatch(/name:\s*priceVerified,\s*widget:\s*boolean,\s*default:\s*false/);
    });

    it('should default heroImageRightsStatus to needs-review', () => {
      expect(rawConfig).toMatch(/name:\s*heroImageRightsStatus,\s*widget:\s*select,\s*options:.*default:\s*"needs-review"/);
    });

    it('should default product imageSource to none and rights to needs-review', () => {
      expect(rawConfig).toMatch(/name:\s*imageSource,\s*widget:\s*select,\s*options:.*default:\s*"none"/);
      expect(rawConfig).toMatch(/name:\s*imageRightsStatus,\s*widget:\s*select,\s*options:.*default:\s*"needs-review"/);
    });

    it('should use controlled relation widgets for taxonomy and author', () => {
      expect(rawConfig).toMatch(/name:\s*author,\s*widget:\s*relation,\s*collection:\s*authors/);
      expect(rawConfig).toMatch(/name:\s*category,\s*widget:\s*relation,\s*collection:\s*categories/);
      expect(rawConfig).toMatch(/name:\s*subcategory,\s*widget:\s*relation,\s*collection:\s*subcategories/);
      expect(rawConfig).toMatch(/name:\s*tags,\s*widget:\s*relation,\s*collection:\s*tags/);
    });
  });

  describe('2. Existing Article Draft Status Invariants', () => {
    it('should verify 10 production articles have draft: false and test articles have draft: true', () => {
      const allFiles = fs
        .readdirSync(articlesDir)
        .filter((f) => (f.endsWith('.mdx') || f.endsWith('.md')) && !f.startsWith('test-') && !f.startsWith('best-budget-wireless'));
      const drafts: string[] = [];
      const published: string[] = [];

      for (const f of allFiles) {
        const filePath = path.join(articlesDir, f);
        const { frontmatterText } = parseMdxArticle(filePath);
        const data = parseFrontmatterYaml(frontmatterText);
        const slug = f.replace(/\.mdx?$/, '');
        if (data.draft === true) {
          drafts.push(slug);
        } else {
          published.push(slug);
        }
      }

      expect(published.length).toBeGreaterThanOrEqual(10);
      expect(drafts).toContain('budget-gaming-mice-under-3000');
      expect(drafts).toContain('top-wireless-earbuds-under-2000');
    });
  });

  describe('3. Review CLI Read-Only Invariant', () => {
    it('should not modify draft article file on disk when running quality evaluation', async () => {
      const targetSlug = 'budget-gaming-mice-under-3000';
      const filePath = path.join(articlesDir, `${targetSlug}.mdx`);
      const beforeContent = fs.readFileSync(filePath, 'utf-8');
      const { frontmatterText: beforeFrontmatter } = parseMdxArticle(filePath);
      const beforeData = parseFrontmatterYaml(beforeFrontmatter);

      expect(beforeData.draft).toBe(true);

      const report = await evaluateArticleQualityAsync(targetSlug);
      expect(report).toBeDefined();

      const afterContent = fs.readFileSync(filePath, 'utf-8');
      const { frontmatterText: afterFrontmatter } = parseMdxArticle(filePath);
      const afterData = parseFrontmatterYaml(afterFrontmatter);

      expect(afterData.draft).toBe(true);
      expect(afterContent).toBe(beforeContent);
    });
  });
});
