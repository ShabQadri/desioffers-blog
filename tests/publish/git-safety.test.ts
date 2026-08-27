import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  stageSpecificFiles,
  runGitSafetyPreflight,
} from '../../src/lib/publish/git-safety.js';
import {
  setArticleDraftStatus,
  formatPublishReport,
  type PublishPlan,
} from '../../src/lib/publish/workflow.js';

describe('Phase 3 — Git Safety & Workflow', () => {
  const tempDir = path.join(process.cwd(), 'tests', 'fixtures', 'git-test');
  const tempFile = path.join(tempDir, 'test-article.mdx');

  beforeEach(() => {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(
      tempFile,
      `---\ntitle: "Test Article"\nslug: "test-article"\ndescription: "Desc"\npublishedDate: 2026-08-27\nlastVerified: 2026-08-27\nauthor: "shaaz"\ncategory: "gaming"\nheroImage: "/img.webp"\nheroImageAlt: "Alt"\ndraft: true\nproducts: []\n---\nBody`,
      'utf-8'
    );
  });

  afterAll(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  describe('1. Draft Transition Helper', () => {
    it('should transition draft: true to draft: false', () => {
      setArticleDraftStatus(tempFile, false);
      const content = fs.readFileSync(tempFile, 'utf-8');
      expect(content).toContain('draft: false');
      expect(content).not.toContain('draft: true');
    });

    it('should transition draft: false back to draft: true on rollback', () => {
      setArticleDraftStatus(tempFile, false);
      setArticleDraftStatus(tempFile, true);
      const content = fs.readFileSync(tempFile, 'utf-8');
      expect(content).toContain('draft: true');
      expect(content).not.toContain('draft: false');
    });
  });

  describe('2. Git Staging Safety Rules', () => {
    it('should reject dangerous wildcard/all staging patterns', () => {
      expect(() => stageSpecificFiles(['.'])).toThrow('`git add .` is prohibited');
      expect(() => stageSpecificFiles(['./'])).toThrow('`git add .` is prohibited');
      expect(() => stageSpecificFiles(['*'])).toThrow('`git add .` is prohibited');
    });

    it('should throw error when empty file list is provided', () => {
      expect(() => stageSpecificFiles([])).toThrow('No files specified');
    });
  });

  describe('3. Publish Report Formatting', () => {
    it('should format full publication summary report containing all sections', () => {
      const mockPlan: PublishPlan = {
        slug: 'best-gaming-keyboards',
        articleFile: 'src/content/articles/best-gaming-keyboards.mdx',
        isReadyToPublish: true,
        blockingReasons: [],
        validationReport: {
          isValid: true,
          slug: 'best-gaming-keyboards',
          filePath: 'src/content/articles/best-gaming-keyboards.mdx',
          rawFrontmatter: '',
          rawBody: '',
          parsedData: {
            title: '5 Best Gaming Keyboards',
            slug: 'best-gaming-keyboards',
            description: 'Top picks',
            articleType: 'buying-guide',
            publishedDate: '2026-08-27',
            lastVerified: '2026-08-27',
            author: 'shaaz',
            category: 'gaming',
            tags: ['mechanical', 'rgb'],
            heroImage: '/images/hero.webp',
            heroImageAlt: 'Gaming keyboard',
            heroImageStatus: 'ready',
            heroImageSource: 'ai-generated',
            heroImageRightsStatus: 'original',
            draft: true,
            products: [
              {
                position: 1,
                name: 'K552',
                brand: 'Redragon',
                shortDescription: 'Desc',
                bestFor: 'Gamers',
                pros: ['Pro'],
                cons: ['Con'],
                affiliateUrl: 'https://amazon.in',
                imageSource: 'none',
                imageRightsStatus: 'original',
              },
            ],
          },
          errors: [],
          warnings: [],
          qualityWarnings: [],
          seoWarnings: [],
          affiliateLinkCount: 1,
          hasUnconfiguredAffiliateTag: false,
        },
        gitReport: {
          isSafe: true,
          branch: 'main',
          localHeadCommit: 'abcdef1234567890',
          remoteHeadCommit: 'abcdef1234567890',
          commitsBehind: 0,
          commitsAhead: 0,
          hasDiverged: false,
          unrelatedModifiedFiles: [],
          remoteTargetArticleChanged: false,
          errors: [],
          warnings: [],
        },
      };

      const report = formatPublishReport(mockPlan);

      expect(report).toContain('PRE-PUBLICATION REPORT');
      expect(report).toContain('ARTICLE');
      expect(report).toContain('5 Best Gaming Keyboards');
      expect(report).toContain('SEO & METADATA');
      expect(report).toContain('MEDIA PROVENANCE & RIGHTS');
      expect(report).toContain('Hero Rights:  original');
      expect(report).toContain('AFFILIATE DISCLOSURE & LINKS');
      expect(report).toContain('VALIDATION CHECKS');
      expect(report).toContain('GIT SAFETY PRE-FLIGHT');
      expect(report).toContain('Files to Commit:     src/content/articles/best-gaming-keyboards.mdx ONLY');
    });
  });

  describe('4. Real Repository Git Safety Pre-flight', () => {
    it('should inspect current working tree and return safe or list unrelated files', () => {
      const preflight = runGitSafetyPreflight({
        targetArticleSlug: 'best-gaming-keyboards-under-5000',
      });

      expect(typeof preflight.branch).toBe('string');
      expect(typeof preflight.localHeadCommit).toBe('string');
      expect(Array.isArray(preflight.unrelatedModifiedFiles)).toBe(true);
    });
  });
});
