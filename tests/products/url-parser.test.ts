import { describe, it, expect } from 'vitest';
import {
  parseAmazonUrl,
  parseAmazonUrls,
  extractAsin,
  isValidAsinFormat,
} from '../../src/lib/products/url-parser.js';

describe('Phase 11A — Amazon URL Parser & ASIN Extractor', () => {
  describe('1. ASIN Extraction from various Amazon.in URL formats', () => {
    it('should extract ASIN from standard /dp/ URL', () => {
      const url = 'https://www.amazon.in/dp/B07CGP569X';
      expect(extractAsin(url)).toBe('B07CGP569X');
    });

    it('should extract ASIN from SEO slug with /dp/', () => {
      const url = 'https://www.amazon.in/Logitech-G304-Lightspeed-Wireless-Gaming/dp/B07CGP569X';
      expect(extractAsin(url)).toBe('B07CGP569X');
    });

    it('should extract ASIN from /gp/product/ URL', () => {
      const url = 'https://amazon.in/gp/product/B016MAK38U';
      expect(extractAsin(url)).toBe('B016MAK38U');
    });

    it('should extract ASIN from /product/ URL', () => {
      const url = 'https://www.amazon.in/product/B08DGYX1R9';
      expect(extractAsin(url)).toBe('B08DGYX1R9');
    });

    it('should extract ASIN from short amzn.in /d/ URL', () => {
      const url = 'https://amzn.in/d/B0B8Z7Z1N5';
      expect(extractAsin(url)).toBe('B0B8Z7Z1N5');
    });

    it('should extract direct 10-char ASIN string', () => {
      expect(extractAsin('B07CGP569X')).toBe('B07CGP569X');
      expect(extractAsin('b07cgp569x')).toBe('B07CGP569X');
    });

    it('should handle complex query and tracking parameters', () => {
      const url = 'https://www.amazon.in/dp/B07CGP569X?keywords=gaming+mouse&qid=1680000000&sr=8-3&tag=oldtag-21#customerReviews';
      expect(extractAsin(url)).toBe('B07CGP569X');
    });
  });

  describe('2. Invalid & Non-Amazon URL Rejection', () => {
    it('should reject non-Amazon domains', () => {
      expect(extractAsin('https://flipkart.com/dp/B07CGP569X')).toBeNull();
      expect(extractAsin('https://myntra.com/product/B07CGP569X')).toBeNull();
      expect(extractAsin('https://example.com/p/1234567890')).toBeNull();
    });

    it('should reject invalid or malformed ASINs', () => {
      expect(extractAsin('https://www.amazon.in/dp/INVALID_ASIN_123')).toBeNull();
      expect(extractAsin('https://www.amazon.in/dp/123')).toBeNull();
      expect(extractAsin('')).toBeNull();
      expect(isValidAsinFormat('SHORT')).toBe(false);
      expect(isValidAsinFormat('TOOLONGASIN123')).toBe(false);
      expect(isValidAsinFormat('B07CGP569X')).toBe(true);
    });
  });

  describe('3. Structured URL Parsing', () => {
    it('should parse an Amazon.in URL into canonical, affiliate, and metadata', () => {
      const parsed = parseAmazonUrl('https://www.amazon.in/dp/B07CGP569X', {
        price: '₹2,499',
        badge: 'Best Overall',
        ranking: 1,
      });

      expect(parsed).not.toBeNull();
      expect(parsed?.asin).toBe('B07CGP569X');
      expect(parsed?.canonicalUrl).toBe('https://www.amazon.in/dp/B07CGP569X');
      expect(parsed?.affiliateUrl).toContain('https://www.amazon.in/dp/B07CGP569X');
      expect(parsed?.price).toBe('₹2,499');
      expect(parsed?.badge).toBe('Best Overall');
      expect(parsed?.ranking).toBe(1);
    });

    it('should parse an AmazonUrlInput object directly', () => {
      const parsed = parseAmazonUrl({
        url: 'https://www.amazon.in/gp/product/B0B8Z7Z1N5?ref=sr_1_1',
        price: '₹1,499',
        badge: 'Best Value',
        ranking: 2,
      });

      expect(parsed).not.toBeNull();
      expect(parsed?.asin).toBe('B0B8Z7Z1N5');
      expect(parsed?.canonicalUrl).toBe('https://www.amazon.in/dp/B0B8Z7Z1N5');
      expect(parsed?.price).toBe('₹1,499');
      expect(parsed?.badge).toBe('Best Value');
      expect(parsed?.ranking).toBe(2);
    });

    it('should return null when parsing invalid URL', () => {
      expect(parseAmazonUrl('https://google.com')).toBeNull();
    });
  });

  describe('4. Batch URL Parsing', () => {
    it('should parse multiple Amazon URLs and assign default rankings', () => {
      const inputs = [
        { url: 'https://www.amazon.in/dp/B07CGP569X', badge: 'Top Pick' },
        { url: 'https://www.amazon.in/dp/B016MAK38U', price: '₹1,999' },
        'https://www.amazon.in/dp/B0B8Z7Z1N5',
        'https://invalid.com/not-amazon',
      ];

      const results = parseAmazonUrls(inputs);

      expect(results).toHaveLength(3);
      expect(results[0].asin).toBe('B07CGP569X');
      expect(results[0].ranking).toBe(1);
      expect(results[0].badge).toBe('Top Pick');

      expect(results[1].asin).toBe('B016MAK38U');
      expect(results[1].ranking).toBe(2);
      expect(results[1].price).toBe('₹1,999');

      expect(results[2].asin).toBe('B0B8Z7Z1N5');
      expect(results[2].ranking).toBe(3);
    });
  });
});
