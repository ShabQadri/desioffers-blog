/**
 * Taxonomy Resolver
 *
 * Deterministic filesystem-based taxonomy validation.
 * Reads category, subcategory, tag, and author data from src/content/.
 * No AI reasoning. Input → validated slugs or clarification request.
 *
 * Antigravity provides the raw user-intent strings (e.g. "Gaming Keyboards").
 * This module resolves them to exact content-collection slugs.
 */

import fs from 'fs';
import path from 'path';
import type {
  CategoryData,
  SubcategoryData,
  TagData,
  AuthorData,
  TaxonomyResolutionResult,
  ResolvedTaxonomy,
} from './types.js';

// ---------------------------------------------------------------------------
// Content directory paths
// ---------------------------------------------------------------------------

function getContentDir(): string {
  // Works from both project root and scripts/ subdir
  const cwd = process.cwd();
  return path.join(cwd, 'src', 'content');
}

// ---------------------------------------------------------------------------
// Data loaders — reads JSON files from content collections
// ---------------------------------------------------------------------------

export function loadCategories(): CategoryData[] {
  const dir = path.join(getContentDir(), 'categories');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as CategoryData);
}

export function loadSubcategories(): SubcategoryData[] {
  const dir = path.join(getContentDir(), 'subcategories');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as SubcategoryData);
}

export function loadTags(): TagData[] {
  const dir = path.join(getContentDir(), 'tags');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as TagData);
}

export function loadAuthors(): AuthorData[] {
  const dir = path.join(getContentDir(), 'authors');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as AuthorData);
}

// ---------------------------------------------------------------------------
// Author validation
// ---------------------------------------------------------------------------

/**
 * Validates that an author slug exists in src/content/authors/.
 * The draft workflow MUST call this before proceeding.
 *
 * @returns The AuthorData if found, or null with a clear error message.
 */
export function validateAuthor(
  slug: string,
  authors?: AuthorData[]
): { author: AuthorData | null; error: string | null } {
  const all = authors ?? loadAuthors();
  const found = all.find((a) => a.slug === slug);
  if (!found) {
    const available = all.map((a) => `"${a.slug}"`).join(', ');
    return {
      author: null,
      error:
        `Author slug "${slug}" does not exist in src/content/authors/. ` +
        `Available authors: ${available}. ` +
        `Please provide a valid author slug before continuing.`,
    };
  }
  return { author: found, error: null };
}

// ---------------------------------------------------------------------------
// Fuzzy matching helper
// ---------------------------------------------------------------------------

/**
 * Simple case-insensitive substring and slug-normalised match.
 * Used to give helpful suggestions when input doesn't exactly match a slug.
 */
function fuzzyMatch(input: string, candidates: string[]): string[] {
  const normalised = input.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  return candidates.filter((c) => {
    const cNorm = c.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    if (cNorm === normalised) return true;
    if (cNorm.includes(normalised) || normalised.includes(cNorm)) return true;
    if (cNorm.replace(/-/g, '') === normalised.replace(/-/g, '')) return true;

    // Common prefix >= 3 chars (e.g. "game" vs "gaming" share "gam")
    const minLen = Math.min(cNorm.length, normalised.length);
    let commonPrefix = 0;
    for (let i = 0; i < minLen; i++) {
      if (cNorm[i] === normalised[i]) commonPrefix++;
      else break;
    }
    if (commonPrefix >= 3 && Math.abs(cNorm.length - normalised.length) <= 3) {
      return true;
    }

    return false;
  });
}

// ---------------------------------------------------------------------------
// Category resolution
// ---------------------------------------------------------------------------

export interface CategoryResolution {
  slug: string | null;
  found: boolean;
  suggestions: string[];
}

/**
 * Resolves a user-supplied category string to an exact slug.
 * Returns suggestions if no exact match found.
 */
export function resolveCategory(
  input: string,
  categories?: CategoryData[]
): CategoryResolution {
  if (!input || typeof input !== 'string') {
    return { slug: null, found: false, suggestions: [] };
  }

  const all = categories ?? loadCategories();
  const slugs = all.map((c) => c.slug);
  const names = all.map((c) => c.name.toLowerCase());

  const normalised = input.toLowerCase().trim();

  // Exact slug match
  if (slugs.includes(normalised)) {
    return { slug: normalised, found: true, suggestions: [] };
  }

  // Exact name match
  const nameIdx = names.indexOf(normalised);
  if (nameIdx !== -1) {
    return { slug: slugs[nameIdx], found: true, suggestions: [] };
  }

  // Fuzzy match on slugs and names
  const fuzzySlug = fuzzyMatch(normalised, slugs);
  const fuzzyName = all
    .filter((c) => c.name.toLowerCase().includes(normalised) || normalised.includes(c.name.toLowerCase()))
    .map((c) => c.slug);

  const suggestions = [...new Set([...fuzzySlug, ...fuzzyName])];
  return { slug: null, found: false, suggestions };
}

