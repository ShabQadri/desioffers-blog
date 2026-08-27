import fs from 'node:fs';
import path from 'node:path';

function resolveAmazonAffiliateTag(): string {
  // 1. Process environment (CI/CD, CLI, or Cloudflare Pages build env)
  if (typeof process !== 'undefined' && process.env?.AMAZON_ASSOCIATE_TAG?.trim()) {
    return process.env.AMAZON_ASSOCIATE_TAG.trim();
  }

  // 2. Vite / Astro environment
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.AMAZON_ASSOCIATE_TAG?.trim()) {
      return (import.meta as any).env.AMAZON_ASSOCIATE_TAG.trim();
    }
  } catch {}

  // 3. User local ~/.env file (secure local secrets store outside git)
  try {
    if (typeof process !== 'undefined' && process.env?.USERPROFILE) {
      const envFile = path.join(process.env.USERPROFILE, '.env');
      if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf8');
        const match = content.match(/^AMAZON_ASSOCIATE_TAG\s*=\s*([^\r\n#]+)/m);
        if (match && match[1]?.trim()) {
          return match[1].trim();
        }
      }
    }
  } catch {}

  return '';
}

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
  amazonAffiliateTag: resolveAmazonAffiliateTag(),
  amazonDisclosure: 'As an Amazon Associate I earn from qualifying purchases.',
  /**
   * Default author slug used by the AI authoring workflow.
   * Must exactly match a slug in src/content/authors/.
   * The draft workflow stops and asks if this is missing or invalid.
   */
  defaultAuthor: 'shaaz',
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
