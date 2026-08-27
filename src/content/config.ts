import { defineCollection, reference, z } from 'astro:content';

// 1. Authors Collection
const authorsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    gender: z.enum(['male', 'female']).optional(),
    role: z.string().optional(),
    bio: z.string().optional(),
    avatar: z.string().optional(),
    social: z.object({
      twitter: z.string().optional(),
      linkedin: z.string().optional(),
      email: z.string().optional(),
    }).optional(),
  }),
});

// 2. Categories Collection (Primary Hierarchy)
const categoriesCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    description: z.string(),
    icon: z.string(),
    color: z.string(),
    featured: z.boolean().default(false),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
  }),
});

// 3. Subcategories Collection (Nested Hierarchy)
const subcategoriesCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    category: reference('categories'), // Belongs to primary category
    description: z.string(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
  }),
});

// 4. Controlled Tags Registry Collection
const tagsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    description: z.string(),
    status: z.enum(['active', 'deprecated', 'merged']).default('active'),
    mergedIntoSlug: z.string().optional(),
    indexableOverride: z.boolean().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
  }),
});

// 5. Topic Hubs Collection (Manually Curated Editorial Landing Pages)
const topicHubsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    heroImage: z.string(),
    featuredCategory: reference('categories'),
    relatedSubcategories: z.array(reference('subcategories')).optional(),
    relatedTags: z.array(reference('tags')).optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
  }),
});

// 6. Deals Collection
const dealsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    productName: z.string(),
    brand: z.string(),
    asin: z.string().optional(),
    originalPrice: z.string(),
    dealPrice: z.string(),
    discountPercent: z.number(),
    affiliateUrl: z.string(),
    category: reference('categories'),
    verifiedDate: z.string(),
    expiryNote: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

// 7. Articles Collection (Buying Guides)
const articlesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().max(100),
    slug: z.string().optional(),
    description: z.string().max(160),
    articleType: z.enum([
      'buying-guide',
      'best-products',
      'comparison',
      'how-to-choose',
      'gift-guide',
      'deal-guide',
    ]).default('buying-guide'),
    publishedDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    lastVerified: z.coerce.date(),
    productDataVerified: z.boolean().default(false),
    priceVerified: z.boolean().default(true),
    availabilityVerified: z.boolean().default(true),
    author: reference('authors'),
    category: reference('categories'), // MANDATORY: Exactly 1 primary category
    subcategory: reference('subcategories').optional(), // OPTIONAL: Subcategory
    tags: z.array(reference('tags')).optional().default([]), // OPTIONAL: 0-6 controlled tags
    heroImage: z.string(),
    heroImageAlt: z.string(),
    heroImageStatus: z.enum([
      'ready',
      'needs-generation',
      'fallback-approved',
    ]).default('ready'),
    heroImageSource: z.enum([
      'ai-generated',
      'user-provided',
      'licensed',
      'r2',
    ]).optional(),
    heroImageRightsStatus: z.enum([
      'original',
      'authorized',
      'needs-review',
      'restricted',
    ]).optional(),
    featured: z.boolean().default(false),
    affiliateDisclosure: z.string().optional(),
    readingTime: z.number().default(5),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    draft: z.boolean().default(false),
    quickPicks: z.array(z.object({
      badge: z.string(), // e.g. "BEST OVERALL", "BEST BUDGET"
      name: z.string(),
      asin: z.string().optional(),
      affiliateUrl: z.string(),
      priceDisplay: z.string().optional(),
    })).optional(),
    products: z.array(z.object({
      position: z.number(),
      name: z.string(),
      brand: z.string(),
      model: z.string().optional(),
      asin: z.string().optional(),
      image: z.string().default(''),
      imageAlt: z.string().default(''),
      imageSource: z.enum([
        'r2',
        'ai-generated',
        'licensed',
        'amazon-api',
        'none',
      ]).default('none'),
      imageRightsStatus: z.enum([
        'original',
        'authorized',
        'needs-review',
        'restricted',
      ]).optional(),
      editorialBadge: z.string().optional(),
      shortDescription: z.string(),
      bestFor: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      priceDisplay: z.string().optional(),
      priceObservedAt: z.union([z.string(), z.date()]).transform((val) => (val instanceof Date ? val.toISOString() : val)).optional(),
      priceVerification: z.enum(['unknown', 'user-observed', 'verified']).default('unknown').optional(),
      availabilityNote: z.string().optional(),
      availabilityVerification: z.enum(['unknown', 'verified', 'out-of-stock']).default('unknown').optional(),
      affiliateUrl: z.string(),
      researchNote: z.string().optional(),
    })),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
    sources: z.array(z.string()).optional(),
  }),
});

export const collections = {
  authors: authorsCollection,
  categories: categoriesCollection,
  subcategories: subcategoriesCollection,
  tags: tagsCollection,
  topicHubs: topicHubsCollection,
  deals: dealsCollection,
  articles: articlesCollection,
};
