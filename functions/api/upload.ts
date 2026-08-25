export async function onRequest(context: any) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': env.SITE_URL || 'https://blog.desioffers.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'No valid file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 1. Server-side MIME validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Unsupported file format. Only JPEG, PNG, WebP, AVIF allowed.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2. Server-side File Size validation (Max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: 'File size exceeds maximum limit of 5MB.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 3. Generate collision-resistant storage key
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomHash = Math.random().toString(36).substring(2, 10);
    const cleanExt = (file.name.split('.').pop() || 'webp').toLowerCase().replace(/[^a-z0-9]/g, '');
    const objectKey = `articles/${year}/${month}/${randomHash}.${cleanExt}`;

    // 4. Access private R2 Bucket via Cloudflare Pages R2 Resource Binding (env.R2_BUCKET)
    if (env.R2_BUCKET) {
      const arrayBuffer = await file.arrayBuffer();
      await env.R2_BUCKET.put(objectKey, arrayBuffer, {
        httpMetadata: { contentType: file.type },
      });
    }

    // 5. Return Public Transformed Delivery URL (never raw R2 bucket domain)
    const publicUrl = `/cdn-cgi/image/w=1200,f=auto,q=85/${objectKey}`;

    return new Response(JSON.stringify({
      success: true,
      key: objectKey,
      url: publicUrl,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err: any) {
    // Return clean error response without stack trace exposure
    return new Response(JSON.stringify({ error: 'Image upload failed processing request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
