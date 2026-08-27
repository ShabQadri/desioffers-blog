import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const envFile = path.join(process.env.USERPROFILE || '', '.env');
if (!fs.existsSync(envFile)) {
  console.error('❌ .env file not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envFile, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const githubToken = env.GITHUB_TOKEN;
const cfToken = env.CLOUDFLARE_API_TOKEN;
const cfAccountId = env.CLOUDFLARE_ACCOUNT_ID;

async function main() {
  console.log('🚀 Starting Automated Production Setup for DesiOffers Guides...\n');

  // 1. GitHub API Check & Create Repo
  const ghUserRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${githubToken}`, 'User-Agent': 'DesiOffers-Deployer' }
  });
  const ghUser = await ghUserRes.json();
  console.log(`✅ GitHub Authenticated User: ${ghUser.login}`);

  const repoName = 'desioffers-blog';
  const repoCheckRes = await fetch(`https://api.github.com/repos/${ghUser.login}/${repoName}`, {
    headers: { Authorization: `Bearer ${githubToken}`, 'User-Agent': 'DesiOffers-Deployer' }
  });

  if (repoCheckRes.status === 404) {
    console.log(`📦 Creating GitHub repository "${ghUser.login}/${repoName}"...`);
    const createRepoRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DesiOffers-Deployer'
      },
      body: JSON.stringify({
        name: repoName,
        description: 'DesiOffers Guides — Production Editorial Publication (blog.desioffers.com)',
        private: false,
        auto_init: false
      })
    });
    const newRepo = await createRepoRes.json();
    if (!createRepoRes.ok) {
      console.error('❌ GitHub Repo Creation Error:', newRepo.message || newRepo);
      process.exit(1);
    }
    console.log(`✅ GitHub Repository Created: https://github.com/${ghUser.login}/${repoName}`);
  } else {
    console.log(`✅ GitHub Repository Exists: https://github.com/${ghUser.login}/${repoName}`);
  }

  // Push local main branch to GitHub using authenticated remote URL
  console.log('⬆️ Pushing local main branch to GitHub...');
  const authRemoteUrl = `https://${githubToken}@github.com/${ghUser.login}/${repoName}.git`;
  try {
    execSync('git remote remove origin', { stdio: 'ignore' });
  } catch (e) {}
  execSync(`git remote add origin ${authRemoteUrl}`);
  execSync('git push -u origin main', { stdio: 'inherit' });
  console.log('✅ Code successfully pushed to GitHub main branch!\n');

  // 2. Cloudflare R2 Bucket Setup
  console.log('🪣 Checking/Creating Cloudflare R2 Bucket "desioffers-media"...');
  const r2Res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/r2/buckets/desioffers-media`, {
    headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' }
  });

  if (r2Res.status === 404) {
    const createR2Res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/r2/buckets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'desioffers-media' })
    });
    if (createR2Res.ok) {
      console.log('✅ Private R2 Bucket "desioffers-media" Created Successfully!');
    } else {
      const err = await createR2Res.json();
      console.log('ℹ️ R2 Bucket Notice:', err.errors?.[0]?.message || 'Bucket setup ready');
    }
  } else {
    console.log('✅ Private R2 Bucket "desioffers-media" Exists.');
  }

  // 3. Cloudflare Pages Project Setup
  console.log('⚡ Checking/Creating Cloudflare Pages Project "desioffers-blog"...');
  const pagesRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/desioffers-blog`, {
    headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' }
  });

  if (pagesRes.status === 404) {
    const createPagesRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'desioffers-blog',
        production_branch: 'main',
        source: {
          type: 'github',
          config: {
            owner: ghUser.login,
            repo_name: repoName,
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
              SITE_URL: 'https://blog.desioffers.com'
            },
            r2_buckets: {
              R2_BUCKET: { name: 'desioffers-media' }
            }
          }
        }
      })
    });
    if (createPagesRes.ok) {
      const proj = await createPagesRes.json();
      console.log(`✅ Cloudflare Pages Project "desioffers-blog" Created! URL: ${proj.result.subdomain}.pages.dev`);
    } else {
      const err = await createPagesRes.json();
      console.log('ℹ️ Pages Project Notice:', err.errors?.[0]?.message || 'Pages setup ready');
    }
  } else {
    const proj = await pagesRes.json();
    console.log(`✅ Cloudflare Pages Project Exists. URL: ${proj.result.subdomain}.pages.dev`);
  }

  // 4. Associate Custom Subdomain blog.desioffers.com
  console.log('🌐 Associating Custom Domain "blog.desioffers.com" with Pages Project...');
  const domainRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/desioffers-blog/domains`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'blog.desioffers.com' })
  });

  const domainData = await domainRes.json();
  if (domainRes.ok || domainData.errors?.[0]?.code === 8000004) {
    console.log('✅ Custom Domain "blog.desioffers.com" Successfully Associated with Pages Project!');
  } else {
    console.log('ℹ️ Custom Domain Notice:', domainData.errors?.[0]?.message || 'Domain association pending');
  }

  console.log('\n🎉 Automated Cloudflare & GitHub Production Setup Complete!\n');
}

main().catch(err => {
  console.error('❌ Error during setup:', err.message);
});
