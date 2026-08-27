import { describe, it, expect } from 'vitest';
import { ManualProductProvider } from '../../src/lib/products/manual-provider.js';

describe('Phase 7 — Manual Product Provider', () => {
  it('should report status READY', () => {
    const provider = new ManualProductProvider();
    expect(provider.status()).toBe('READY');
  });

  it('should create normalized products with source set to manual', () => {
    const provider = new ManualProductProvider();
    const product = provider.createProduct({
      name: 'Cosmic Byte CB-GK-16 Firefly',
      brand: 'Cosmic Byte',
      asin: 'B08G1QXYZ1',
      shortDescription: 'Compact mechanical keyboard with blue switches.',
      bestFor: 'Entry-level mechanical keyboard buyers',
      pros: ['Great value', 'Customizable RGB modes'],
      cons: ['Plastic top plate'],
    }, 2);

    expect(product.position).toBe(2);
    expect(product.source).toBe('manual');
    expect(product.name).toBe('Cosmic Byte CB-GK-16 Firefly');
    expect(product.brand).toBe('Cosmic Byte');
    expect(product.imageSource).toBe('none');
  });
});
