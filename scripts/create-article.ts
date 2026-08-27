/**
 * Production Article Creation CLI
 *
 * Orchestrates the full editorial workflow from structured input to verified draft.
 *
 * USAGE:
 *   npm run create-article -- --input=path/to/article-input.json
 *   npm run create-article -- --topic="..." --category="..."
 */

import fs from 'fs';
import { createEditorialArticleDraft, type ArticleWorkflowInput } from '../src/lib/workflow/index.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    console.log(`
DesiOffers Guides — Production Article Creation CLI

Usage:
  npm run create-article -- --input=<path-to-json>
  npm run create-article -- --topic="<title>" --category="<category-slug>" [options]

Options:
  --input=<file>          Path to JSON file containing ArticleWorkflowInput
  --topic="<title>"       Article title / topic
  --category="<slug>"     Category slug (e.g. gaming, electronics-audio, kitchen-appliances)
  --subcategory="<slug>"  Subcategory slug (e.g. earbuds, gaming-mice, air-fryers)
  --tags="<tag1,tag2>"    Comma-separated tag slugs
  --author="<slug>"       Author slug (defaults to site default: shaaz)
  --type="<type>"         Article type (default: buying-guide)
  --image="<path>"        Local path to hero image binary
  --json                  Output raw JSON review report instead of console report
    `);
    process.exit(0);
  }

  let workflowInput: ArticleWorkflowInput;

  // Check if first arg is a JSON file or --input
  const jsonArg = args.find((a) => a.endsWith('.json') || a.startsWith('--input='));
  let inputFilePath: string | undefined;

  if (jsonArg) {
    inputFilePath = jsonArg.startsWith('--input=') ? jsonArg.slice('--input='.length) : jsonArg;
  }

  if (inputFilePath) {
    if (!fs.existsSync(inputFilePath)) {
      console.error(`❌ Input JSON file not found: ${inputFilePath}`);
      process.exit(1);
    }
    workflowInput = JSON.parse(fs.readFileSync(inputFilePath, 'utf-8'));
  } else {
    const topicArg = args.find((a) => a.startsWith('--topic='))?.slice('--topic='.length);
    const categoryArg = args.find((a) => a.startsWith('--category='))?.slice('--category='.length);
    const subcategoryArg = args.find((a) => a.startsWith('--subcategory='))?.slice('--subcategory='.length);
    const tagsArg = args.find((a) => a.startsWith('--tags='))?.slice('--tags='.length);
    const authorArg = args.find((a) => a.startsWith('--author='))?.slice('--author='.length);
    const typeArg = args.find((a) => a.startsWith('--type='))?.slice('--type='.length);
    const imageArg = args.find((a) => a.startsWith('--image='))?.slice('--image='.length);

    if (!topicArg || !categoryArg) {
      console.error('❌ Missing required arguments: --topic and --category are required.');
      console.log('   Run "npm run create-article -- --help" for options.');
      process.exit(1);
    }

    workflowInput = {
      topic: topicArg,
      category: categoryArg,
      subcategory: subcategoryArg,
      tags: tagsArg ? tagsArg.split(',').map((t) => t.trim()) : [],
      author: authorArg || 'shaaz',
      articleType: (typeArg as any) || 'buying-guide',
      heroImageFilePath: imageArg,
      products: [],
    };
  }

  console.log('🚀 Starting Editorial Article Creation Workflow...\n');

  try {
    const result = await createEditorialArticleDraft(workflowInput);

    if (args.includes('--json')) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const passCount = result.qualityReport.summary.passCount;
      const warnCount = result.qualityReport.summary.warningCount;
      const blockCount = result.qualityReport.summary.blockerCount;
      const heroStatusDesc = result.heroImageUploadedToR2
        ? 'generated & R2 uploaded'
        : result.qualityReport.metadata.heroImageStatus === 'ready'
          ? 'ready (local/cdn)'
          : 'needs-generation';

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('DESIOFFERS ARTICLE CREATOR');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`Topic:\n  ${workflowInput.topic}\n`);
      console.log(`Slug:\n  ${result.slug}\n`);
      console.log(`Category:\n  ${workflowInput.category}${workflowInput.subcategory ? ` / ${workflowInput.subcategory}` : ''}\n`);
      console.log(`Products:\n  ${result.metrics.productsParsed} parsed\n  ${result.metrics.validAsinsCount} ASINs valid\n  ${result.metrics.affiliateLinksGenerated} affiliate URLs generated\n`);
      console.log(`Prices:\n  ${result.metrics.userObservedPricesCount} user-observed\n  ${result.metrics.unknownPricesCount} unknown\n`);
      console.log(`Product images:\n  ${result.metrics.imagelessProductsCount} imageless\n`);
      console.log(`Hero:\n  ${heroStatusDesc}\n`);
      console.log(`Quality:\n  ${passCount} PASS\n  ${warnCount} WARNING\n  ${blockCount} BLOCKER\n`);
      console.log(`Draft:\n  ${result.draftPath}\n`);
      console.log(`STATUS:\n  ${result.qualityReport.status === 'BLOCKED' ? '🔴 BLOCKED' : '🟢 READY FOR HUMAN REVIEW'}\n`);
      console.log('Next step:');
      console.log(`  npm run review -- ${result.slug}\n`);
    }
  } catch (err: any) {
    console.error('❌ Article Creation Failed:', err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error in create-article:', err);
  process.exit(1);
});
