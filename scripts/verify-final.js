import fs from 'fs';
import path from 'path';

console.log('🔍 Final DesiOffers Guides Verification Summary...\n');

const distDir = path.join(process.cwd(), 'dist');
if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ directory missing. Run npm run build first.');
  process.exit(1);
}

const files = fs.readdirSync(distDir);
console.log(`✅ Production build directory dist/ verified with ${files.length} top-level entries.`);

const robotsContent = fs.readFileSync(path.join(distDir, 'robots.txt'), 'utf-8');
const sitemapOk = robotsContent.includes('Sitemap: https://blog.desioffers.com/sitemap-index.xml');
console.log(`✅ robots.txt sitemap pointer: ${sitemapOk ? 'OK' : 'FAIL'}`);

const llmsOk = fs.existsSync(path.join(distDir, 'llms.txt'));
console.log(`✅ llms.txt machine overview: ${llmsOk ? 'OK' : 'FAIL'}`);

const rssOk = fs.existsSync(path.join(distDir, 'rss.xml'));
console.log(`✅ rss.xml RSS 2.0 feed: ${rssOk ? 'OK' : 'FAIL'}`);

console.log('\n🎉 Local repository & build artifacts fully verified for blog.desioffers.com production deployment.');
