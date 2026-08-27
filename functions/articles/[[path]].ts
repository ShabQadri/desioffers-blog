/**
 * Cloudflare Pages Function: /articles/[...path]
 *
 * Serves article media assets from private `env.R2_BUCKET` when requested directly
 * or through Cloudflare Image Resizing (/cdn-cgi/image/.../articles/...).
 */

import { onRequestGet as handleMediaGet } from '../media/[[path]].js';

export async function onRequestGet(context: any) {
  const { params } = context;
  const pathParts = Array.isArray(params.path) ? params.path : [params.path];
  // Reconstruct full R2 key with "articles/" prefix
  const fullKey = `articles/${pathParts.filter(Boolean).join('/')}`;

  return handleMediaGet({
    ...context,
    params: { path: fullKey },
  });
}
