/**
 * Product Provider Registry & Factory
 *
 * Resolves the active ProductProvider based on environment configuration.
 * Defaults cleanly to ManualProductProvider.
 */

import type { ProductProvider } from './types.js';
import { ManualProductProvider } from './manual-provider.js';
import { AmazonProductProvider } from './amazon-provider.js';

export function getActiveProductProvider(): ProductProvider {
  const amazonProvider = new AmazonProductProvider();
  if (amazonProvider.status() === 'READY') {
    return amazonProvider;
  }

  return new ManualProductProvider();
}
