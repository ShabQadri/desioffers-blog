/**
 * Manual Product Provider
 *
 * Implements the ProductProvider interface for manual/editor-provided product data.
 * Used for all article drafting in the current production state.
 */

import type { ProductProvider, ProductProviderStatus, NormalizedProduct, ManualProductInput } from './types.js';
import { normalizeProduct } from './normalizer.js';

export class ManualProductProvider implements ProductProvider {
  public readonly name = 'manual-provider';

  public status(): ProductProviderStatus {
    return 'READY';
  }

  public async getProductByAsin(_asin: string): Promise<NormalizedProduct | null> {
    // Manual provider does not maintain an external database by default;
    // products are supplied directly in article drafts.
    return null;
  }

  public async searchProducts(_query: string): Promise<NormalizedProduct[]> {
    return [];
  }

  public createProduct(input: ManualProductInput, position: number = 1): NormalizedProduct {
    return normalizeProduct({ ...input, source: 'manual' }, position);
  }
}
