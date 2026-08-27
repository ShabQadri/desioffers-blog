# DesiOffers Guides — Cloudflare Infrastructure & Media Delivery Architecture

## 1. Executive Summary

DesiOffers Guides (`https://blog.desioffers.com`) runs on **Cloudflare Pages** backed by **Cloudflare Pages Functions** and a private **Cloudflare R2 bucket** (`desioffers-media`).

All media assets are served through private object storage bindings without exposing AWS/S3 access credentials to client applications, Git repositories, or browser JavaScript.

---

## 2. Infrastructure Configuration Matrix

| Component | Cloudflare Service | Identifier / Setting | Access / Scope | Purpose |
|---|---|---|---|---|
| **Production Website** | Cloudflare Pages | `blog.desioffers.com` | Public HTTPS | Static Astro site & dynamic functions |
| **Media Bucket** | Cloudflare R2 | `desioffers-media` | **Private** (No public bucket URL) | Original AI & authorized media assets |
| **R2 Resource Binding** | Pages Functions Binding | `R2_BUCKET` | Server-Side Workers Runtime | Direct bucket operations without S3 keys |
| **Upload Secret** | Pages Encrypted Secret | `UPLOAD_SECRET` | Server-Side Only | Bearer token authorization for `/api/upload` |
| **Site URL** | Pages Environment Variable | `SITE_URL` = `https://blog.desioffers.com` | Server-Side Only | CORS origin verification & canonical base |
| **Media Delivery Handler** | Pages Function Route | `/media/*` and `/articles/*` | Edge CDN Cached | Serves R2 originals with immutable caching |
| **Image Optimization** | Cloudflare Image Resizing | `/cdn-cgi/image/w=...,f=auto,q=85/...` | Edge Transformation | Converts, compresses, & resizes images |

---

## 3. Configuration Step-by-Step Guide

### A. R2 Bucket Creation & Resource Binding
1. Navigate to **Cloudflare Dashboard** → **R2 Object Storage**.
2. Create bucket named `desioffers-media` (Location: Automatic / Asia-South).
3. Leave **Public Access** set to **Disabled** (Private bucket).
4. Navigate to **Workers & Pages** → **desioffers-blog** → **Settings** → **Functions** → **R2 Bucket Bindings**.
5. Add binding:
   - **Variable name**: `R2_BUCKET`
   - **R2 bucket**: `desioffers-media`
   - Environment: **Production** and **Preview**

### B. Encrypted Secrets & Environment Variables
In **Workers & Pages** → **desioffers-blog** → **Settings** → **Environment Variables**:

1. **`UPLOAD_SECRET`** (Type: **Secret / Encrypted**):
   - Set a secure random 32+ character token.
   - Required by `functions/api/upload.ts` for strict fail-closed upload authorization.
2. **`SITE_URL`** (Type: **Plain text**):
   - Value: `https://blog.desioffers.com`

---

## 4. End-to-End Media Delivery Architecture

### How Private R2 Assets Reach the Browser

```
1. Image Upload
   Antigravity/Editorial CLI 
          ↓ (POST /api/upload with Bearer <UPLOAD_SECRET>)
   Cloudflare Pages Function (functions/api/upload.ts)
          ↓ (env.R2_BUCKET.put())
   Private R2 Bucket (desioffers-media)

2. Media Request & Image Resizing
   Browser requests:
   /cdn-cgi/image/w=1600,h=900,fit=crop,f=auto,q=85/articles/2026/08/slug/hero.webp
          ↓
   Cloudflare Image Resizing Edge Zone
          ↓ (Fetches origin path /articles/2026/08/slug/hero.webp)
   Cloudflare Pages Function (functions/articles/[[path]].ts)
          ↓ (env.R2_BUCKET.get())
   Private R2 Object returned with:
   - Cache-Control: public, max-age=31536000, immutable
   - ETag: "<sha256-hash>"
          ↓
   Cloudflare Image Resizing transforms, converts to WebP/AVIF, and caches at Edge
          ↓
   Browser receives optimized image (0 CLS, 0 leaked credentials)
```

---

## 5. Performance & Caching Guarantees

* **Immutable Content**: Hashed and dated paths (`articles/YYYY/MM/slug/hero.webp`) are served with `Cache-Control: public, max-age=31536000, immutable`.
* **Conditional Requests**: Pages Functions implement `If-None-Match` validation returning `HTTP 304 Not Modified` on revalidation.
* **Zero CLS**: Every image tag explicitly provides `width`, `height`, and CSS `aspect-ratio`.
* **LCP Optimization**: Above-the-fold hero banners use `loading="eager"` and `fetchpriority="high"`. Product cards use `loading="lazy"` and `decoding="async"`.
