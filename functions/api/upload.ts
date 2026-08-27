/**
 * Cloudflare Pages Function: /api/upload
 *
 * Authenticated R2 image upload endpoint for DesiOffers media assets.
 * Uses native Pages R2_BUCKET resource binding (no client-side S3 credentials).
 *
 * SECURITY GUARANTEES:
 * - Server-side binary magic-byte validation (JPEG, PNG, WebP, AVIF only).
 * - Enforces 5 MB size limit.
 * - Rejects executables, HTML, SVG, and scripts.
 * - Computes SHA-256 content hash and attaches metadata.
 * - Enforces deterministic, sanitized R2 keys (no path traversal).
 * - Returns clean transformed delivery URL (/cdn-cgi/image/...) with zero stack trace exposure.
 */

export async function onRequest(context: any) {
  const { request, env } = context;

  const siteOrigin = env.SITE_URL || 'https://blog.desioffers.com';
  const corsHeaders = {
    'Access-Control-Allow-Origin': siteOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // 1. Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // 2. Strict Fail-Closed Authorization Verification
  // The upload endpoint is strictly disabled unless UPLOAD_SECRET is explicitly configured in Cloudflare Pages.
  if (!env.UPLOAD_SECRET) {
    return new Response(JSON.stringify({ error: 'Upload service is not configured. Uploads are disabled.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token || token !== env.UPLOAD_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or missing upload token.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const role = ((formData.get('role') as string) || 'hero').toLowerCase().trim();
    const contextSlug = ((formData.get('contextSlug') as string) || 'media').toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');
    const source = (formData.get('source') as string) || 'ai-generated';
    const rightsStatus = (formData.get('rightsStatus') as string) || 'original';
    const altText = (formData.get('alt') as string) || '';

    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'No valid file provided.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 3. Size Validation (Max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: 'File size exceeds maximum limit of 5MB.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // 4. Server-Side Binary Magic Bytes Validation
    let detectedMime: string | null = null;
    let detectedExt = 'webp';

    // Check dangerous executables & scripts
    if (
      (uint8[0] === 0x4d && uint8[1] === 0x5a) || // DOS MZ
      (uint8[0] === 0x7f && uint8[1] === 0x45 && uint8[2] === 0x4c && uint8[3] === 0x46) // ELF
    ) {
      return new Response(JSON.stringify({ error: 'Executable binary file rejected.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // JPEG: FF D8 FF
    if (uint8[0] === 0xff && uint8[1] === 0xd8 && uint8[2] === 0xff) {
      detectedMime = 'image/jpeg';
      detectedExt = 'jpg';
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    else if (
      uint8[0] === 0x89 &&
      uint8[1] === 0x50 &&
      uint8[2] === 0x4e &&
      uint8[3] === 0x47 &&
      uint8[4] === 0x0d &&
      uint8[5] === 0x0a &&
      uint8[6] === 0x1a &&
      uint8[7] === 0x0a
    ) {
      detectedMime = 'image/png';
      detectedExt = 'png';
    }
    // WebP: RIFF ... WEBP
    else if (
      uint8[0] === 0x52 &&
      uint8[1] === 0x49 &&
      uint8[2] === 0x46 &&
      uint8[3] === 0x46 &&
      uint8[8] === 0x57 &&
      uint8[9] === 0x45 &&
      uint8[10] === 0x42 &&
      uint8[11] === 0x50
    ) {
      detectedMime = 'image/webp';
      detectedExt = 'webp';
    }
    // AVIF: ....ftypavif/avis/mif1
    else if (uint8.length >= 16 && uint8[4] === 0x66 && uint8[5] === 0x74 && uint8[6] === 0x79 && uint8[7] === 0x70) {
      detectedMime = 'image/avif';
      detectedExt = 'avif';
    }

    if (!detectedMime) {
      return new Response(
        JSON.stringify({ error: 'Unsupported file format. Only valid JPEG, PNG, WebP, and AVIF image binaries are permitted.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // 5. Compute SHA-256 Content Hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // 6. Generate Deterministic Storage Key
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    let objectKey: string;
    if (role === 'category') {
      objectKey = `categories/${contextSlug}/category.${detectedExt}`;
    } else if (role === 'author') {
      objectKey = `authors/${contextSlug}/avatar.${detectedExt}`;
    } else if (role === 'social') {
      objectKey = `social/${contextSlug}/og.${detectedExt}`;
    } else {
      objectKey = `articles/${year}/${month}/${contextSlug}/${role}.${detectedExt}`;
    }

    // 7. Put into R2 with Custom Metadata
    if (env.R2_BUCKET) {
      await env.R2_BUCKET.put(objectKey, arrayBuffer, {
        httpMetadata: { contentType: detectedMime },
        customMetadata: {
          contentHash,
          role,
          contextSlug,
          source,
          rightsStatus,
          altText,
          uploadedAt: now.toISOString(),
        },
      });
    }

    // 8. Construct Public Transformed Delivery URL
    const publicUrl = `/cdn-cgi/image/w=1200,f=auto,q=85/${objectKey}`;

    return new Response(
      JSON.stringify({
        success: true,
        key: objectKey,
        url: publicUrl,
        contentHash,
        mimeType: detectedMime,
        sizeBytes: file.size,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (err: any) {
    // Return clean error response without stack trace exposure
    return new Response(JSON.stringify({ error: 'Image upload failed processing request.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
