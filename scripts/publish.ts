/**
 * Publish Article CLI Entry Point
 *
 * Deterministic publish script called when publishing an approved draft to production.
 *
 * USAGE:
 *   npm run publish -- <article-slug>
 *   npm run publish -- <article-slug> --dry-run
 *   npm run publish -- <article-slug> --confirm
 *
 * SAFETY GUARANTEES:
 * - Publication NEVER happens automatically.
 * - Validation errors BLOCK publication.
 * - Restricted media BLOCKS publication.
 * - Git divergence or unrelated changes BLOCK publication.
 * - Remote modifications (e.g. Sveltia CMS) BLOCK publication.
 * - Only the target article file is staged and committed.
 * - Never force pushes.
 */

import readline from 'readline';
import { preparePublishPlan, executePublish, formatPublishReport, verifyDeployedUrl } from '../src/lib/publish/workflow.js';

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const rawArgs = process.argv.slice(2);
  const flags = new Set<string>();
  const positional: string[] = [];

  for (const arg of rawArgs) {
    if (arg.startsWith('--')) {
      flags.add(arg.slice(2));
    } else {
      positional.push(arg);
    }
  }

  const slug = positional[0] ? positional[0].replace(/\.mdx?$/, '') : '';
  const isDryRun = flags.has('dry-run');
  const isConfirmed = flags.has('confirm');
  const shouldVerify = flags.has('verify') || !isDryRun;

  return { slug, isDryRun, isConfirmed, shouldVerify };
}

// ---------------------------------------------------------------------------
// Interactive Prompt Helper
// ---------------------------------------------------------------------------

async function askConfirmation(promptText: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

// ---------------------------------------------------------------------------
// Main CLI Runner
// ---------------------------------------------------------------------------

async function main() {
  const { slug, isDryRun, isConfirmed, shouldVerify } = parseArgs();

  if (!slug) {
    console.error('❌ Error: Missing article slug.');
    console.error('\nUsage:');
    console.error('  npm run publish -- <article-slug>');
    console.error('  npm run publish -- <article-slug> --dry-run');
    console.error('  npm run publish -- <article-slug> --confirm\n');
    process.exit(1);
  }

  console.log(`\n🔍 Preparing publication plan for article: "${slug}"...\n`);

  // 1. Prepare Plan (Runs Validator + Git Safety Pre-flight)
  const plan = preparePublishPlan(slug);

  // 2. Display Human Review Report
  console.log(formatPublishReport(plan));

  // 3. If blocking issues exist, stop immediately
  if (!plan.isReadyToPublish) {
    console.error(`\n❌ Publication cannot proceed. Resolved all blocking issues above before publishing.\n`);
    process.exit(1);
  }

  // 4. Handle Dry Run
  if (isDryRun) {
    console.log('\nℹ️ DRY RUN COMPLETE: All validation & Git safety checks passed cleanly.');
    console.log('   No changes were written, committed, or pushed.\n');
    process.exit(0);
  }

  // 5. Require Confirmation
  let confirmed = isConfirmed;
  if (!confirmed) {
    if (process.stdin.isTTY) {
      confirmed = await askConfirmation(`\n⚠️  Confirm publication of "${slug}" to GitHub origin/main? [y/N]: `);
    } else {
      console.error('\n❌ Non-interactive environment detected without --confirm flag.');
      console.error('   To publish non-interactively, pass the --confirm flag.\n');
      process.exit(1);
    }
  }

  if (!confirmed) {
    console.log('\n🛑 Publication cancelled by user. No changes were committed or pushed.\n');
    process.exit(0);
  }

  // 6. Execute Publication (transitions draft: false, commits only target file, pushes to origin/main)
  console.log('\n🚀 Executing publication...');
  const result = await executePublish(plan);

  if (!result.success) {
    console.error(`\n❌ Publication failed: ${result.error}\n`);
    process.exit(1);
  }

  console.log('\n🎉 PUBLICATION SUCCESSFUL!');
  console.log(`   Commit Hash:  ${result.commitHash?.slice(0, 8)}`);
  console.log(`   Commit Msg:   ${result.commitMessage}`);
  console.log(`   Branch:       origin/main`);
  console.log(`   Live URL:     ${result.deployedUrl}`);

  // 7. Optional Post-Deployment Verification
  if (shouldVerify) {
    console.log('\n📡 Checking Cloudflare Pages live deployment status...');
    const verifyResult = await verifyDeployedUrl(result.deployedUrl, 3, 2000);
    console.log(`   ${verifyResult.message}\n`);
  }
}

main().catch((err) => {
  console.error('\n❌ Unexpected fatal error in publish workflow:', err.message || err);
  process.exit(1);
});
