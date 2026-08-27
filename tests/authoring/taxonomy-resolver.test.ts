import { describe, it, expect } from 'vitest';
import {
  resolveCategory,
  resolveSubcategory,
  resolveTags,
  resolveTaxonomy,
  validateAuthor,
  isSlugTaken,
} from '../../src/lib/authoring/taxonomy-resolver.js';
import type { CategoryData, SubcategoryData, TagData, AuthorData } from '../../src/lib/authoring/types.js';

describe('Taxonomy Resolver (Deterministic)', () => {
  const mockCategories: CategoryData[] = [
    { name: 'Gaming', slug: 'gaming', description: 'Gaming gear', icon: 'gamepad', color: '#9333ea' },
    { name: 'Kitchen & Appliances', slug: 'kitchen-appliances', description: 'Kitchen', icon: 'kitchen', color: '#f59e0b' },
  ];

  const mockSubcategories: SubcategoryData[] = [
    { name: 'Gaming Keyboards', slug: 'gaming-keyboards', category: 'gaming', description: 'Keyboards' },
    { name: 'Air Fryers', slug: 'air-fryers', category: 'kitchen-appliances', description: 'Air fryers' },
  ];

  const mockTags: TagData[] = [
    { name: 'Mechanical', slug: 'mechanical', description: 'Mechanical', status: 'active' },
    { name: 'RGB', slug: 'rgb', description: 'RGB', status: 'active' },
    { name: 'Budget', slug: 'budget', description: 'Budget', status: 'active' },
    { name: 'Old Tech', slug: 'old-tech', description: 'Old', status: 'deprecated' },
    { name: 'Wireless Old', slug: 'wireless-old', description: 'Merged', status: 'merged', mergedIntoSlug: 'wireless' },
  ];

  const mockAuthors: AuthorData[] = [
    { name: 'Shaaz', slug: 'shaaz', gender: 'male' },
    { name: 'Shifa', slug: 'shifa', gender: 'female' },
  ];

  describe('resolveCategory', () => {
    it('should resolve exact slug match', () => {
      const res = resolveCategory('gaming', mockCategories);
      expect(res.found).toBe(true);
      expect(res.slug).toBe('gaming');
    });

    it('should resolve case-insensitive name match', () => {
      const res = resolveCategory('Kitchen & Appliances', mockCategories);
      expect(res.found).toBe(true);
      expect(res.slug).toBe('kitchen-appliances');
    });

    it('should provide suggestions when category is not found', () => {
      const res = resolveCategory('game', mockCategories);
      expect(res.found).toBe(false);
      expect(res.suggestions).toContain('gaming');
    });
  });

  describe('resolveSubcategory', () => {
    it('should resolve valid subcategory under parent category', () => {
      const res = resolveSubcategory('gaming-keyboards', 'gaming', mockSubcategories);
      expect(res.found).toBe(true);
      expect(res.slug).toBe('gaming-keyboards');
    });

    it('should fail if subcategory belongs to a different category', () => {
      const res = resolveSubcategory('air-fryers', 'gaming', mockSubcategories);
      expect(res.found).toBe(false);
    });
  });

  describe('resolveTags', () => {
    it('should resolve valid active tags', () => {
      const res = resolveTags(['mechanical', 'rgb'], mockTags);
      expect(res.validSlugs).toEqual(['mechanical', 'rgb']);
      expect(res.errors).toHaveLength(0);
    });

    it('should reject tags if count exceeds 6', () => {
      const res = resolveTags(['t1', 't2', 't3', 't4', 't5', 't6', 't7'], mockTags);
      expect(res.errors[0]).toContain('exceeds maximum of 6');
    });

    it('should warn on deprecated tags and error on merged tags', () => {
      const res = resolveTags(['old-tech', 'wireless-old'], mockTags);
      expect(res.warnings[0]).toContain('deprecated');
      expect(res.errors[0]).toContain('merged');
    });
  });

  describe('resolveTaxonomy', () => {
    it('should return fully resolved taxonomy when all inputs are valid', () => {
      const res = resolveTaxonomy(
        {
          category: 'gaming',
          subcategory: 'gaming-keyboards',
          tags: ['mechanical', 'rgb'],
        },
        {
          categories: mockCategories,
          subcategories: mockSubcategories,
          tags: mockTags,
        }
      );

      expect(res.needsClarification).toBe(false);
      expect(res.errors).toHaveLength(0);
      expect(res.resolved).toEqual({
        category: 'gaming',
        subcategory: 'gaming-keyboards',
        tags: ['mechanical', 'rgb'],
        warnings: [],
      });
    });

    it('should trigger needsClarification if category is fuzzy/ambiguous', () => {
      const res = resolveTaxonomy(
        { category: 'game' },
        { categories: mockCategories, subcategories: mockSubcategories, tags: mockTags }
      );
      expect(res.needsClarification).toBe(true);
      expect(res.clarificationQuestion).toContain('gaming');
    });
  });

  describe('validateAuthor', () => {
    it('should validate an existing author slug', () => {
      const res = validateAuthor('shaaz', mockAuthors);
      expect(res.author).not.toBeNull();
      expect(res.error).toBeNull();
    });

    it('should return error and list of available authors for invalid author', () => {
      const res = validateAuthor('unknown-author', mockAuthors);
      expect(res.author).toBeNull();
      expect(res.error).toContain('Available authors: "shaaz", "shifa"');
    });
  });

  describe('isSlugTaken', () => {
    it('should check existing article slugs from real content directory', () => {
      // 7-useful-kitchen-gadgets.mdx exists in src/content/articles/
      expect(isSlugTaken('7-useful-kitchen-gadgets')).toBe(true);
      expect(isSlugTaken('completely-nonexistent-unique-slug-12345')).toBe(false);
    });
  });
});