// ---------------------------------------------------------------------------
// Subcategory resolution
// ---------------------------------------------------------------------------

export interface SubcategoryResolution {
  slug: string | null;
  found: boolean;
  parentCategorySlug: string | null;
  suggestions: string[];
}

/**
 * Resolves a user-supplied subcategory string within a known parent category.
 * Validates that the subcategory belongs to the given category.
 */
export function resolveSubcategory(
  input: string,
  parentCategorySlug: string,
  subcategories?: SubcategoryData[]
): SubcategoryResolution {
  if (!input || typeof input !== 'string') {
    return { slug: null, found: false, parentCategorySlug: null, suggestions: [] };
  }
  const all = subcategories ?? loadSubcategories();

  // Filter to subcategories of this parent category
  const inCategory = all.filter((s) => s.category === parentCategorySlug);
  const slugs = inCategory.map((s) => s.slug);
  const names = inCategory.map((s) => s.name.toLowerCase());

  const normalised = input.toLowerCase().trim();

  // Exact slug match
  if (slugs.includes(normalised)) {
    return { slug: normalised, found: true, parentCategorySlug, suggestions: [] };
  }

  // Exact name match
  const nameIdx = names.indexOf(normalised);
  if (nameIdx !== -1) {
    return { slug: slugs[nameIdx], found: true, parentCategorySlug, suggestions: [] };
  }

  // Fuzzy match
  const fuzzySlug = fuzzyMatch(normalised, slugs);
  const fuzzyName = inCategory
    .filter((s) => s.name.toLowerCase().includes(normalised) || normalised.includes(s.name.toLowerCase()))
    .map((s) => s.slug);

  const suggestions = [...new Set([...fuzzySlug, ...fuzzyName])];
  return { slug: null, found: false, parentCategorySlug: null, suggestions };
}

// ---------------------------------------------------------------------------
// Tag resolution
// ---------------------------------------------------------------------------

