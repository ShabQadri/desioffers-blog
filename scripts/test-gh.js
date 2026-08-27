import fs from 'fs';
import path from 'path';

const envFile = path.join(process.env.USERPROFILE || '', '.env');
const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
const env = {};
lines.forEach(l => {
  const parts = l.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const githubToken = env.GITHUB_TOKEN;

async function checkScopes() {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${githubToken}`, 'User-Agent': 'DesiOffers-Deployer' }
  });
  console.log('GitHub API Scopes Header:', res.headers.get('x-oauth-scopes'));
}

checkScopes().catch(console.error);
