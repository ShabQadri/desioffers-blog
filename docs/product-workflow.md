# DesiOffers Guides — Product Data Model & Provider Architecture

## 1. Architectural Overview

DesiOffers Guides uses a **provider-agnostic product architecture** (`src/lib/products/`).

The website components and Astro Content Collections consume a unified `NormalizedProduct` data model. The system does not depend on live Amazon API access to author, validate, or publish high-quality buying guides.

```
Current State (Production):
Manual / Editor-Supplied Input
           ↓
   Product Normalizer
   (ASIN validation, imageless fallback, unverified price safety)
           ↓
   NormalizedProduct Model
           ↓
   MDX Article Draft
           ↓
   Git-Safe Publishing Workflow
```

```
Future State (When Amazon Creators API is Activated):
Amazon Creators API
           ↓
   AmazonProductProvider
           ↓
   Same NormalizedProduct Model
           ↓
   Zero schema or component changes required
```

---

## 2. Normalized Product Model

Every product record in an article frontmatter conforms to this structure:

```yaml
products:
  - position: 1
    name: "Redragon K552 Kumara RGB Mechanical Gaming Keyboard"
    brand: "Redragon"
    model: "K552"
    asin: "B016MAK38U"
    url: "https://www.amazon.in/dp/B016MAK38U"
    affiliateUrl: "https://www.amazon.in/dp/B016MAK38U"
    imageSource: "none" # or "r2", "licensed", "user-provided"
    editorialBadge: "Best Overall Value"
    shortDescription: "A durable tenkeyless mechanical keyboard with Outemu Blue switches."
    bestFor: "Budget gamers wanting tactile clicky feedback"
    pros:
      - "Sturdy metal and ABS construction"
      - "Vibrant per-key RGB backlighting"
      - "Compact space-saving TKL layout"
    cons:
      - "Outemu Blue switches are noticeably loud"
      - "Non-detachable USB cable"
    priceVerification: "unknown" # or "verified"
    availabilityVerification: "unknown" # or "verified"
```

---

## 3. Product Image Policy

1. **Imageless by Default**:
   - If no authorized image is available, set `imageSource: "none"`.
   - `ProductCard.astro` renders an elegant, single-column full-width layout without broken images or placeholders.
2. **Strict Anti-Fabrication Rule**:
   - **Never generate an AI photograph of a real commercial product** to use in place of the manufacturer's actual product.
   - AI editorial imagery is reserved for article hero banners and category artwork.
3. **Authorized / User-Provided Media**:
   - User-provided images default to `rightsStatus: "needs-review"`.
   - Restricted media (`rightsStatus: "restricted"`) is strictly blocked from publication.

---

## 4. Affiliate URL Construction

Affiliate URLs are generated transparently via `src/utils/affiliate.ts`:

* **Clean Canonical Link**: `https://www.amazon.in/dp/{ASIN}` (when Associate ID is unconfigured).
* **Tag-Appended Link**: `https://www.amazon.in/dp/{ASIN}?tag={ASSOCIATE_TAG}` (when Associate ID is configured).
* **No Cloaking**: Direct links with `rel="sponsored nofollow noopener"`.

---

## 5. Future Amazon Creators API Migration Plan

When the Amazon Associates account qualifies for the official Amazon Creators API:

1. **Add Encrypted Secrets to Cloudflare Pages**:
   - `AMAZON_CREATORS_API_KEY`
   - `AMAZON_CREATORS_API_SECRET`
   - `AMAZON_ASSOCIATE_TAG`
   - Set `AMAZON_CREATORS_API_ENABLED=true`
2. **Activate Provider**:
   - `AmazonProductProvider` automatically transitions from `status: "NOT_CONFIGURED"` to `status: "READY"`.
   - The provider fetches official product data and maps it into `NormalizedProduct`.
3. **Zero Code Refactoring**:
   - Existing 10 guides and future articles require zero schema changes.
   - `ProductCard.astro` and Astro content schemas remain 100% compatible.
