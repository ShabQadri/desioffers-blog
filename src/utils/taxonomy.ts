import { TAXONOMY_CONFIG } from '../config/taxonomy';

export interface TagMeta {
  name: string;
  slug: string;
  description: string;
  status?: 'active' | 'deprecated' | 'merged';
  mergedIntoSlug?: string;
  indexableOverride?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  url: string;
  isCurrent?: boolean;
}

/**
 * Determines whether a tag archive page is eligible for search index inclusion.
 */
export function isTagIndexable(tag: TagMeta, articleCount: number): boolean {
  if (tag.status === 'deprecated' || tag.status === 'merged') {
    return false;
  }

  if (typeof tag.indexableOverride === 'boolean') {
    return tag.indexableOverride;
  }

  return articleCount >= TAXONOMY_CONFIG.tagIndexThreshold;
}

/**
 * Returns the exact robots meta tag value for a tag archive page.
 */
export function getTagRobotsDirective(tag: TagMeta, articleCount: number): string {
  return isTagIndexable(tag, articleCount) ? 'index, follow' : 'noindex, follow';
}

/**
 * Builds the strict hierarchical breadcrumb trail for an article or category.
 * Enforces: Home -> Primary Category -> Subcategory (optional) -> Title
 * Explicitly excludes tags from the primary breadcrumb path.
 */
export function buildBreadcrumbs(params: {
  categoryName: string;
  categorySlug: string;
  subcategoryName?: string;
  subcategorySlug?: string;
  articleTitle?: string;
}): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { label: 'Home', url: '/' },
    { label: params.categoryName, url: `/category/${params.categorySlug}/` },
  ];

  if (params.subcategoryName && params.subcategorySlug) {
    items.push({
      label: params.subcategoryName,
      url: `/category/${params.categorySlug}/${params.subcategorySlug}/`,
    });
  }

  if (params.articleTitle) {
    items.push({
      label: params.articleTitle,
      url: '#',
      isCurrent: true,
    });
  } else if (items.length > 0) {
    items[items.length - 1].isCurrent = true;
  }

  return items;
}
