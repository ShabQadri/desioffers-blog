export const SITE_CONFIG = {
  name: 'DesiOffers Guides',
  brandName: 'DesiOffers',
  title: 'DesiOffers — Buying Guides & Product Recommendations',
  tagline: 'Helping you find better products and make smarter buying decisions.',
  description: 'Expert, transparent buying guides and product recommendations tailored for India. Fast, honest comparisons on tech, beauty, kitchen, electronics, and home finds.',
  url: 'https://blog.desioffers.com',
  mainSiteUrl: 'https://desioffers.com',
  defaultOgImage: '/images/brand/og-default.webp',
  author: 'DesiOffers Editorial Team',
  locale: 'en-IN',
  amazonAffiliateTag: '', // Pending production Amazon Associates ID configuration
  amazonDisclosure: 'As an Amazon Associate I earn from qualifying purchases.',
  social: {
    telegram: 'https://t.me/desioffers',
    whatsapp: 'https://whatsapp.com/channel/desioffers',
    twitter: 'https://twitter.com/desioffers',
  },
  contactEmail: 'contact@desioffers.com',
};

/**
 * Returns link to the main product/deal discovery website.
 */
export function getMainSiteUrl(path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_CONFIG.mainSiteUrl}${cleanPath}`;
}