export interface TagResolution {
  validSlugs: string[];
  invalidInputs: string[];
  deprecatedSlugs: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Resolves an array of user-supplied tag strings to validated slugs.
 *
 * Rules:
 * - Max 6 tags total (hard limit)
 * - Deprecated or merged tags are rejected
 * - Unknown tags generate errors
 * - Returns only the valid, active slugs
 */
export function resolveTags(inputs: string[], tags?: TagData[]): TagResolution {
  const all = tags ?? loadTags();
  const result: TagResolution = {
    validSlugs: [],
    invalidInputs: [],
    deprecatedSlugs: [],
    warnings: [],
    errors: [],
  };

  if (inputs.length > 6) {
    result.errors.push(
      `Tag count ${inputs.length} exceeds maximum of 6. Remove ${inputs.length - 6} tag(s).`
    );
    return result;
  }

  for (const input of inputs) {
    if (!input) continue;
    const normalised = String(input).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

    const exactMatch = all.find((t) => t.slug === normalised);
    if (exactMatch) {
      if (exactMatch.status === 'deprecated') {
        result.deprecatedSlugs.push(exactMatch.slug);
        result.warnings.push(
          `Tag "${exactMatch.slug}" is deprecated. Consider removing or replacing it.`
        );
      } else if (exactMatch.status === 'merged') {
        result.deprecatedSlugs.push(exactMatch.slug);
        result.errors.push(
          `Tag "${exactMatch.slug}" has been merged into "${exactMatch.mergedIntoSlug ?? 'another tag'}". Use the replacement tag instead.`
        );
      } else {
        result.validSlugs.push(exactMatch.slug);
      }
      continue;
    }

    // Try name match
    const nameMatch = all.find((t) => t.name.toLowerCase() === normalised);
    if (nameMatch) {
      if (nameMatch.status === 'active') {
        result.validSlugs.push(nameMatch.slug);
      } else {
        result.deprecatedSlugs.push(nameMatch.slug);
        result.errors.push(`Tag "${nameMatch.slug}" is ${nameMatch.status}. Cannot use it.`);
      }
      continue;
    }

    // No match
    const allSlugs = all.filter((t) => t.status === 'active').map((t) => t.slug);
    const suggestions = fuzzyMatch(normalised, allSlugs);
    result.invalidInputs.push(input);
    result.errors.push(
      `Tag "${input}" not found in the Controlled Tag Registry (src/content/tags/).` +
        (suggestions.length > 0 ? ` Did you mean: ${suggestions.join(', ')}?` : '')
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Comprehensive taxonomy resolution
// ---------------------------------------------------------------------------

/**
 * Resolves all taxonomy inputs and returns a structured result.
 * Antigravity calls this after parsing the user's command.
 *
 * If any ambiguity exists, returns needsClarification=true with a question.
 * If any error exists, returns errors[] which Antigravity presents to user.
 * Only returns a resolved taxonomy when all inputs are unambiguously valid.
 */
export function resolveTaxonomy(
  input: {
    category: string;
    subcategory?: string;
    tags?: string[];
  },
  data?: {
    categories?: CategoryData[];
    subcategories?: SubcategoryData[];
    tags?: TagData[];
  }
): TaxonomyResolutionResult {
  const categories = data?.categories ?? loadCategories();
  const subcategories = data?.subcategories ?? loadSubcategories();
  const tags = data?.tags ?? loadTags();

  const errors: string[] = [];
  const warnings: string[] = [];

  // --- Category ---
  const catResult = resolveCategory(input.category, categories);
  if (!catResult.found) {
    if (catResult.suggestions.length > 0) {
      return {
        needsClarification: true,
        clarificationQuestion:
          `Could not find category "${input.category}". ` +
          `Did you mean one of these? ${catResult.suggestions.join(', ')}`,
        errors: [],
      };
    }
    const allSlugs = categories.map((c) => `"${c.slug}"`).join(', ');
    return {
      needsClarification: false,
      errors: [
        `Category "${input.category}" does not exist. ` +
          `Valid categories: ${allSlugs}`,
      ],
    };
  }

  const categorySlug = catResult.slug!;

  // --- Subcategory ---
  let subcategorySlug: string | undefined;
  if (input.subcategory) {
    const subResult = resolveSubcategory(input.subcategory, categorySlug, subcategories);
    if (!subResult.found) {
      if (subResult.suggestions.length > 0) {
        return {
          needsClarification: true,
          clarificationQuestion:
            `Could not find subcategory "${input.subcategory}" under category "${categorySlug}". ` +
            `Did you mean: ${subResult.suggestions.join(', ')}?`,
          errors: [],
        };
      }
      // Check if subcategory exists but under a different category
      const anyMatch = subcategories.find(
        (s) =>
          s.slug === input.subcategory ||
          s.name.toLowerCase() === input.subcategory!.toLowerCase()
      );
      if (anyMatch) {
        errors.push(
          `Subcategory "${anyMatch.slug}" belongs to category "${anyMatch.category}", ` +
            `not "${categorySlug}". Please correct the category or subcategory.`
        );
      } else {
        const available = subcategories
          .filter((s) => s.category === categorySlug)
          .map((s) => `"${s.slug}"`);
        errors.push(
          `Subcategory "${input.subcategory}" does not exist under category "${categorySlug}". ` +
            `Available subcategories: ${available.join(', ') || 'none'}`
        );
      }
    } else {
      subcategorySlug = subResult.slug!;
    }
  }

  // --- Tags ---
  let validTagSlugs: string[] = [];
  if (input.tags && input.tags.length > 0) {
    const tagResult = resolveTags(input.tags, tags);
    errors.push(...tagResult.errors);
    warnings.push(...tagResult.warnings);
    validTagSlugs = tagResult.validSlugs;
  }

  if (errors.length > 0) {
    return { needsClarification: false, errors };
  }

  const resolved: ResolvedTaxonomy = {
    category: categorySlug,
    subcategory: subcategorySlug,
    tags: validTagSlugs,
    warnings,
  };

  return { resolved, needsClarification: false, errors: [] };
}

// ---------------------------------------------------------------------------
// Slug uniqueness check
// ---------------------------------------------------------------------------

/**
 * Checks whether a slug already exists in src/content/articles/.
 * Returns true if the slug is already taken.
 */
export function isSlugTaken(slug: string): boolean {
  const articlesDir = path.join(getContentDir(), 'articles');
  if (!fs.existsSync(articlesDir)) return false;
  const files = fs.readdirSync(articlesDir);
  return files.some(
    (f) =>
      f === `${slug}.mdx` ||
      f === `${slug}.md`
  );
}
