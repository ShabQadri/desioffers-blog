/**
 * Quality Reporter
 *
 * Formats ArticleQualityReport into human-readable terminal output
 * or structured machine-readable JSON.
 */

import type { ArticleQualityReport } from './types.js';

export function formatQualityReportConsole(report: ArticleQualityReport): string {
  const statusBadge =
    report.status === 'READY_FOR_REVIEW'
      ? '🟢 READY FOR HUMAN REVIEW'
      : report.status === 'HAS_WARNINGS'
      ? '🟡 READY FOR REVIEW (WITH WARNINGS)'
      : '🔴 BLOCKED — RESOLVE ISSUES BEFORE PUBLICATION';

  const lines: string[] = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'DESIOFFERS GUIDES — ARTICLE QUALITY REVIEW REPORT',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `📄 Article:      ${report.title}`,
    `🔗 Slug:         ${report.slug}`,
    `📑 Type:         ${report.articleType}`,
    `📊 Status:       ${statusBadge}`,
    `📈 Summary:      ${report.summary.passCount} PASS | ${report.summary.warningCount} WARNINGS | ${report.summary.blockerCount} BLOCKERS`,
    '',
    '📋 CHECKS & VERIFICATION DETAILS:',
  ];

  // Group checks by category
  const categories = [
    'SEO',
    'TAXONOMY',
    'AUTHOR',
    'STRUCTURE',
    'PRODUCTS',
    'PRODUCT_VERIFICATION',
    'MEDIA',
    'AFFILIATE',
    'ANTI_FABRICATION',
  ] as const;

  for (const cat of categories) {
    const catChecks = report.checks.filter((c) => c.category === cat);
    if (catChecks.length === 0) continue;

    lines.push(`\n▶ [${cat}]`);
    for (const check of catChecks) {
      const icon = check.severity === 'BLOCKER' ? '❌' : check.severity === 'WARNING' ? '⚠️' : '✅';
      lines.push(`   ${icon} ${check.name}: ${check.message}`);
    }
  }

  if (report.blockers.length > 0) {
    lines.push('\n❌ BLOCKING ISSUES (Must be resolved before publishing):');
    for (const blocker of report.blockers) {
      lines.push(`   - ${blocker}`);
    }
  }

  if (report.warnings.length > 0) {
    lines.push('\n⚠️  ADVISORY WARNINGS (Review before final publication):');
    for (const warning of report.warnings) {
      lines.push(`   - ${warning}`);
    }
  }

  lines.push('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}

export function formatQualityReportJson(report: ArticleQualityReport): string {
  return JSON.stringify(report, null, 2);
}
