import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AmazonProductProvider } from '../../src/lib/products/amazon-provider.js';
import { getActiveProductProvider } from '../../src/lib/products/provider.js';

describe('Phase 7 — Amazon Provider Stub & Fallback', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.AMAZON_CREATORS_API_ENABLED;
    delete process.env.AMAZON_CREATORS_API_KEY;
    delete process.env.AMAZON_CREATORS_API_SECRET;
    delete process.env.AMAZON_ASSOCIATE_TAG;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should report status NOT_CONFIGURED when environment variables are missing', () => {
    const provider = new AmazonProductProvider();
    expect(provider.status()).toBe('NOT_CONFIGURED');
  });

  it('should return null gracefully when getProductByAsin is called while NOT_CONFIGURED', async () => {
    const provider = new AmazonProductProvider();
    const result = await provider.getProductByAsin('B016MAK38U');
    expect(result).toBeNull();
  });

  it('should fallback to ManualProductProvider when Amazon API is disabled', () => {
    const activeProvider = getActiveProductProvider();
    expect(activeProvider.name).toBe('manual-provider');
    expect(activeProvider.status()).toBe('READY');
  });
});
