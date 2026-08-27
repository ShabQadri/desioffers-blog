import fs from 'fs';
import path from 'path';

const envFile = path.join(process.env.USERPROFILE || '', '.env');
const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
const env = {};
lines.forEach(l => {
  const parts = l.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const cfToken = env.CLOUDFLARE_API_TOKEN;
const cfAccountId = env.CLOUDFLARE_ACCOUNT_ID;

async function cfTest() {
  console.log('Testing Cloudflare Account Token & Account ID...');
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}`, {
    headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  console.log('Cloudflare Account Info:', data.success ? data.result.name : data.errors);

  // Try creating R2 Bucket
  console.log('Creating R2 Bucket "desioffers-media"...');
  const r2Res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/r2/buckets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'desioffers-media' })
  });
  const r2Data = await r2Res.json();
  console.log('R2 Bucket Status:', r2Data.success ? 'Created/Ready' : (r2Data.errors?.[0]?.message || r2Data));
}

cfTest().catch(console.error);
