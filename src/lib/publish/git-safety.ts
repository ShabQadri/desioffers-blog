/**
 * Git Safety Module
 *
 * Deterministic Git pre-flight checks and atomic staging/commit/push utilities.
 * Enforces strict safety rules before any publication operation:
 *
 * RULES:
 * 1. Never force push (`--force`, `+`).
 * 2. Never run `git add .` or stage unrelated files.
 * 3. Stop if local branch is behind origin/main.
 * 4. Stop if local branch has diverged from origin/main.
 * 5. Stop if target article has been modified remotely (e.g. via Sveltia CMS).
 * 6. Stop if unrelated uncommitted working tree changes exist.
 * 7. Stop on merge/conflict state.
 */

import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GitFileStatus {
  path: string;
  statusCode: string;
  isStaged: boolean;
  isUnstaged: boolean;
  isUntracked: boolean;
}

export interface GitSafetyPreflightResult {
  isSafe: boolean;
  branch: string;
  localHeadCommit: string;
  remoteHeadCommit: string;
  commitsBehind: number;
  commitsAhead: number;
  hasDiverged: boolean;
  unrelatedModifiedFiles: string[];
  remoteTargetArticleChanged: boolean;
  errors: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Low-level Exec Helper
// ---------------------------------------------------------------------------

function runGit(cmd: string, cwd: string = process.cwd()): string {
  try {
    return execSync(`git ${cmd}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (err: any) {
    const stderr = err.stderr ? err.stderr.toString().trim() : '';
    const stdout = err.stdout ? err.stdout.toString().trim() : '';
    throw new Error(stderr || stdout || err.message);
  }
}

// ---------------------------------------------------------------------------
// Git Inspection Functions
// ---------------------------------------------------------------------------

export function getCurrentBranch(cwd?: string): string {
  return runGit('branch --show-current', cwd) || 'main';
}

export function getLocalHeadHash(cwd?: string): string {
  return runGit('rev-parse HEAD', cwd);
}

export function getRemoteHeadHash(remote: string = 'origin', branch: string = 'main', cwd?: string): string {
  try {
    return runGit(`rev-parse ${remote}/${branch}`, cwd);
  } catch {
    return '';
  }
}

export function fetchRemote(remote: string = 'origin', branch: string = 'main', cwd?: string): { success: boolean; error?: string } {
  try {
    runGit(`fetch ${remote} ${branch}`, cwd);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function getWorkingTreeStatus(cwd?: string): GitFileStatus[] {
  const output = runGit('status --porcelain', cwd);
  if (!output) return [];

  const lines = output.split(/\r?\n/).filter(Boolean);
  return lines.map((line) => {
    const statusCode = line.slice(0, 2);
    const filePath = line.slice(3).trim();
    const x = statusCode[0];
    const y = statusCode[1];

    return {
      path: filePath,
      statusCode,
      isStaged: x !== ' ' && x !== '?',
      isUnstaged: y !== ' ' && y !== '?',
      isUntracked: statusCode === '??',
    };
  });
}

export function getBranchDivergence(
  remote: string = 'origin',
  branch: string = 'main',
  cwd?: string
): { behind: number; ahead: number; hasDiverged: boolean } {
  try {
    const counts = runGit(`rev-list --left-right --count ${remote}/${branch}...HEAD`, cwd);
    const [behindStr, aheadStr] = counts.split(/\s+/);
    const behind = parseInt(behindStr, 10) || 0;
    const ahead = parseInt(aheadStr, 10) || 0;
    const hasDiverged = behind > 0 && ahead > 0;

    return { behind, ahead, hasDiverged };
  } catch {
    return { behind: 0, ahead: 0, hasDiverged: false };
  }
}

export function checkRemoteTargetArticleModified(
  targetRelativePath: string,
  remote: string = 'origin',
  branch: string = 'main',
  cwd?: string
): boolean {
  try {
    // Check if remote branch has modified the target file compared to merge base
    const diff = runGit(`diff ${remote}/${branch}...HEAD -- "${targetRelativePath}"`, cwd);
    // Also check if remote differs from local HEAD on this file
    const remoteDiff = runGit(`diff ${remote}/${branch} HEAD -- "${targetRelativePath}"`, cwd);
    return diff.length > 0 && remoteDiff.length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Pre-flight Safety Validator
// ---------------------------------------------------------------------------

export function runGitSafetyPreflight(params: {
  targetArticleSlug: string;
  allowedExtraFiles?: string[];
  remote?: string;
  targetBranch?: string;
  cwd?: string;
}): GitSafetyPreflightResult {
  const { targetArticleSlug, allowedExtraFiles = [], remote = 'origin', targetBranch = 'main', cwd = process.cwd() } = params;

  const errors: string[] = [];
  const warnings: string[] = [];

  const targetArticleFile = `src/content/articles/${targetArticleSlug}.mdx`;
  const allowedSet = new Set([targetArticleFile, ...allowedExtraFiles]);

  // 1. Current Branch
  const branch = getCurrentBranch(cwd);
  if (branch !== targetBranch) {
    warnings.push(`Current local branch is "${branch}". Target production branch is "${targetBranch}".`);
  }

  // 2. Fetch Remote
  const fetchRes = fetchRemote(remote, targetBranch, cwd);
  if (!fetchRes.success) {
    warnings.push(`Could not fetch ${remote}/${targetBranch} (offline or remote unreachable: ${fetchRes.error}).`);
  }

  // 3. Commit Hashes & Divergence
  const localHeadCommit = getLocalHeadHash(cwd);
  const remoteHeadCommit = getRemoteHeadHash(remote, targetBranch, cwd);
  const { behind, ahead, hasDiverged } = getBranchDivergence(remote, targetBranch, cwd);

  if (behind > 0 && !hasDiverged) {
    errors.push(`Local branch is ${behind} commit(s) behind ${remote}/${targetBranch}. Pull origin ${targetBranch} before publishing.`);
  }

  if (hasDiverged) {
    errors.push(
      `Local branch has diverged from ${remote}/${targetBranch} (${behind} behind, ${ahead} ahead). Manual rebase/merge required.`
    );
  }

  // 4. Working Tree Inspection — Detect Unrelated Changes
  const statusList = getWorkingTreeStatus(cwd);
  const unrelatedModifiedFiles: string[] = [];

  for (const item of statusList) {
    // Normalise path separators
    const normPath = item.path.replace(/\\/g, '/');
    if (!allowedSet.has(normPath)) {
      // Exclude harmless untracked temporary files or non-content files
      if (!normPath.startsWith('dist/') && !normPath.startsWith('.astro/')) {
        unrelatedModifiedFiles.push(normPath);
      }
    }
  }

  if (unrelatedModifiedFiles.length > 0) {
    errors.push(
      `Unrelated working tree changes detected (${unrelatedModifiedFiles.length} files: ${unrelatedModifiedFiles.slice(0, 3).join(', ')}${
        unrelatedModifiedFiles.length > 3 ? '...' : ''
      }). Stash or commit unrelated changes before publishing.`
    );
  }

  // 5. Remote Target Article Conflict Check
  let remoteTargetArticleChanged = false;
  if (remoteHeadCommit) {
    remoteTargetArticleChanged = checkRemoteTargetArticleModified(targetArticleFile, remote, targetBranch, cwd);
    if (remoteTargetArticleChanged) {
      errors.push(`Target article "${targetArticleFile}" has remote modifications on ${remote}/${targetBranch} (possibly edited in Sveltia CMS). Pull and inspect before publishing.`);
    }
  }

  const isSafe = errors.length === 0;

  return {
    isSafe,
    branch,
    localHeadCommit,
    remoteHeadCommit,
    commitsBehind: behind,
    commitsAhead: ahead,
    hasDiverged,
    unrelatedModifiedFiles,
    remoteTargetArticleChanged,
    errors,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Atomic Stage, Commit & Push
// ---------------------------------------------------------------------------

export function stageSpecificFiles(files: string[], cwd: string = process.cwd()): void {
  if (files.length === 0) {
    throw new Error('No files specified to stage.');
  }

  for (const f of files) {
    const norm = f.replace(/\\/g, '/');
    if (norm === '.' || norm === './' || norm === '*') {
      throw new Error('Dangerous staging pattern rejected: `git add .` is prohibited.');
    }
    runGit(`add "${norm}"`, cwd);
  }
}

export function commitPublishChanges(params: {
  slug: string;
  title?: string;
  files: string[];
  cwd?: string;
}): { commitHash: string; message: string } {
  const { slug, files, cwd = process.cwd() } = params;
  const message = `Publish article: ${slug}`;

  // Stage ONLY specified files
  stageSpecificFiles(files, cwd);

  // Commit
  runGit(`commit -m "${message}"`, cwd);
  const commitHash = getLocalHeadHash(cwd);

  return { commitHash, message };
}

export function pushToRemote(remote: string = 'origin', branch: string = 'main', cwd: string = process.cwd()): { success: boolean; output: string } {
  // CRITICAL: NEVER use --force or + prefix
  try {
    const output = runGit(`push ${remote} ${branch}`, cwd);
    return { success: true, output };
  } catch (err: any) {
    return { success: false, output: err.message };
  }
}
