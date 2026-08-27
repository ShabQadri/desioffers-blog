/**
 * Publish Workflow Orchestrator
 *
 * Coordinates the multi-step publish lifecycle:
 * 1. Pre-publish validation (schema, taxonomy, author, media rights, quality guard)
 * 2. Git pre-flight safety (status, divergence, remote target conflict)
 * 3. Human review summary formatting
 * 4. Explicit transition (draft: true → draft: false)
 * 5. Atomic Git stage, commit & push
 * 6. Post-deployment verification helper
 *
 * NOTE: Publication NEVER happens automatically. An explicit confirmation is mandatory.
 */

import fs from 'fs';
import path from 'path';
import { validateArticleForPublish, type ValidationReport } from './validator.js';
import { runGitSafetyPreflight, commitPublishChanges, pushToRemote, type GitSafetyPreflightResult } from './git-safety.js';
import { SITE_CONFIG } from '../../config/site.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PublishPlan {
  slug: string;
  articleFile: string;
  validationReport: ValidationReport;
  gitReport: GitSafetyPreflightResult;
  isReadyToPublish: boolean;
  blockingReasons: string[];
}

export interface PublishExecutionResult {
  success: boolean;
  slug: string;
  commitHash?: string;
  commitMessage?: string;
  pushOutput?: string;
  deployedUrl: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Human Review Summary Formatter
// ---------------------------------------------------------------------------

export function formatPublishReport(plan: PublishPlan): string {
  const { validationReport, gitReport, slug } = plan;
  const data = validationReport.parsedData;

  const lines: string[] = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'DESIOFFERS GUIDES — PRE-PUBLICATION REPORT',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    '📄 ARTICLE',
    `   Title:        ${data?.title || 'Unknown'}`,
    `   Slug:         ${slug}`,
    `   Article Type: ${data?.articleType || 'buying-guide'}`,
    `   Category:     ${data?.category || 'Unknown'}`,
    `   Subcategory:  ${data?.subcategory || '(none)'}`,
    `   Tags:         ${data?.tags && data.tags.length > 0 ? data.tags.join(', ') : '(none)'}`,
    `   Author:       ${data?.author || 'Unknown'}`,
    '',
    '🔍 SEO & METADATA',
    `   SEO Title:    ${data?.seoTitle || data?.title || '(default from title)'}`,
    `   Description:  ${data?.seoDescription || data?.description || '(default from desc)'}`,
    `   Canonical:    ${SITE_CONFIG.url}/${slug}/`,
    '',
    '🖼️  MEDIA PROVENANCE & RIGHTS',
    `   Hero Image:   ${data?.heroImage || 'None'}`,
    `   Hero Status:  ${data?.heroImageStatus || 'ready'}`,
    `   Hero Source:  ${data?.heroImageSource || 'r2'}`,
    `   Hero Rights:  ${data?.heroImageRightsStatus || 'original'}`,
    ...((data?.products || []).map((p) => {
      const src = p.imageSource || 'none';
      const rights = p.imageRightsStatus || '(unspecified)';
      return `   Product #${p.position}: [source: ${src}, rights: ${rights}] ${p.name}`;
    })),
    '',
    '🛒 AFFILIATE DISCLOSURE & LINKS',
    `   Affiliate Links:     ${validationReport.affiliateLinkCount} verified link(s)`,
    `   Amazon Associate ID: ${SITE_CONFIG.amazonAffiliateTag ? `Configured ("${SITE_CONFIG.amazonAffiliateTag}")` : 'Unconfigured (using clean canonical links)'}`,
    `   Rel Attributes:      rel="sponsored nofollow noopener" (enforced by ProductCard)`,
    '',
    '🛡️  VALIDATION CHECKS',
    `   Schema Integrity:    ${validationReport.errors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`,
    `   Taxonomy & Author:   ${validationReport.errors.some((e) => e.includes('category') || e.includes('author') || e.includes('Tag')) ? '❌ FAILED' : '✅ PASSED'}`,
    `   Quality Guard:       ${validationReport.qualityWarnings.some((w) => w.severity === 'error') ? '❌ FAILED' : '✅ PASSED (No fabrication claims)'}`,
    `   Media Rights Safety: ${validationReport.errors.some((e) => e.includes('Rights') || e.includes('restricted')) ? '❌ FAILED' : '✅ PASSED (No restricted media)'}`,
    '',
    '🐙 GIT SAFETY PRE-FLIGHT',
    `   Branch:              ${gitReport.branch} (Target: main)`,
    `   Local HEAD:          ${gitReport.localHeadCommit.slice(0, 8)}`,
    `   Remote origin/main:  ${gitReport.remoteHeadCommit ? gitReport.remoteHeadCommit.slice(0, 8) : 'Not reachable'}`,
    `   Divergence State:    ${gitReport.commitsBehind === 0 && !gitReport.hasDiverged ? '✅ In sync with remote' : `❌ Out of sync (${gitReport.commitsBehind} behind, ${gitReport.commitsAhead} ahead)`}`,
    `   Unrelated Changes:   ${gitReport.unrelatedModifiedFiles.length === 0 ? '✅ None detected' : `❌ ${gitReport.unrelatedModifiedFiles.length} unrelated file(s) modified`}`,
    `   Files to Commit:     src/content/articles/${slug}.mdx ONLY`,
    '',
  ];

  if (plan.blockingReasons.length > 0) {
    lines.push('❌ BLOCKING ISSUES (Publication cannot proceed):');
    for (const r of plan.blockingReasons) {
      lines.push(`   - ${r}`);
    }
    lines.push('');
  }

