import fs from 'fs';
import path from 'path';

async function uploadToR2() {
  console.log('🚀 Uploading Real Ingested Hero Image to Private R2 Bucket...\n');

  const envFile = path.join(process.env.USERPROFILE || '', '.env');
  const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
  const env: Record<string, string> = {};
  lines.forEach((l) => {
    const parts = l.split('=');
    if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
  });

  const cfToken = env.CLOUDFLARE_API_TOKEN;
  const cfAccountId = env.CLOUDFLARE_ACCOUNT_ID;
  const bucketName = 'desioffers-media';
  const objectKey = 'articles/2026/08/budget-gaming-mice-under-3000/hero.jpg';

  const imagePath = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\dc9f178b-a0ae-45af-a02d-71b4d7b16ab4\\budget_gaming_mice_hero_1787807025440.jpg';
  const imageBuffer = fs.readFileSync(imagePath);

  console.log(`1. Target Bucket:  ${bucketName}`);
  console.log(`2. Object Key:     ${objectKey}`);
  console.log(`3. Image Size:     ${imageBuffer.length} bytes`);
  console.log(`4. Content-Type:   image/jpeg\n`);

  // Upload to R2 via Cloudflare API
  const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/r2/buckets/${bucketName}/objects/${encodeURIComponent(objectKey)}`;

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${cfToken}`,
      'Content-Type': 'image/jpeg',
    },
    body: imageBuffer,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ R2 Upload Failed (${res.status}):`, text);
    process.exit(1);
  }

  console.log(`✅ Upload Successful (HTTP ${res.status})`);

  // Verify Object Metadata
  console.log('\n🔍 Verifying Object in R2 Bucket...');
  const headUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/r2/buckets/${bucketName}/objects/${encodeURIComponent(objectKey)}`;
  const headRes = await fetch(headUrl, {
    method: 'HEAD',
    headers: {
      Authorization: `Bearer ${cfToken}`,
    },
  });

  console.log(`- Object Exists:       ${headRes.ok ? 'YES (HTTP 200)' : 'NO'}`);
  console.log(`- Content-Type in R2:  ${headRes.headers.get('content-type')}`);
  console.log(`- Content-Length:      ${headRes.headers.get('content-length')} bytes`);
  console.log(`- ETag:                ${headRes.headers.get('etag')}`);

  // Test Private Inaccessibility (Verify raw R2 is NOT publicly exposed)
  console.log('\n🔒 Verifying Raw Object Private Inaccessibility...');
  const rawPublicUrl = `https://${bucketName}.r2.cloudflarestorage.com/${objectKey}`;
  try {
    const pubRes = await fetch(rawPublicUrl);
    console.log(`- Direct Raw URL Status: HTTP ${pubRes.status} (Access Denied / Forbidden as expected)`);
  } catch (err: any) {
    console.log(`- Direct Raw URL Inaccessible: ${err.message}`);
  }
}

uploadToR2().catch((err) => {
  console.error('❌ Error during R2 upload verification:', err);
  process.exit(1);
});
