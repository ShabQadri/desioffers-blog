# DesiOffers Guides — Production Article Authoring & Publishing Workflow

## 1. Overview

DesiOffers Guides uses a **deterministic, human-supervised editorial pipeline** powered by Antigravity as the AI orchestration layer and Astro Content Collections as the static site generator.

```
USER COMMAND
     ↓
1. Input & Taxonomy Resolution
   (Controlled Category, Subcategory & Tag Registries)
     ↓
2. SEO Normalization
   (Meta title 40-70 chars, description 110-160 chars, slug)
     ↓
3. Product Normalization
   (ASIN validation, uncloaked affiliate links, imageless card layout)
     ↓
4. Editorial Hero Media Ingestion
   (AI-generated generic hero, SHA-256 hash, R2 upload, delivery URL)
     ↓
5. MDX Serialization (draft: true)
     ↓
6. Central Quality Pipeline (PASS / WARNING / BLOCKER)
     ↓
7. Human Review & Editorial Approval
     ↓
8. Git-Safe Publication (`npm run publish`)
     ↓
Cloudflare Pages Automatic Deployment
```

---

## 2. Core Operational Commands

| Step | Command | Description |
|---|---|---|
| **Create Draft** | `npm run create-article -- --input=data.json` | Generates structured MDX draft with `draft: true` and runs quality gate |
| **Review Quality** | `npm run review -- <slug>` | Runs 8-dimension quality audit and outputs PASS/WARNING/BLOCKER report |
| **Audit Media** | `npm run media:audit` | Scans all articles and verifies media references and R2 assets |
| **Publish** | `npm run publish -- <slug>` | Runs 6-point Git safety checks, toggles `draft: false`, commits, and pushes |

---

## 3. Product & Media Guardrails

### A. Product Data & Verification Policy
* **Zero Scraping**: No automated scraping of Amazon, Google, or competitor sites.
* **Factual Verification**: Prices and stock urgency must not be invented. If unverified, they are marked `unknown`.
* **Transparent Affiliate Links**: Direct canonical Amazon links (`https://www.amazon.in/dp/{ASIN}`) with `rel="sponsored nofollow noopener"`.

### B. Product Image vs Editorial Image Policy
* **Commercial Product Images**: **Never** generate AI photographs of real commercial products. If no manufacturer-authorized image exists, use `imageSource: "none"` to render the imageless `ProductCard`.
* **Editorial Hero Images**: AI-generated hero banners are permitted for generic workspace/lifestyle scenes without recognizable commercial logos or text overlays.
* **Private R2 Storage**: Assets are stored under `articles/{YYYY}/{MM}/{slug}/hero.{ext}` in the private `desioffers-media` R2 bucket and delivered via Cloudflare Image Resizing.

---

## 4. Quality Review States

* **`🟢 READY FOR HUMAN REVIEW`**: All checks passed with zero blockers.
* **`🟡 READY FOR REVIEW (WITH WARNINGS)`**: All blocking checks passed; advisory warnings present (e.g. imageless products, short body text).
* **`🔴 BLOCKED`**: Must resolve blocking issues before publication (e.g. invalid taxonomy, missing hero, fabricated hands-on testing claims, invalid ASIN).
