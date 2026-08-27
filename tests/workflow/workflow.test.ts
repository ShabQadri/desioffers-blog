import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createEditorialArticleDraft } from '../../src/lib/workflow/article-workflow.js';

describe('Phase 10 — End-to-End Article Authoring Workflow', () => {
  const testSlug = 'test-e2e-workflow-guide';
  const articleFilePath = path.join(process.cwd(), 'src', 'content', 'articles', `${testSlug}.mdx`);

  // 1x1 minimal valid PNG buffer for test ingestion
  const mockPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  afterEach(() => {
    if (fs.existsSync(articleFilePath)) {
      try {
        fs.unlinkSync(articleFilePath);
      } catch {}
    }
  });

  it('should execute complete authoring workflow with hero ingestion, enforce draft: true, and evaluate quality gate', async () => {
    const result = await createEditorialArticleDraft({
      topic: '5 Best Budget Gaming Mice for Competitive Play in India (2026 Edition)',
      slug: testSlug,
      articleType: 'buying-guide',
      category: 'gaming',
      subcategory: 'gaming-mice',
      tags: ['budget', 'under-3000', 'wireless', 'rgb'],
      author: 'shaaz',
      description: 'Looking for the best budget gaming mice under ₹3,000 in India? Compare top optical sensors, DPI, switches, and ergonomic builds.',
      heroImageBuffer: mockPngBuffer,
      products: [
        {
          name: 'Logitech G304 Lightspeed Wireless Gaming Mouse',
          brand: 'Logitech',
          asin: 'B07CGP569X',
          shortDescription: 'Hero 12K optical sensor with 250-hour battery life on a single AA battery.',
          bestFor: 'Wireless budget esports players',
          pros: ['Hero sensor with zero smoothing', 'Long battery life', 'Reliable 2.4GHz connection'],
          cons: ['AA battery adds slight rear weight'],
          priceVerification: 'unknown',
          availabilityVerification: 'unknown',
        },
        {
          name: 'Razer DeathAdder Essential Ergonomic Gaming Mouse',
          brand: 'Razer',
          asin: 'B0942VWD2Z',
          shortDescription: 'Classic ergonomic silhouette with 6,400 DPI optical sensor and durable mechanical switches.',
          bestFor: 'Palm grip users wanting ergonomic support',
          pros: ['Iconic comfortable shape', 'Multi-award winning ergonomic form factor', 'Durable switches'],
          cons: ['Braided cable can feel slightly stiff'],
          priceVerification: 'unknown',
          availabilityVerification: 'unknown',
        },
        {
          name: 'HyperX Pulsefire Haste Ultra Lightweight Mouse',
          brand: 'HyperX',
          asin: 'B08MGBG4GQ',
          shortDescription: 'Honeycomb shell design weighing only 59 grams with TTC Golden dustproof switches.',
          bestFor: 'Fast-paced FPS shooters',
          pros: ['Ultra-light 59g weight', 'Smooth pure virgin-grade PTFE skates', 'Flexible HyperFlex cable'],
          cons: ['Open honeycomb shell requires dust care'],
          priceVerification: 'unknown',
          availabilityVerification: 'unknown',
        },
      ],
      bodySections: [
        {
          type: 'intro',
          content: 'Finding a responsive and durable gaming mouse under ₹3,000 in India does not mean sacrificing sensor accuracy or build quality. Modern budget sensors from PixArt and Logitech offer true 1:1 tracking without hardware acceleration or angle snapping. In this guide, our editorial team analyzes top gaming mice available in India across key parameters including switch longevity, cable flexibility, weight distribution, and software customization.',
        },
        {
          type: 'methodology',
          heading: 'Comparison Criteria & Selection Methodology',
          content: 'Recommendations are based on published sensor specifications, Indian market availability, verified brand warranty coverage, and ergonomic design considerations across grip styles.',
        },
        {
          type: 'buying-factors',
          heading: 'Key Factors for Indian Gamers',
          content: 'Ensure you consider your preferred grip style, whether you need wireless mobility or ultra-lightweight corded mobility, and the humidity resistance of the mouse switches in Indian climates.',
        },
      ],
    });

    // 1. File output validation
    expect(fs.existsSync(result.draftPath)).toBe(true);
    const mdxContent = fs.readFileSync(result.draftPath, 'utf-8');

    // 2. Draft safety validation
    expect(mdxContent).toContain('draft: true');

    // 3. Imageless product card fallback validation
    expect(mdxContent).toContain('imageSource: "none"');

    // 4. Quality Report validation
    expect(result.qualityReport.isPublishable).toBe(true);
    expect(result.qualityReport.blockers).toHaveLength(0);
    expect(result.isReadyForReview).toBe(true);

    // 5. Review Summary formatting
    expect(result.reviewSummary).toContain('DESIOFFERS GUIDES — ARTICLE QUALITY REVIEW REPORT');
    expect(result.reviewSummary).toContain(testSlug);
  });
});
