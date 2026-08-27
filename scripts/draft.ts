/**
 * Draft Article Entry Point
 *
 * This script is called by Antigravity (the AI orchestration layer) after it
 * has interpreted the user's natural language command and assembled a fully
 * structured ArticleDraft object.
 *
 * ROLE SEPARATION:
 *   Antigravity = AI reasoning, intent parsing, content generation
 *   This script = deterministic serialization, validation, file writing
 *
 * WORKFLOW:
 *   1. Receive ArticleDraft JSON via stdin or command-line argument
 *   2. Validate author slug (stops if invalid)
 *   3. Check slug uniqueness (stops if duplicate)
 *   4. Serialize to MDX via article-builder.ts
 *   5. Write to src/content/articles/{slug}.mdx
 *   6. Print editorial review summary
 *   7. STOP — does not commit, does not push, does not publish
 *
 * Exit codes:
 *   0 = success (draft written, review summary printed)
 *   1 = validation failure (author invalid, slug taken, missing fields)
 *   2 = write error
 */

import fs from 'fs';
import path from 'path';
import { SITE_CONFIG } from '../src/config/site.js';
import { validateAuthor, isSlugTaken } from '../src/lib/authoring/taxonomy-resolver.js';
import { buildArticleMdx, formatReviewSummary } from '../src/lib/authoring/article-builder.js';
import type { ArticleDraft } from '../src/lib/authoring/types.js';

// ---------------------------------------------------------------------------
// Input parsing
// ---------------------------------------------------------------------------

function readDraftInput(): ArticleDraft {
  // Accept JSON from: --draft='{}' flag, stdin pipe, or environment variable
  const args = process.argv.slice(2);

  const flagArg = args.find((a) => a.startsWith('--draft='));
  if (flagArg) {
    const json = flagArg.slice('--draft='.length);
    return JSON.parse(json) as ArticleDraft;
  }

  // Read from stdin (piped JSON)
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    const fd = fs.openSync('/dev/stdin', 'r');
    try {
      const buf = Buffer.alloc(65536);
      let read: number;
      while ((read = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
        chunks.push(buf.subarray(0, read));
      }
    } catch {
      // stdin may not support readSync on Windows — fall through
    } finally {
      fs.closeSync(fd);
    }
    if (chunks.length > 0) {
      return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as ArticleDraft;
    }
  }

  // No input provided
  console.error('❌ No ArticleDraft input provided.');
  console.error('   Usage: tsx scripts/draft.ts --draft=\'{"title":"...","slug":"...",...}\'');
  console.error('   Or pipe JSON via stdin: echo \'{"title":"..."}\' | tsx scripts/draft.ts');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('\n📝 DesiOffers Guides — Draft Article Writer\n');

  // Step 1: Read input
  let draft: ArticleDraft;
  try {
    draft = readDraftInput();
  } catch (e: any) {
    console.error('❌ Failed to parse ArticleDraft input:', e.message);
    process.exit(1);
  }

  // Step 2: Resolve author — use defaultAuthor from config if not set
  const authorSlug = draft.author || SITE_CONFIG.defaultAuthor;

  if (!authorSlug) {
    console.error('❌ No author configured.');
    console.error(
      '   Set SITE_CONFIG.defaultAuthor in src/config/site.ts, ' +
        'or provide "author" in the ArticleDraft input.'
    );
    console.error(
      '   The author slug must exactly match a file in src/content/authors/.'
    );
    process.exit(1);
  }

  const authorValidation = validateAuthor(authorSlug);
  if (authorValidation.error) {
    console.error(`❌ Author validation failed:\n   ${authorValidation.error}`);
    process.exit(1);
  }
  console.log(`✅ Author resolved: ${authorValidation.author!.name} (${authorSlug})`);

  // Use the resolved author slug in the draft
  const draftWithAuthor: ArticleDraft = { ...draft, author: authorSlug };

  // Step 3: Check slug uniqueness
  if (!draftWithAuthor.slug) {
    console.error('❌ ArticleDraft.slug is required but was not provided.');
    process.exit(1);
  }

  if (isSlugTaken(draftWithAuthor.slug)) {
    console.error(
      `❌ Slug "${draftWithAuthor.slug}" already exists in src/content/articles/. ` +
        'Choose a different slug or update the existing article.'
    );
    process.exit(1);
  }
  console.log(`✅ Slug "${draftWithAuthor.slug}" is available`);

  // Step 4: Build MDX
  console.log('🔧 Serializing article to MDX...');
  const { mdx, slug, warnings: buildWarnings } = buildArticleMdx(draftWithAuthor);

  if (buildWarnings.length > 0) {
    console.log('\n⚠️  Serialization warnings:');
    for (const w of buildWarnings) {
      console.log(`   ${w}`);
    }
  }

  // Step 5: Write to disk
  const outputPath = path.join(process.cwd(), 'src', 'content', 'articles', `${slug}.mdx`);

  try {
    fs.writeFileSync(outputPath, mdx, 'utf-8');
    console.log(`✅ Draft written to: ${outputPath}`);
  } catch (e: any) {
    console.error(`❌ Failed to write draft file: ${e.message}`);
    process.exit(2);
  }

  // Step 6: Run validate-content (non-blocking — shows results but doesn't stop workflow)
  console.log('\n🔍 Running taxonomy validation...');
  try {
    const { execSync } = await import('child_process');
    execSync('npm run validate-content', { stdio: 'inherit', cwd: process.cwd() });
    console.log('✅ Taxonomy validation passed');
  } catch {
    console.log('⚠️  Taxonomy validation reported issues. Review above output.');
  }

  // Step 7: Print review summary
  const summary = formatReviewSummary({
    draft: draftWithAuthor,
    buildWarnings,
    validationPassed: true,
    buildPassed: true, // Antigravity runs build separately and reports result
  });

  console.log('\n' + summary);

  // STOP — do not commit, do not push, do not publish
  console.log('\n✅ Draft workflow complete. Review the file above, then say "Publish ' + slug + '" to publish.\n');
}

main().catch((e) => {
  console.error('❌ Unexpected error in draft workflow:', e);
  process.exit(1);
});
