/**
 * Phase 11I — Product Fact Sheet & Dynamic Verification Gate Tests
 *
 * Exhaustive test suite verifying:
 * 1. Exact ASIN identity matching and mismatch detection
 * 2. Brand, model, and variant mismatch guards (e.g. Z2 vs Z3)
 * 3. Dynamic category-aware fact discovery (audio, gaming, kitchen, beauty, home)
 * 4. Verification that unrelated categories are NOT forced to share universal checklists
 * 5. Evidence-backed specification handling and unknown field preservation
 * 6. Multi-source conflict detection and material conflict blocking
 * 7. Source authority hierarchy ranking
 * 8. Article structured claim verification vs approved fact sheet
 * 9. Quality pipeline integration and publication blocker behavior
 * 10. Regression tests on real ASIN fixtures (B0FBRGKXHG, B08TV2P1N8, B0DVC6MP1D, B0D6Y67HQ1, B0BJF85YRR)
 */

import { describe, it, expect } from 'vitest';
import {
  createFactSheet,
  verifyProductIdentity,
  detectFactConflicts,
  getSourceAuthorityRank,
  getRelevantFactFields,
  verifyArticleProductAgainstFactSheet,
  loadFactSheetByAsin,
  listAllFactSheets,
  type SpecificationFact,
  type SourceRecord,
} from '../../src/lib/products/index.js';

