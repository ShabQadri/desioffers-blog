/**
 * Cloudflare Pages Function: /media/[...path]
 *
 * Serves media assets from the private `desioffers-media` R2 bucket via `env.R2_BUCKET`.
 * Enables Cloudflare Image Resizing (/cdn-cgi/image/...) to fetch R2 originals seamlessly.
 *
 * CACHING & PERFORMANCE:
 * - Emits `Cache-Control: public, max-age=31536000, immutable` for immutable hashed media.
 * - Emits `ETag` matching the R2 object ETag / content hash.
 * - Supports HTTP 304 Not Modified conditional requests (If-None-Match).
 */

export async function onRequestGet(context: any) {
  const { request, params, env } = context;

  if (!env.R2_BUCKET) {
    return new Response(JSON.stringify({ error: 'R2 storage binding not available.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Extract path parameters: e.g. ["articles", "2026", "08", "slug", "hero.webp"]
  const pathParts = Array.isArray(params.path) ? params.path : [params.path];
  const rawKey = pathParts.filter(Boolean).join('/');

  // Prevent directory traversal
  const sanitizedKey = rawKey.replace(/\.\./g, '').replace(/^\/+/, '');

  if (!sanitizedKey) {
    return new Response(JSON.stringify({ error: 'Media key not specified.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Check If-None-Match header for client-side caching (HTTP 304)
    const ifNoneMatch = request.headers.get('If-None-Match');
    const object = await env.R2_BUCKET.get(sanitizedKey);

    if (!object) {
      return new Response(JSON.stringify({ error: 'Media asset not found.' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      });
    }

    const etag = object.httpEtag || `"${object.customMetadata?.contentHash || 'desioffers-media'}"`;

    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === `W/${etag}`)) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('ETag', etag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', env.SITE_URL || 'https://blog.desioffers.com');

    // Ensure correct content-type header
    if (!headers.get('Content-Type')) {
      if (sanitizedKey.endsWith('.webp')) headers.set('Content-Type', 'image/webp');
      else if (sanitizedKey.endsWith('.png')) headers.set('Content-Type', 'image/png');
      else if (sanitizedKey.endsWith('.jpg') || sanitizedKey.endsWith('.jpeg')) headers.set('Content-Type', 'image/jpeg');
      else if (sanitizedKey.endsWith('.avif')) headers.set('Content-Type', 'image/avif');
    }

    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed retrieving media asset.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
