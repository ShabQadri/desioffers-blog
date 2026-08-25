# DesiOffers Guides — Production Editorial Publication

An independent product discovery, buying-guide, and product comparison publication for Indian shoppers at **[https://blog.desioffers.com](https://blog.desioffers.com/)**, operating alongside the main deal discovery platform at **[https://desioffers.com](https://desioffers.com/)**.

Built with **Astro**, **TypeScript**, **Astro Content Collections**, **Sveltia CMS**, and **Cloudflare Pages / R2**.

---

## 🌟 Key Features & Architecture

* **Brand Relationship**:
  - Main Deal Discovery Platform: `https://desioffers.com`
  - Editorial Buying Guides & Comparisons: `https://blog.desioffers.com`
* **Static-First Performance**: SSG output compiled to zero-JS static HTML/CSS on Cloudflare Pages edge CDN.
* **Hierarchical Taxonomy System**:
  - **Primary Categories**: Exactly 1 per article (`Gaming`, `Beauty & Makeup`, `Kitchen & Appliances`, `Electronics & Audio`, `Home & Living`, `Deals & Offers`).
  - **Subcategories**: Nested subcategories (`Gaming Keyboards`, `Earbuds`, `Air Fryers`).
  - **Controlled Tags Registry**: 0–6 canonical tags per article (`wireless`, `mechanical`, `budget`, `under-5000`).
  - **Selective Topic Hubs**: Dedicated editorial landing pages (`/topics/[slug]/`).
* **Thin-Tag Protection**: Tag archive pages with `< 5` articles automatically receive `noindex, follow` and are excluded from `sitemap-index.xml`.
* **Flat Article URLs**: Articles reside at `/[article-slug]/` to preserve canonical links when taxonomy evolves.
* **Private R2 Media Pipeline**: Original images uploaded to a private Cloudflare R2 bucket (`desioffers-media`) served transformed via Cloudflare Images variants (`thumbnail`, `card`, `medium`, `article`, `hero`, `social`).
* **Amazon Associates Compliance**: Site-wide and article-level disclosures, `rel="sponsored nofollow"`, direct outbound non-cloaked links, and realistic non-fabricated evaluation language.
* **E-E-A-T & Trust Pages**: Transparency bars, last verified timestamps, author profiles, methodology pages, and explicit Amazon disclosures.

---

## 📁 Repository Structure

```
desioffers-blog/
├── functions/
│   └── api/
│       ├── oauth.ts             # Cloudflare Worker for Sveltia CMS GitHub OAuth
│       └── upload.ts            # Cloudflare Worker for Private R2 Image Upload
├── public/
│   ├── admin/                   # Sveltia CMS SPA & configuration
│   ├── images/                  # Static UI branding assets
│   ├── _headers                 # Cloudflare security headers
│   ├── llms.txt                 # AI machine metadata overview
│   └── robots.txt               # Granular crawler policy
├── scripts/
│   ├── validate-content.ts      # Build-time taxonomy & content validator
│   └── smoke-test.ts            # Production build smoke test
├── src/
│   ├── components/              # Reusable UI components (ProductCard, QuickPicks, Header, Footer)
│   ├── config/                  # Site & taxonomy configuration (tagIndexThreshold = 5)
│   ├── content/                 # Articles, authors, categories, subcategories, tags, topicHubs
│   ├── layouts/                 # BaseLayout & ArticleLayout
│   ├── pages/                   # Astro routes (index, [slug], category, tag, topics, search, 404)
│   ├── styles/                  # Global CSS design system
│   └── utils/                   # Image transformation, affiliate, taxonomy, time helpers
└── tests/                       # Vitest unit & schema tests
```

---

## 🛠️ Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Dev Server
```bash
npm run dev
```
Open [http://localhost:4321](http://localhost:4321) in your browser.

### 3. Run Type Check & Content Validation
```bash
npm run check
npm run validate-content
```

### 4. Run Test Suite & Smoke Test
```bash
npm run test
npm run smoke-test
```

### 5. Build for Production
```bash
npm run build
```

---

## ☁️ Cloudflare Deployment Setup

### 1. Cloudflare Pages Project
Connect your GitHub repository (`desioffers/desioffers-blog`) to Cloudflare Pages.
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Custom Subdomain**: Set up `blog.desioffers.com` in Pages Settings -> Custom Domains.

### 2. Native R2 Resource Binding
Configure `R2_BUCKET` as a native Cloudflare Pages R2 Resource Binding (do NOT store R2 API access keys as ordinary secrets):
- **Pages Dashboard** → Settings → Bindings → Add → R2 bucket
- **Variable name**: `R2_BUCKET`
- **R2 bucket**: `desioffers-media` (Private bucket)

### 3. Environment Variables
- **Pages Dashboard** → Settings → Environment Variables:
  - `SITE_URL`: `https://blog.desioffers.com`
  - `GITHUB_CLIENT_ID`: `your-github-oauth-client-id`

### 4. Secrets
- **Pages Dashboard** → Settings → Environment Variables (Encrypted Secret):
  - `GITHUB_CLIENT_SECRET`: `your-github-oauth-client-secret`
