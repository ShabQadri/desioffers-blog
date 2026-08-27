/**
 * Article Quality Review CLI
 *
 * Evaluates an article against all quality, taxonomy, SEO, affiliate, and anti-fabrication
 * standards. Produces human-readable report or JSON output.
 *
 * USAGE:
 *   npm run review -- <article-slug>
 *   npm run review -- <article-slug> --json
 */

import {
  evaluateArticleQualityAsync,
  formatQualityReportConsole,
  formatQualityReportJson,
} from '../src/lib/quality/index.js';

async function main() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => !a.startsWith('-') && a !== 'json');
  const isJson = args.some((a) => a === '--json' || a === '-j' || a === 'json');

  if (!slugArg) {
    console.error('❌ Error: Article slug required.');
    console.log('\nUsage:');
    console.log('  npm run review -- <article-slug>');
    console.log('  npm run review -- <article-slug> --json\n');
    process.exit(1);
  }

  const report = await evaluateArticleQualityAsync(slugArg);

  if (isJson) {
    console.log(formatQualityReportJson(report));
  } else {
    console.log(formatQualityReportConsole(report));
  }

  // Exit with non-zero if blocked
  if (report.status === 'BLOCKED') {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Error running article review:', err);
  process.exit(1);
});
