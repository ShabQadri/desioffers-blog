# DesiOffers Guides — Production Editorial & Publishing Reference Manual

This document is the authoritative engineering and editorial guide for authoring, reviewing, and publishing buying guides on **DesiOffers Guides** (https://blog.desioffers.com).

---

## 1. Editorial Philosophy & Truth-in-Publishing Guarantees

1. **AI/Web Research $\ne$ Official Amazon Data:**
   All product specifications, descriptions, and suitability guidance synthesized by AI or manual web research are classified under `source: "web-research"` with `productDataVerified: false` by default.
2. **User-Observed Price $\ne$ Guaranteed Live Price:**
   Any price provided manually by an editor is stored as `priceVerification: "user-observed"` with an explicit timestamp (`priceObservedAt`). It is rendered with an explicit reader disclosure that Amazon prices and availability fluctuate.
3. **Imageless Product Presentation $\ne$ Error:**
   Real commercial products without authorized, original product photographs use `imageSource: "none"`. They render via the clean, dedicated imageless `ProductCard` layout. **Zero fake AI-generated commercial product photographs are permitted.**
4. **Editorial AI Hero Imagery:**
   AI-generated images are strictly restricted to generic, unbranded editorial hero art, category visuals, and decorative banners.
5. **Human Gatekeeper Invariant:**
   Automated workflows and CMS editors **only create drafts** (`draft: true`). Publication to live production is strictly an explicit human-initiated operation (`npm run publish -- <slug>`).

---

## 2. Daily Editorial Lifecycle: Step-by-Step

```
DAILY EDITORIAL WORKFLOW

   [Editor Input]
   - Topic
   - Category / Subcategory
   - Amazon product URLs
   - Optional: observed prices, deal badges, editorial notes
         │
         ▼
   [Step 1: One-Command Draft Creation]
   npm run create-article -- input.json
         │
         ├── Validates 10-char Amazon ASINs & canonicalizes URLs
         ├── Attaches direct Amazon affiliate tags
         ├── Enforces imageless product presentation
         ├── Generates editorial hero brief & ingests hero binary (if provided)
         ├── Evaluates Central Quality Gate (PASS / WARN / BLOCK)
         └── Writes `src/content/articles/<slug>.mdx` with `draft: true`
         │
         ▼
   [Step 2: Read-Only Quality Review]
   npm run review -- <slug>
         │
         ├── Verifies R2 media existence in private `desioffers-media` bucket
         ├── Scans for fabrication claims (fake lab tests, false urgency)
         ├── Validates SEO character counts & controlled taxonomy registries
         └── Reports `READY_FOR_REVIEW`, `HAS_WARNINGS`, or `BLOCKED`
         │
         ▼
   [Step 3: Human Review & Approval]
   Editor reviews MDX draft and resolves any reported blockers.
         │
         ▼
   [Step 4: Explicit Publication]
   npm run publish -- <slug>
         │
         ├── Re-verifies quality & R2 existence
         ├── Runs Git safety pre-flight (clean working tree, in-sync branch)
         ├── Prompts for interactive confirmation
         ├── Flips `draft: true` → `draft: false`
         ├── Stages ONLY the target `.mdx` file
         └── Creates atomic commit and pushes cleanly to `origin main`
```

---

## 3. CLI Command Reference

### A. Draft Creation
```bash
# Via JSON input file
npm run create-article -- scripts/test-input.json

# Via CLI flags
npm run create-article -- --topic="5 Best Gaming Mice Under ₹3,000" --category="gaming" --subcategory="gaming-mice"
```

### B. Quality Review (Read-Only)
```bash
# Human-readable console output
npm run review -- budget-gaming-mice-under-3000

# Machine-readable JSON output
npm run review -- budget-gaming-mice-under-3000 --json
```

### C. Explicit Publication
```bash
# Interactive publish
npm run publish -- budget-gaming-mice-under-3000

# Dry-run validation only (no file changes, no Git commits)
npm run publish -- budget-gaming-mice-under-3000 --dry-run

# Non-interactive publish (for CI / automated pipelines)
npm run publish -- budget-gaming-mice-under-3000 --confirm
```

---

## 4. Verification & Diagnostic Commands

| Task | Command | Target |
|---|---|---|
| Full Type & Diagnostic Check | `npm run check` | 0 errors, 0 warnings |
| Complete Unit Test Suite | `npm run test` | 220+ tests passing |
| Content & Taxonomy Validation | `npm run validate-content` | All articles valid |
| Media Registry & R2 Audit | `npm run media:audit` | Provenance verified |
| Production Static Build | `npm run build` | 47+ pages (0 draft leakage) |
| Production Smoke Test | `npm run smoke-test` | Zero legacy / localhost issues |

---

## 5. Security & Infrastructure Summary

- **Private R2 Storage:** `desioffers-media` private Cloudflare R2 bucket. Zero public bucket listing or direct unauthenticated access.
- **Edge Media Delivery:** Cloudflare Pages Functions (`/media/*` and `/articles/*`) dynamically verify, transform, and cache images with immutable headers.
- **Git Safety Guarantees:** No destructive operations, zero force pushes, atomic single-file publish commits.
