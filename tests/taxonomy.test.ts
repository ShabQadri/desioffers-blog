import { describe, it, expect } from 'vitest';
import { isTagIndexable, getTagRobotsDirective, buildBreadcrumbs } from '../src/utils/taxonomy';

describe('Taxonomy & Tag Indexing Rules', () => {
  it('should enforce noindex for tags below the article count threshold (default 5)', () => {
    const tag = { name: 'Wireless', slug: 'wireless', description: 'Wireless tech' };
    expect(isTagIndexable(tag, 3)).toBe(false);
    expect(getTagRobotsDirective(tag, 3)).toBe('noindex, follow');
  });

  it('should allow indexing for tags meeting or exceeding the threshold', () => {
    const tag = { name: 'Wireless', slug: 'wireless', description: 'Wireless tech' };
    expect(isTagIndexable(tag, 5)).toBe(true);
    expect(getTagRobotsDirective(tag, 5)).toBe('index, follow');
  });

  it('should respect explicit tag indexableOverride setting', () => {
    const tagOverrideTrue = { name: 'Special', slug: 'special', description: '', indexableOverride: true };
    expect(isTagIndexable(tagOverrideTrue, 2)).toBe(true);

    const tagOverrideFalse = { name: 'Private', slug: 'private', description: '', indexableOverride: false };
    expect(isTagIndexable(tagOverrideFalse, 10)).toBe(false);
  });

  it('should enforce noindex on deprecated or merged tags', () => {
    const mergedTag = { name: 'Old Tag', slug: 'old-tag', description: '', status: 'merged' as const };
    expect(isTagIndexable(mergedTag, 10)).toBe(false);
  });

  it('should build breadcrumbs without including tags', () => {
    const trail = buildBreadcrumbs({
      categoryName: 'Gaming',
      categorySlug: 'gaming',
      subcategoryName: 'Gaming Keyboards',
      subcategorySlug: 'gaming-keyboards',
      articleTitle: '5 Best Gaming Keyboards',
    });

    expect(trail).toHaveLength(4);
    expect(trail[0].label).toBe('Home');
    expect(trail[1].url).toBe('/category/gaming/');
    expect(trail[2].url).toBe('/category/gaming/gaming-keyboards/');
    expect(trail[3].isCurrent).toBe(true);
  });
});
