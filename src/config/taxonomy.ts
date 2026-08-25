export const TAXONOMY_CONFIG = {
  /**
   * Default minimum article count required for a tag archive page to become indexable.
   * Tags below this threshold render with <meta name="robots" content="noindex, follow">
   * and are excluded from sitemap.xml.
   */
  tagIndexThreshold: 5,

  /**
   * Maximum number of controlled tags allowed per article.
   */
  maxTagsPerArticle: 6,

  /**
   * Recommended tag count range for editorial consistency.
   */
  recommendedTagsRange: { min: 2, max: 5 },

  /**
   * Supported primary category slugs.
   */
  categories: [
    'beauty-makeup',
    'gaming',
    'kitchen-appliances',
    'electronics-audio',
    'home-living',
    'deals-offers',
  ] as const,
};
