import { describe, it, expect } from 'vitest';
import {
  checkContentQuality,
  hasQualityErrors,
  formatQualityReport,
} from '../../src/lib/authoring/quality-guard.js';

describe('Quality Guard (Deterministic Anti-Fabrication Checker)', () => {
  it('should flag hands-on testing claims as errors', () => {
    const text = 'In our lab review, we tested 15 gaming keyboards to see how they perform.';
    const warnings = checkContentQuality(text);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(hasQualityErrors(warnings)).toBe(true);
    expect(warnings.some((w) => w.message.includes('tested'))).toBe(true);
  });

  it('should flag fabricated customer ratings and reviews', () => {
    const text = 'This product is rated 4.8 out of 5 based on 2,500 customer reviews.';
    const warnings = checkContentQuality(text);
    expect(warnings.some((w) => w.message.includes('rating') || w.message.includes('review'))).toBe(true);
    expect(hasQualityErrors(warnings)).toBe(true);
  });

  it('should flag absolute stock status claims as errors', () => {
    const text = 'The Redragon K552 is currently in stock and ready to ship.';
    const warnings = checkContentQuality(text);
    expect(warnings.some((w) => w.message.includes('stock'))).toBe(true);
    expect(hasQualityErrors(warnings)).toBe(true);
  });

  it('should pass cleanly for transparent, specification-focused editorial text', () => {
    const cleanText = `
      When choosing a mechanical keyboard under ₹5,000, key switch type and build material are essential factors.
      According to manufacturer specifications, the Redragon K552 features Outemu Red linear switches with customizable RGB lighting.
      For users seeking a compact tenkeyless layout, this model provides solid value.
    `;
    const warnings = checkContentQuality(cleanText);
    expect(hasQualityErrors(warnings)).toBe(false);
  });

  it('should format a readable quality report', () => {
    const cleanReport = formatQualityReport([]);
    expect(cleanReport).toContain('passed');

    const warnings = checkContentQuality('we tested this item and we measured 5ms latency.');
    const errorReport = formatQualityReport(warnings);
    expect(errorReport).toContain('ERRORS');
  });
});
