import fs from 'fs';
import path from 'path';
import { generateArticleHeroBrief } from '../src/lib/media/brief.js';
import { ingestLocalFile } from '../src/lib/media/generator-interface.js';
import { MediaDeduplicator } from '../src/lib/media/deduplicator.js';
import { MediaManifest } from '../src/lib/media/manifest.js';

async function main() {
  console.log('🔍 Testing Real Media Pipeline Ingestion & Normalization...\n');

  const imagePath = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\dc9f178b-a0ae-45af-a02d-71b4d7b16ab4\\budget_gaming_mice_hero_1787807025440.jpg';

  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Image binary not found at ${imagePath}`);
    process.exit(1);
  }

  const brief = generateArticleHeroBrief({
    title: '5 Best Budget Gaming Mice Under ₹3,000 in India (2026 Edition)',
    articleSlug: 'budget-gaming-mice-under-3000',
    categorySlug: 'gaming',
    subcategorySlug: 'gaming-mice',
  });

  console.log('1. Generated Hero Brief:');
  console.log(`   - Filename: ${brief.filename}`);
  console.log(`   - Dimensions: ${brief.targetDimensions.width}x${brief.targetDimensions.height}`);
  console.log(`   - Role: ${brief.role}`);
  console.log(`   - Provenance: ${brief.provenance}`);
  console.log(`   - Rights: ${brief.rightsStatus}\n`);

  // Ingestion
  const ingestResult = ingestLocalFile({
    filePath: imagePath,
    brief,
  });

  if (!ingestResult.isValid || !ingestResult.mediaRecord) {
    console.error('❌ Ingestion failed:', ingestResult.error);
    process.exit(1);
  }

  const rec = ingestResult.mediaRecord;
  console.log('2. Ingestion & Normalization Result:');
  console.log(`   - R2 Object Key:        ${rec.r2Key}`);
  console.log(`   - Normalized Filename:  ${rec.normalizedFilename}`);
  console.log(`   - Content SHA-256:      ${rec.contentHash}`);
  console.log(`   - MIME Type:            ${rec.mimeType}`);
  console.log(`   - Dimensions:           ${rec.dimensions.width}x${rec.dimensions.height}`);
  console.log(`   - Size Bytes:           ${rec.sizeBytes} bytes`);
  console.log(`   - Transformed URL:      ${rec.publicUrl}`);
  console.log(`   - Source Provenance:    ${rec.source}`);
  console.log(`   - Rights Status:        ${rec.rightsStatus}\n`);

  // Deduplication check
  const deduplicator = new MediaDeduplicator();
  const dupCheck = deduplicator.check(rec.contentHash);
  console.log(`3. Deduplication Check: Duplicate in Manifest? -> ${dupCheck.isDuplicate ? 'YES (Duplicate found)' : 'NO (Unique asset)'}`);

  // Register in manifest
  const manifest = new MediaManifest();
  manifest.addRecord(rec);
  console.log('✅ Media Record registered in MediaManifest.');

  // Copy local asset for local fallback / serving
  const localDestDir = path.join(process.cwd(), 'public', 'images', 'articles');
  fs.mkdirSync(localDestDir, { recursive: true });
  const localDest = path.join(localDestDir, 'budget-gaming-mice-under-3000-hero.jpg');
  fs.copyFileSync(imagePath, localDest);
  console.log(`✅ Local fallback asset copied to: ${localDest}`);
}

main().catch(console.error);