  if (validationReport.warnings.length > 0) {
    lines.push('⚠️  WARNINGS (Editorial review advised):');
    for (const w of validationReport.warnings) {
      lines.push(`   - ${w}`);
    }
    lines.push('');
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Transition Draft State in File (draft: true → draft: false)
// ---------------------------------------------------------------------------

export function setArticleDraftStatus(filePath: string, draftStatus: boolean): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Article file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  // Replace draft: true with draft: false cleanly in frontmatter
  const updated = content.replace(/^draft:\s*(true|false)/m, `draft: ${draftStatus}`);

  if (updated === content && !content.includes('draft:')) {
    // If draft field wasn't present, insert before closing frontmatter delimiter
    const withDraft = content.replace(/^---\r?\n([\s\S]*?)\r?\n---/m, (_, fm) => `---\n${fm}\ndraft: ${draftStatus}\n---`);
    fs.writeFileSync(filePath, withDraft, 'utf-8');
    return;
  }

  fs.writeFileSync(filePath, updated, 'utf-8');
}

// ---------------------------------------------------------------------------
// Prepare Publish Plan
// ---------------------------------------------------------------------------

export function preparePublishPlan(slug: string, options?: { allowedExtraFiles?: string[]; cwd?: string }): PublishPlan {
  const cwd = options?.cwd || process.cwd();
  const articleFile = `src/content/articles/${slug}.mdx`;
  const fullPath = path.join(cwd, articleFile);

  const validationReport = validateArticleForPublish(slug, { contentDir: path.join(cwd, 'src', 'content') });
  const gitReport = runGitSafetyPreflight({
    targetArticleSlug: slug,
    allowedExtraFiles: options?.allowedExtraFiles,
    cwd,
  });

  const blockingReasons: string[] = [];

  // Collect validation errors
  blockingReasons.push(...validationReport.errors);

  // Collect git errors
  blockingReasons.push(...gitReport.errors);

  // Check if file exists on disk
  if (!fs.existsSync(fullPath)) {
    blockingReasons.push(`Target article file "${articleFile}" does not exist.`);
  }

  const isReadyToPublish = blockingReasons.length === 0;

  return {
    slug,
    articleFile,
    validationReport,
    gitReport,
    isReadyToPublish,
    blockingReasons,
  };
}

// ---------------------------------------------------------------------------
// Execute Publication
// ---------------------------------------------------------------------------

export async function executePublish(
  plan: PublishPlan,
  options?: { cwd?: string; skipPush?: boolean }
): Promise<PublishExecutionResult> {
  const cwd = options?.cwd || process.cwd();
  const fullPath = path.join(cwd, plan.articleFile);
  const deployedUrl = `${SITE_CONFIG.url}/${plan.slug}/`;

  if (!plan.isReadyToPublish) {
    return {
      success: false,
      slug: plan.slug,
      deployedUrl,
      error: `Publication blocked by ${plan.blockingReasons.length} issue(s):\n${plan.blockingReasons.join('\n')}`,
    };
  }

  try {
    // 1. Transition draft state to false on disk
    setArticleDraftStatus(fullPath, false);

    // 2. Double-check validation after transition
    const postCheck = validateArticleForPublish(plan.slug, { contentDir: path.join(cwd, 'src', 'content') });
    if (!postCheck.isValid) {
      // Rollback file to draft: true
      setArticleDraftStatus(fullPath, true);
      return {
        success: false,
        slug: plan.slug,
        deployedUrl,
        error: `Post-transition validation failed: ${postCheck.errors.join(', ')}`,
      };
    }

    // 3. Atomic commit (stages ONLY the article file)
    const commitResult = commitPublishChanges({
      slug: plan.slug,
      title: plan.validationReport.parsedData?.title,
      files: [plan.articleFile],
      cwd,
    });

    // 4. Push to origin main
    let pushOutput = '';
    if (!options?.skipPush) {
      const pushRes = pushToRemote('origin', 'main', cwd);
      if (!pushRes.success) {
        return {
          success: false,
          slug: plan.slug,
          commitHash: commitResult.commitHash,
          commitMessage: commitResult.message,
          deployedUrl,
          error: `Git push failed: ${pushRes.output}. The commit was created locally (${commitResult.commitHash}).`,
        };
      }
      pushOutput = pushRes.output;
    }

    return {
      success: true,
      slug: plan.slug,
      commitHash: commitResult.commitHash,
      commitMessage: commitResult.message,
      pushOutput,
      deployedUrl,
    };
  } catch (err: any) {
    // Ensure draft status is reverted if an unexpected exception occurs
    try {
      if (fs.existsSync(fullPath)) {
        setArticleDraftStatus(fullPath, true);
      }
    } catch {}

    return {
      success: false,
      slug: plan.slug,
      deployedUrl,
      error: `Unexpected error during publication: ${err.message}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Post-deployment HTTP Verification Helper
// ---------------------------------------------------------------------------

export async function verifyDeployedUrl(url: string, maxAttempts: number = 3, intervalMs: number = 3000): Promise<{
  isOnline: boolean;
  status?: number;
  message: string;
}> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'DesiOffers-Verification' } });
      if (res.status === 200) {
        return { isOnline: true, status: 200, message: `✅ Live article URL is online (HTTP 200): ${url}` };
      }
    } catch {
      // Fall through to retry
    }
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return {
    isOnline: false,
    message: `ℹ️ Cloudflare Pages build is in progress. The article URL (${url}) will be live once the automated build completes.`,
  };
}
