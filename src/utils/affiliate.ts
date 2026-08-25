import { SITE_CONFIG } from '../config/site';

/**
 * Standard rel attributes for outbound Amazon commercial affiliate links.
 */
export const AFFILIATE_LINK_ATTRIBUTES = {
  rel: 'sponsored nofollow noopener',
  target: '_blank',
};

/**
 * Appends the Amazon Associates affiliate tag to a product URL or ASIN.
 * If no tag is configured, returns clean canonical URL without a fake tag.
 */
export function buildAmazonAffiliateUrl(
  urlOrAsin: string,
  customTag?: string
): string {
  const tagToUse = customTag !== undefined ? customTag : SITE_CONFIG.amazonAffiliateTag;

  if (!urlOrAsin) return '#';

  let baseUrl: string;

  if (/^[A-Z0-9]{10}$/i.test(urlOrAsin.trim())) {
    baseUrl = `https://www.amazon.in/dp/${urlOrAsin.trim()}`;
  } else {
    baseUrl = urlOrAsin.trim();
  }

  try {
    const parsed = new URL(baseUrl);
    if (tagToUse && tagToUse.trim().length > 0) {
      parsed.searchParams.set('tag', tagToUse.trim());
    } else {
      parsed.searchParams.delete('tag');
    }
    return parsed.toString();
  } catch (err) {
    return baseUrl;
  }
}
