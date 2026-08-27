import fs from 'fs';
import path from 'path';

async function listR2() {
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

  const listUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/r2/buckets/${bucketName}/objects`;
  const res = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${cfToken}`,
    },
  });

  const data = await res.json();
  console.log('R2 Objects List:', JSON.stringify(data, null, 2));
}

listR2().catch(console.error);
