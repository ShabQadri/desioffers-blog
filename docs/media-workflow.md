# DesiOffers Guides — Media Pipeline & Upload Security Architecture

## 1. Overview

DesiOffers Guides operates a private Cloudflare R2 bucket (`desioffers-media`) delivered exclusively through Cloudflare Images transformations (`/cdn-cgi/image/...`).

Client browsers and Git repositories **never receive or store R2 credentials** (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`).

```
Antigravity (AI Orchestrator) / Editorial Tooling
                    ↓
       Binary Normalizer & Hashing
   (Magic-bytes, 5MB limit, SHA-256)
                    ↓
  POST https://blog.desioffers.com/api/upload
 (Header: Authorization: Bearer <UPLOAD_SECRET>)
                    ↓
      Cloudflare Pages Function
      (functions/api/upload.ts)
   Strict Fail-Closed Authentication
                    ↓
       env.R2_BUCKET (Resource Binding)
                    ↓
   Private R2 Bucket: desioffers-media
                    ↓
 Cloudflare Image Transformations
 (/cdn-cgi/image/w=...,f=auto,q=85/...)
```

---

## 2. Fail-Closed Authentication Model

The `/api/upload` endpoint implements **strict fail-closed security**:

1. **If `UPLOAD_SECRET` is missing in the Cloudflare Pages environment**:
   - The endpoint returns `HTTP 503 Service Unavailable`:
     `{ "error": "Upload service is not configured. Uploads are disabled." }`
   - **Uploads are completely disabled.** The endpoint is never publicly writable by default.

2. **If `UPLOAD_SECRET` is configured**:
   - Every request must provide `Authorization: Bearer <UPLOAD_SECRET>`.
   - Missing or invalid tokens return `HTTP 401 Unauthorized`.
   - The secret token is never reflected in error messages, logs, or response bodies.

3. **CORS Restriction**:
   - `Access-Control-Allow-Origin` is strictly bound to `https://blog.desioffers.com` (no wildcard `*`).

---

## 3. Production Configuration Guide

### Setting `UPLOAD_SECRET` in Cloudflare Pages

To enable uploads in production:

1. Open the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** → **desioffers-blog** → **Settings** → **Environment Variables**.
3. Under **Production**, add a new variable:
   - **Variable name**: `UPLOAD_SECRET`
   - **Value**: `[Generate a secure 32+ character random string]`
   - **Type**: **Secret (Encrypted)**
4. Save and redeploy.

> [!CAUTION]
> Never commit `UPLOAD_SECRET` to Git or expose it in client-side code. It must exist exclusively as an encrypted secret in Cloudflare Pages.

---

## 4. Media Provenance & Rights Standards

| Media Source | Default Rights Status | Publication Policy |
|---|---|---|
| `ai-generated` | `original` | Allowed (we own the AI-generated editorial output) |
| `user-provided` | `needs-review` | Requires human confirmation (`authorized`) before publish |
| `licensed` | `authorized` | Allowed with verified licensing metadata |
| `amazon-api` | `original` / `authorized` | Reserved for future official Creators API integration |
| `none` | N/A | Imageless product presentation (no broken images) |
| Any source with `restricted` | `restricted` | **STRICTLY BLOCKED** from rendering and publishing |

---

## 5. Security Invariants

* **Binary Verification**: File content is checked against actual magic bytes for `JPEG`, `PNG`, `WebP`, and `AVIF`. Renamed executables (`.exe`, `.elf`), HTML, SVGs, and scripts are rejected server-side.
* **Max File Size**: Hard limit of 5 MB enforced both client-side and server-side.
* **Deterministic Object Keys**: Keys are sanitized and structured as `articles/{YYYY}/{MM}/{slug}/{role}.{ext}` or `categories/{slug}/category.{ext}` to prevent path traversal.
* **Content Hashing**: SHA-256 hashes prevent duplicate uploads and allow safe deduplication.
