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

async function runStage() {
  console.log('⚡ STAGE 1: Creating/Connecting Cloudflare Pages Project "desioffers-blog"...');

  // 1. Create Pages project
  const createProjectRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'desioffers-blog',
      production_branch: 'main',
      source: {
        type: 'github',
        config: {
          owner: 'ShabQadri',
          repo_name: 'desioffers-blog',
          production_branch: 'main',
          pr_comments_enabled: true,
          deployments_enabled: true
        }
      },
      build_config: {
        build_command: 'npm run build',
        destination_dir: 'dist'
      },
      deployment_configs: {
        production: {
          environment_variables: {
            SITE_URL: { value: 'https://blog.desioffers.com' }
          },
          r2_buckets: {
            R2_BUCKET: { name: 'desioffers-media' }
          }
        }
      }
    })
  });

  await createProjectRes.json();
  console.log('Project API Response status:', createProjectRes.status);

  // 2. Fetch Project info
  const fetchProjectRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/desioffers-blog`, {
    headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' }
  });
  const projectInfo = await fetchProjectRes.json();

  let targetSubdomain = 'desioffers-blog.pages.dev';
  if (projectInfo.success && projectInfo.result) {
    targetSubdomain = `${projectInfo.result.subdomain}.pages.dev`;
    console.log('✅ Pages Project Status: ACTIVE');
    console.log(`✅ Default Pages URL: https://${targetSubdomain}`);
  } else {
    console.log('ℹ️ Pages Project info:', projectInfo.errors?.[0]?.message || 'Project query done');
  }

  // 3. Add Custom Domain blog.desioffers.com
  console.log('\n🌐 STAGE 2: Adding Custom Domain "blog.desioffers.com"...');
  const addDomainRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/desioffers-blog/domains`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'blog.desioffers.com' })
  });

  const domainData = await addDomainRes.json();
  console.log('Custom Domain Association Response:', domainData.success ? 'SUCCESS' : (domainData.errors?.[0]?.message || domainData));

  // 4. Fetch Custom Domains list
  const listDomainsRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/desioffers-blog/domains`, {
    headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' }
  });
  const listDomainsData = await listDomainsRes.json();
  console.log('Registered Custom Domains:', listDomainsData.result?.map(d => ({ name: d.name, status: d.status })) || listDomainsData);

  console.log(`\n🎯 EXACT CLOUDFLARE TARGET HOSTNAME: ${targetSubdomain}`);
}

runStage().catch(console.error);
