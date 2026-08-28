/**
 * Product Data Module
 *
 * Re-exports URL parsing, product normalization, validation,
 * and fact-sheet verification services for DesiOffers Guides.
 */

export * from './types.js';
export * from './url-parser.js';
export * from './normalizer.js';
export * from './validation.js';
export * from './provider.js';
export * from './manual-provider.js';
export * from './amazon-provider.js';
export * from './research-stub.js';

// Phase 11I: Product Fact Sheet & Verification Engine
export * from './fact-sheet-types.js';
export * from './fact-sheet.js';
export * from './fact-sheet-verifier.js';
export * from './fact-sheet-store.js';
