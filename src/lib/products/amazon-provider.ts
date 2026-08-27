/**
 * Amazon Creators API Provider Stub
 *
 * Provides a clean architectural stub for the official Amazon Creators API.
 *
 * SAFETY INVARIANTS:
 * - Does NOT scrape Amazon, Google Images, or competitor websites.
 * - Does NOT create fake credentials or bypass Amazon terms.
 * - Explicitly reports `status() === 'NOT_CONFIGURED'` when credentials are absent.
 * - Build and publication workflows pass cleanly regardless of API status.
 */

import type { ProductProvider, ProductProviderStatus, NormalizedProduct } from './types.js';

export class AmazonProductProvider implements ProductProvider {
  public readonly name = 'amazon-creators-api';

  public status(): ProductProviderStatus {
    const isEnabled = process.env.AMAZON_CREATORS_API_ENABLED === 'true';
    const hasKey = Boolean(process.env.AMAZON_CREATORS_API_KEY);
    const hasSecret = Boolean(process.env.AMAZON_CREATORS_API_SECRET);
    const hasAssociateTag = Boolean(process.env.AMAZON_ASSOCIATE_TAG);

    if (!isEnabled || !hasKey || !hasSecret || !hasAssociateTag) {
      return 'NOT_CONFIGURED';
    }

    return 'READY';
  }

  public async getProductByAsin(asin: string): Promise<NormalizedProduct | null> {
    const currentStatus = this.status();
    if (currentStatus !== 'READY') {
      // In stub mode, do not throw or crash; return null gracefully
      return null;
    }

    // Future implementation: Official Amazon Creators API call
    throw new Error(`Amazon Creators API integration is active but network client is not implemented for ASIN ${asin}.`);
  }

  public async searchProducts(_query: string): Promise<NormalizedProduct[]> {
    const currentStatus = this.status();
    if (currentStatus !== 'READY') {
      return [];
    }

    throw new Error('Amazon Creators API search not implemented in stub mode.');
  }
}
