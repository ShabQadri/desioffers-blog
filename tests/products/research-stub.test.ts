import { describe, it, expect } from 'vitest';
import {
  createEmptyResearchResult,
  createResearchResult,
  researchProductByAsin,
} from '../../src/lib/products/research-stub.js';

describe('Phase 11A — Product Research Contract & Stub', () => {
  it('should create an empty research result with productDataVerified=false and source=web-research', () => {
    const res = createEmptyResearchResult('B07CGP569X');

    expect(res.asin).toBe('B07CGP569X');
    expect(res.source).toBe('web-research');
    expect(res.productDataVerified).toBe(false);
    expect(res.confidence).toBe('unknown');
    expect(res.name).toBe('');
    expect(res.brand).toBe('');
    expect(res.pros).toEqual([]);
    expect(res.cons).toEqual([]);
    // Critical safety: prices are NOT invented by research
    expect((res as any).price).toBeUndefined();
    expect((res as any).priceDisplay).toBeUndefined();
  });

  it('should create a structured research result while enforcing unverified status and web-research source', () => {
    const res = createResearchResult({
      asin: 'B07CGP569X',
      name: 'Logitech G304 Lightspeed Wireless Gaming Mouse',
      brand: 'Logitech',
      model: 'G304',
      shortDescription: 'Hero 12K optical sensor with 1ms report rate.',
      bestFor: 'Competitive gamers looking for latency-free wireless',
      pros: ['Hero sensor', '250-hour AA battery life', 'Lightweight 99g'],
      cons: ['No rechargeable battery (uses AA)', 'No RGB lighting'],
      confidence: 'high',
      specifications: {
        DPI: '12,000',
        Sensor: 'Hero 12K',
        Weight: '99g',
      },
    });

    expect(res.asin).toBe('B07CGP569X');
    expect(res.name).toBe('Logitech G304 Lightspeed Wireless Gaming Mouse');
    expect(res.source).toBe('web-research');
    expect(res.productDataVerified).toBe(false);
    expect(res.confidence).toBe('high');
    expect(res.pros).toHaveLength(3);
    expect(res.specifications?.DPI).toBe('12,000');
    // Critical safety: no fabricated price or stock status in research output
    expect((res as any).price).toBeUndefined();
    expect((res as any).stock).toBeUndefined();
  });

  it('should return a research template from researchProductByAsin stub', async () => {
    const res = await researchProductByAsin('B0B8Z7Z1N5', {
      researchNote: 'Manual review required before publishing',
    });

    expect(res.asin).toBe('B0B8Z7Z1N5');
    expect(res.source).toBe('web-research');
    expect(res.productDataVerified).toBe(false);
    expect(res.researchNote).toBe('Manual review required before publishing');
  });
});
