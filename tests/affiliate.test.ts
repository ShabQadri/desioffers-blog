import { describe, it, expect } from 'vitest';
import { buildAmazonAffiliateUrl, AFFILIATE_LINK_ATTRIBUTES } from '../src/utils/affiliate';

describe('Amazon Affiliate Link Integrity', () => {
  it('should attach associate tag to valid Amazon URLs when tag is provided', () => {
    const raw = 'https://www.amazon.in/dp/B016MAK38U';
    const result = buildAmazonAffiliateUrl(raw, 'desioffers-21');
    expect(result).toContain('tag=desioffers-21');
  });

  it('should build valid URL when given an ASIN directly with a tag', () => {
    const asin = 'B016MAK38U';
    const result = buildAmazonAffiliateUrl(asin, 'desioffers-21');
    expect(result).toBe('https://www.amazon.in/dp/B016MAK38U?tag=desioffers-21');
  });

  it('should omit tag parameter cleanly when affiliate tag is empty/unconfigured', () => {
    const raw = 'https://www.amazon.in/dp/B016MAK38U';
    const result = buildAmazonAffiliateUrl(raw, '');
    expect(result).toBe('https://www.amazon.in/dp/B016MAK38U');
  });

  it('should specify sponsored nofollow attributes for Amazon affiliate links', () => {
    expect(AFFILIATE_LINK_ATTRIBUTES.rel).toContain('sponsored');
    expect(AFFILIATE_LINK_ATTRIBUTES.rel).toContain('nofollow');
  });
});
