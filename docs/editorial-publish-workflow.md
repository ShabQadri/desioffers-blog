# DesiOffers Guides — Editorial Publishing & Sveltia CMS Workflow

## 1. Architectural Model & Invariants

```
EDITORIAL WORKFLOW LIFECYCLE

+-------------------------------------------------------------------------------+
|  1. Sveltia CMS / Authoring Pipeline                                         |
|  - Editors write & save articles via Sveltia CMS or CLI                      |
|  - Invariant: ALL new articles default to `draft: true`                      |
|  - Direct Git commit by CMS -> Cloudflare Pages preview                      |
|  - CRITICAL: Sveltia Save != Publication Approval                            |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|  2. Quality & Media Review Gate (Read-Only)                                   |
|  - Command: `npm run review -- <article-slug>`                                |
|  - Verifies R2 Media Existence (private Cloudflare R2 bucket)                 |
|  - Verifies Point-in-Time observed pricing & transparency disclosure          |
|  - Anti-fabrication check (zero invented specs, ratings, or test claims)      |
|  - Schema, SEO lengths, and controlled taxonomy compliance                    |
|  - Status outcome: READY_FOR_REVIEW | HAS_WARNINGS | BLOCKED                 |
+---------------------------------------+---------------------------------------+
                                        | (If Human Review Approved & No Blockers)
                                        v
+-------------------------------------------------------------------------------+
|  3. Explicit Publication Workflow (Only Mechanism to Flip `draft: false`)    |
|  - Command: `npm run publish -- <article-slug>`                               |
|  - Re-executes full pre-publish validator & Git pre-flight                    |
|  - Requires explicit interactive confirmation (`--confirm` for CI)           |
|  - Atomically flips `draft: true` -> `draft: false`                           |
|  - Stages ONLY the target article file (never `git add .`)                    |
|  - Creates atomic Git commit & standard push to `main` (never force push)     |
|  - Cloudflare Pages builds & deploys live to https://blog.desioffers.com      |
+-------------------------------------------------------------------------------+
```

---

## 2. Sveltia CMS Safety & Limitations

### Invariants:
1. **`draft: true` by Default:** Every new article created through Sveltia CMS starts with `draft: true`.
2. **`productDataVerified: false` by Default:** Product specs and badges are marked unverified until inspected.
3. **`priceVerified: false` by Default:** Prices are observed point-in-time entries, not live API pricing.
4. **Controlled Taxonomy & Authors:** Author and taxonomy fields are bound to existing JSON registry entries.

### Sveltia CMS Limitation:
> [!IMPORTANT]
> Sveltia CMS writes commits directly to the GitHub repository. Sveltia itself **does NOT run local validation or quality gates**.
> Therefore, saving in Sveltia CMS creates a **Draft** in the repository. It will **NEVER appear on the live production website** until explicitly published via `npm run publish`.

---

## 3. Production Publication Step-by-Step Guide

### Step 1: Run Quality Review (Read-Only)
```bash
npm run review -- <slug>
```
- Checks SEO title and description lengths.
- Checks taxonomy, subcategory, tags, and author validity.
- Verifies R2 media existence in `desioffers-media`.
- Scans for fabrication claims.
- **Does NOT modify `draft` status or any file on disk.**

### Step 2: Resolve Any Blockers
If the review reports `🔴 BLOCKED`, fix the identified issue in Sveltia CMS or the `.mdx` file and re-run review.

### Step 3: Publish to Production
```bash
npm run publish -- <slug>
```
The publish workflow:
1. Runs full validation, taxonomy, quality, and R2 existence checks.
2. Inspects Git status (ensures no merge conflicts, local branch in sync).
3. Asks for human confirmation.
4. Atomically modifies `draft: true` to `draft: false`.
5. Stages only `src/content/articles/<slug>.mdx`.
6. Commits with message: `publish(article): <slug>`.
7. Pushes cleanly to origin `main`.
8. Cloudflare Pages triggers production build and deploys to `https://blog.desioffers.com/<slug>/`.
