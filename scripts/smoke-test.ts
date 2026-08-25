import fs from 'fs';
import path from 'path';

console.log('🧪 Running Final DesiOffers Guides Production Smoke Test...\n');

const distDir = path.join(process.cwd(), 'dist');
let localhostFoundCount = 0;
let pickwiseFoundCount = 0;
let fileCount = 0;

function scanDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.html') || file.endsWith('.xml') || file.endsWith('.json') || file.endsWith('.txt')) {
      fileCount++;
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('localhost:') || content.includes('http://localhost')) {
        console.error(`❌ [${file}]: Found localhost URL in production build output!`);
        localhostFoundCount++;
      }
      if (content.includes('pickwise.in') || content.includes('PickWise')) {
        console.error(`❌ [${file}]: Found legacy brand "PickWise" in production build output!`);
        pickwiseFoundCount++;
      }
    }
  }
}

scanDir(distDir);

// Check robots.txt sitemap reference
const robotsPath = path.join(distDir, 'robots.txt');
const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
const sitemapOk = robotsContent.includes('Sitemap: https://blog.desioffers.com/sitemap-index.xml');

// Check llms.txt presence
const llmsPath = path.join(distDir, 'llms.txt');
const llmsExists = fs.existsSync(llmsPath);

// Check rss.xml presence
const rssPath = path.join(distDir, 'rss.xml');
const rssExists = fs.existsSync(rssPath);

console.log(`📊 Scanned ${fileCount} production files in dist/`);

if (localhostFoundCount > 0) {
  console.error(`❌ Smoke Test Failed: ${localhostFoundCount} files contain localhost URLs.`);
  process.exit(1);
}

if (pickwiseFoundCount > 0) {
  console.error(`❌ Smoke Test Failed: ${pickwiseFoundCount} files contain legacy brand PickWise.`);
  process.exit(1);
}

if (!sitemapOk) {
  console.error(`❌ Smoke Test Failed: robots.txt does not correctly point to https://blog.desioffers.com/sitemap-index.xml`);
  process.exit(1);
}

if (!llmsExists || !rssExists) {
  console.error(`❌ Smoke Test Failed: Missing rss.xml or llms.txt`);
  process.exit(1);
}

console.log('✅ robots.txt points correctly to https://blog.desioffers.com/sitemap-index.xml');
console.log('✅ rss.xml & llms.txt generated cleanly');
console.log('✅ Zero legacy "PickWise" or "localhost" references found in production output');
console.log('\n🎉 DesiOffers Guides production smoke test passed.');