describe('Phase 11I — Product Fact Sheet & Verification Engine', () => {
  const dummySource: SourceRecord = {
    sourceType: 'manufacturer',
    authority: 'manufacturer-official',
    title: 'Official Technical Datasheet',
    retrievedAt: '2026-08-27T18:00:00.000Z',
    evidence: 'Official spec sheet',
  };

  const amazonSource: SourceRecord = {
    sourceType: 'amazon',
    authority: 'amazon-listing',
    title: 'Amazon Product Details',
    retrievedAt: '2026-08-27T18:00:00.000Z',
    evidence: 'Product description section',
  };

  describe('1. Product Identity Verification', () => {
    const factSheet = createFactSheet({
      asin: 'B0FBRGKXHG',
      identity: {
        asin: 'B0FBRGKXHG',
        brand: 'OnePlus',
        productName: 'OnePlus Bullets Wireless Z3',
        model: 'Bullets Wireless Z3',
        variant: 'Black',
        amazonUrl: 'https://www.amazon.in/dp/B0FBRGKXHG',
      },
      sources: [dummySource],
    });

    it('should verify exact ASIN, brand, and model match', () => {
      const result = verifyProductIdentity(
        {
          asin: 'B0FBRGKXHG',
          brand: 'OnePlus',
          model: 'Bullets Wireless Z3',
        },
        factSheet
      );
      expect(result.isMatch).toBe(true);
      expect(result.status).toBe('verified');
      expect(result.reasons).toHaveLength(0);
    });

    it('should detect ASIN mismatch', () => {
      const result = verifyProductIdentity(
        {
          asin: 'B08TV2P1N8',
          brand: 'OnePlus',
          model: 'Bullets Wireless Z3',
        },
        factSheet
      );
      expect(result.isMatch).toBe(false);
      expect(result.status).toBe('mismatch');
      expect(result.reasons[0]).toContain('ASIN mismatch');
    });

    it('should detect Brand mismatch', () => {
      const result = verifyProductIdentity(
        {
          asin: 'B0FBRGKXHG',
          brand: 'boAt',
          model: 'Bullets Wireless Z3',
        },
        factSheet
      );
      expect(result.isMatch).toBe(false);
      expect(result.status).toBe('mismatch');
      expect(result.reasons[0]).toContain('Brand mismatch');
    });

    it('should detect critical Model mismatch (e.g. Z2 vs Z3 regression)', () => {
      const result = verifyProductIdentity(
        {
          asin: 'B0FBRGKXHG',
          brand: 'OnePlus',
          model: 'Bullets Wireless Z2',
        },
        factSheet
      );
      expect(result.isMatch).toBe(false);
      expect(result.status).toBe('mismatch');
      expect(result.reasons[0]).toContain('Model mismatch');
    });

    it('should detect Variant mismatch when specified', () => {
      const result = verifyProductIdentity(
        {
          asin: 'B0FBRGKXHG',
          brand: 'OnePlus',
          model: 'Bullets Wireless Z3',
          variant: 'ANC Edition',
        },
        factSheet
      );
      expect(result.isMatch).toBe(false);
      expect(result.status).toBe('mismatch');
      expect(result.reasons[0]).toContain('Variant mismatch');
    });
  });

  describe('2. Dynamic Category-Aware Fact Discovery', () => {
    it('should return audio-relevant fields for neckbands and headphones', () => {
      const fields = getRelevantFactFields({
        category: 'electronics-audio',
        subcategory: 'headphones',
        productType: 'neckband',
      });

      expect(fields).toContain('driverSize');
      expect(fields).toContain('batteryLife');
      expect(fields).toContain('chargingSpeed');
      expect(fields).toContain('ipRating');
      expect(fields).not.toContain('switchType');
      expect(fields).not.toContain('capacity');
    });

    it('should return keyboard-relevant fields for gaming keyboards', () => {
      const fields = getRelevantFactFields({
        category: 'gaming',
        subcategory: 'gaming-keyboards',
        productType: 'keyboard',
      });

      expect(fields).toContain('switchType');
      expect(fields).toContain('layout');
      expect(fields).toContain('pollingRate');
      expect(fields).not.toContain('driverSize');
      expect(fields).not.toContain('temperatureRange');
    });

    it('should return air-fryer relevant fields for kitchen appliances', () => {
      const fields = getRelevantFactFields({
        category: 'kitchen-appliances',
        subcategory: 'air-fryers',
        productType: 'air-fryer',
      });

      expect(fields).toContain('capacity');
      expect(fields).toContain('wattage');
      expect(fields).toContain('temperatureRange');
      expect(fields).not.toContain('driverSize');
      expect(fields).not.toContain('switchType');
    });

    it('should return makeup-kit relevant fields for beauty', () => {
      const fields = getRelevantFactFields({
        category: 'beauty-makeup',
        subcategory: 'makeup-kits',
        productType: 'makeup-kit',
      });

      expect(fields).toContain('itemCount');
      expect(fields).toContain('skinType');
      expect(fields).toContain('finish');
    });
  });

  describe('3. Source Authority Hierarchy', () => {
    it('should rank manufacturer and official docs highest (rank 1)', () => {
      expect(getSourceAuthorityRank('manufacturer-official')).toBe(1);
      expect(getSourceAuthorityRank('official-documentation')).toBe(1);
    });

    it('should rank amazon listing as rank 2', () => {
      expect(getSourceAuthorityRank('amazon-listing')).toBe(2);
    });

    it('should rank press/reputable retailers as rank 3 and secondary as rank 4', () => {
      expect(getSourceAuthorityRank('reputable-retailer-or-press')).toBe(3);
      expect(getSourceAuthorityRank('secondary-source')).toBe(4);
    });

    it('should rank unverified manual entries lowest (rank 5)', () => {
      expect(getSourceAuthorityRank('manual-unverified')).toBe(5);
    });
  });

  describe('4. Multi-Source Conflict Detection', () => {
    it('should detect material conflict when two sources report different battery life', () => {
      const facts: SpecificationFact[] = [
        {
          field: 'batteryLife',
          value: '40 hours',
          source: dummySource,
          confidence: 'high',
          status: 'verified',
        },
        {
          field: 'batteryLife',
          value: '60 hours',
          source: amazonSource,
          confidence: 'medium',
          status: 'verified',
        },
      ];

      const conflicts = detectFactConflicts(facts);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].field).toBe('batteryLife');
      expect(conflicts[0].material).toBe(true);
      expect(conflicts[0].recommendedAction).toContain('Human review required');
    });

    it('should not flag conflict when multiple sources agree', () => {
      const facts: SpecificationFact[] = [
        {
          field: 'driverSize',
          value: '12.4mm',
          source: dummySource,
          confidence: 'high',
          status: 'verified',
        },
        {
          field: 'driverSize',
          value: '12.4mm',
          source: amazonSource,
          confidence: 'high',
          status: 'verified',
        },
      ];

      const conflicts = detectFactConflicts(facts);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('5. Fact Sheet Construction & Unknown Value Handling', () => {
    it('should preserve unknown fields as missing without fabricating defaults', () => {
      const sheet = createFactSheet({
        asin: 'B0TESTASIN1',
        identity: {
          asin: 'B0TESTASIN1',
          brand: 'BrandX',
          productName: 'BrandX Earphones',
          model: 'BX-1',
        },
        categoryInfo: {
          category: 'electronics-audio',
          subcategory: 'headphones',
        },
        specifications: {
          driverSize: {
            value: '10mm',
            source: dummySource,
          },
        },
      });

      expect(sheet.specifications['driverSize'].value).toBe('10mm');
      expect(sheet.specifications['batteryLife']).toBeUndefined();
      expect(sheet.verification.missingFields).toContain('batteryLife');
      expect(sheet.verification.missingFields).toContain('latency');
      expect(sheet.verification.verifiedFields).toContain('driverSize');
    });
  });

  describe('6. Article Claim Consistency Verifier', () => {
    const sheet = createFactSheet({
      asin: 'B0FBRGKXHG',
      identity: {
        asin: 'B0FBRGKXHG',
        brand: 'OnePlus',
        productName: 'OnePlus Bullets Wireless Z3',
        model: 'Bullets Wireless Z3',
      },
      categoryInfo: {
        category: 'electronics-audio',
        subcategory: 'headphones',
      },
      specifications: {
        driverSize: {
          value: '12.4mm',
          source: dummySource,
        },
        batteryLife: {
          value: '30 hours',
          source: dummySource,
        },
      },
    });

    it('should pass when article structured claims match fact sheet', () => {
      const result = verifyArticleProductAgainstFactSheet(
        {
          name: 'OnePlus Bullets Wireless Z3',
          brand: 'OnePlus',
          model: 'Bullets Wireless Z3',
          asin: 'B0FBRGKXHG',
          specifications: {
            driverSize: '12.4mm',
            batteryLife: '30 hours',
          },
        },
        sheet
      );

      expect(result.hasBlockers).toBe(false);
      expect(result.identityVerified).toBe(true);
      expect(result.verifiedFactsCount).toBe(2);
    });

    it('should trigger BLOCKER on model mismatch (Z2 vs Z3)', () => {
      const result = verifyArticleProductAgainstFactSheet(
        {
          name: 'OnePlus Bullets Wireless Z2',
          brand: 'OnePlus',
          model: 'Bullets Wireless Z2',
          asin: 'B0FBRGKXHG',
        },
        sheet
      );

      expect(result.hasBlockers).toBe(true);
      expect(result.identityVerified).toBe(false);
      const blocker = result.issues.find((i) => i.code === 'PRODUCT_IDENTITY_MISMATCH');
      expect(blocker).toBeDefined();
      expect(blocker?.severity).toBe('BLOCKER');
    });

    it('should trigger BLOCKER when article claims conflicting specification', () => {
      const result = verifyArticleProductAgainstFactSheet(
        {
          name: 'OnePlus Bullets Wireless Z3',
          brand: 'OnePlus',
          model: 'Bullets Wireless Z3',
          asin: 'B0FBRGKXHG',
          specifications: {
            batteryLife: '60 hours',
          },
        },
        sheet
      );

      expect(result.hasBlockers).toBe(true);
      const blocker = result.issues.find((i) => i.code === 'ARTICLE_FACT_MISMATCH');
      expect(blocker).toBeDefined();
      expect(blocker?.message).toContain('claims "60 hours" but approved fact sheet states "30 hours"');
    });

    it('should trigger BLOCKER when article introduces unapproved category-relevant specification', () => {
      const result = verifyArticleProductAgainstFactSheet(
        {
          name: 'OnePlus Bullets Wireless Z3',
          brand: 'OnePlus',
          model: 'Bullets Wireless Z3',
          asin: 'B0FBRGKXHG',
          specifications: {
            latency: '45ms',
          },
        },
        sheet
      );

      expect(result.hasBlockers).toBe(true);
      const blocker = result.issues.find((i) => i.code === 'UNAPPROVED_FACT_CLAIM');
      expect(blocker).toBeDefined();
    });

    it('should trigger BLOCKER if fact sheet is missing for a real article', () => {
      const result = verifyArticleProductAgainstFactSheet(
        {
          name: 'Some Product',
          asin: 'B0UNKNOWN12',
        },
        null,
        { requireFactSheet: true }
      );

      expect(result.hasBlockers).toBe(true);
      const blocker = result.issues.find((i) => i.code === 'MISSING_FACT_SHEET');
      expect(blocker).toBeDefined();
      expect(blocker?.severity).toBe('BLOCKER');
    });
  });

  describe('7. Regression Fixtures (All Five Neckband ASINs)', () => {
    const rootDir = process.cwd();

    it('should load B0FBRGKXHG (OnePlus Bullets Wireless Z3) and detect Z2 mismatch', () => {
      const sheet = loadFactSheetByAsin('B0FBRGKXHG', rootDir);
      expect(sheet).not.toBeNull();
      expect(sheet?.identity.brand).toBe('OnePlus');
      expect(sheet?.identity.model).toBe('Bullets Wireless Z3');

      const claimCheck = verifyArticleProductAgainstFactSheet(
        {
          name: 'OnePlus Bullets Wireless Z2 Bluetooth Neckband Earphones',
          brand: 'OnePlus',
          model: 'Bullets Wireless Z2',
          asin: 'B0FBRGKXHG',
        },
        sheet
      );

      expect(claimCheck.hasBlockers).toBe(true);
      expect(claimCheck.identityVerified).toBe(false);
    });

    it('should load B08TV2P1N8 (boAt Rockerz 255 Pro+) and verify 40h battery & IPX7', () => {
      const sheet = loadFactSheetByAsin('B08TV2P1N8', rootDir);
      expect(sheet).not.toBeNull();
      expect(sheet?.identity.brand).toBe('boAt');
      expect(sheet?.identity.model).toBe('Rockerz 255 Pro+');
      expect(sheet?.specifications.batteryLife.value).toBe('40 hours');
      expect(sheet?.specifications.ipRating.value).toBe('IPX7');
      expect(sheet?.specifications.chargingSpeed.value).toBe('10 min = 10 hours');
    });

    it('should load B0DVC6MP1D (realme Buds Wireless 3 Neo) and verify 13.4mm driver & 45ms latency', () => {
      const sheet = loadFactSheetByAsin('B0DVC6MP1D', rootDir);
      expect(sheet).not.toBeNull();
      expect(sheet?.identity.brand).toBe('realme');
      expect(sheet?.identity.model).toBe('Buds Wireless 3 Neo');
      expect(sheet?.specifications.driverSize.value).toBe('13.4mm');
      expect(sheet?.specifications.latency.value).toBe('45ms');
    });

    it('should load B0D6Y67HQ1 (boAt Rockerz 255 Touch) and verify 10mm driver & touch controls', () => {
      const sheet = loadFactSheetByAsin('B0D6Y67HQ1', rootDir);
      expect(sheet).not.toBeNull();
      expect(sheet?.identity.brand).toBe('boAt');
      expect(sheet?.identity.model).toBe('Rockerz 255 Touch');
      expect(sheet?.specifications.driverSize.value).toBe('10mm');
      expect(sheet?.specifications.batteryLife.value).toBe('30 hours');
      expect(sheet?.specifications.touchControls.value).toContain('touch');

      const claimCheck = verifyArticleProductAgainstFactSheet(
        {
          name: 'boAt Rockerz 255 Touch Bluetooth Wireless Neckband',
          brand: 'boAt',
          model: 'Rockerz 255 Touch',
          asin: 'B0D6Y67HQ1',
        },
        sheet
      );

      expect(claimCheck.hasBlockers).toBe(false);
      expect(claimCheck.identityVerified).toBe(true);
    });

    it('should load B0BJF85YRR (Portronics Harmonics Z5) and verify 33h battery & IPX4', () => {
      const sheet = loadFactSheetByAsin('B0BJF85YRR', rootDir);
      expect(sheet).not.toBeNull();
      expect(sheet?.identity.brand).toBe('Portronics');
      expect(sheet?.identity.model).toBe('Harmonics Z5');
      expect(sheet?.specifications.batteryLife.value).toBe('33 hours');
      expect(sheet?.specifications.ipRating.value).toBe('IPX4');
    });

    it('should list all stored fact sheets correctly', () => {
      const all = listAllFactSheets(rootDir);
      expect(all.length).toBeGreaterThanOrEqual(5);
      const asins = all.map((s) => s.asin);
      expect(asins).toContain('B0FBRGKXHG');
      expect(asins).toContain('B08TV2P1N8');
      expect(asins).toContain('B0DVC6MP1D');
      expect(asins).toContain('B0D6Y67HQ1');
      expect(asins).toContain('B0BJF85YRR');
    });
  });
});
