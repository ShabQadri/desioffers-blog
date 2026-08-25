# Taxonomy Governance & Architecture Guide

This document establishes the deliberate information architecture rules for **PickWise India**.

## 1. Concept Hierarchy

1. **Primary Categories** (`src/content/categories/`):
   - Represents major publication sections (`Gaming`, `Beauty & Makeup`, `Kitchen & Appliances`, `Electronics & Audio`, `Home & Living`, `Deals & Offers`).
   - Every published article must have **exactly ONE** primary category.
   - Primary categories form the backbone of site navigation, breadcrumbs, and sitemap. Always indexable.

2. **Subcategories** (`src/content/subcategories/`):
   - Represents a stable section underneath a primary category (`Gaming` -> `Gaming Keyboards`).
   - Subcategories belong strictly to their parent category.

3. **Controlled Tags** (`src/content/tags/`):
   - Secondary discovery metadata (`wireless`, `mechanical`, `budget`, `under-5000`).
   - Articles support 0 to 6 controlled tags.
   - Tags are registered centrally in `src/content/tags/`. Free-form tag dumping is prohibited.

4. **Selective Topic Hubs** (`src/content/topicHubs/`):
   - Dedicated, manually curated landing pages (`/topics/[slug]/`) combining editorial intro, featured guides, FAQ, and related tags.

---

## 2. Thin-Tag Protection & Indexing Rules

* **Threshold Rule**: Global config `TAXONOMY_CONFIG.tagIndexThreshold = 5`.
* If a tag has `< 5` articles -> Renders with `<meta name="robots" content="noindex, follow">` and is excluded from `sitemap.xml`.
* If a tag has `>= 5` articles AND has a rich editorial description -> Renders as an indexable Tag Hub and is included in `sitemap.xml`.

---

## 3. Tag Merging & Maintenance

When tags are consolidated:
- Set `status: "merged"` in the tag JSON file.
- Set `mergedIntoSlug: "canonical-tag-slug"`.
- The system automatically triggers a 301 redirect and excludes the merged tag from sitemap.xml.
