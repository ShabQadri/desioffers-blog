/**
 * Quality Guard — Content Fabrication Checker
 *
 * Deterministic pattern-based checker that scans article text for phrases
 * that claim testing, expert credentials, pricing, availability, or review
 * data that cannot be verified.
 *
 * This does NOT use AI reasoning. It uses static regex patterns.
 * Antigravity evaluates the returned warnings before writing the draft file.
 *
 * GUARDRAILS:
 * - Never fabricate product specifications
 * - Never fabricate prices or ratings
 * - Never claim hands-on testing without actual testing
 * - Never fabricate customer reviews
 * - Never claim expert credentials that don't exist
 * - Never assert price/availability without a source caveat
 */

import type { QualityWarning } from './types.js';
export type { QualityWarning };

// ---------------------------------------------------------------------------
// Pattern registry
// ---------------------------------------------------------------------------

interface GuardPattern {
  pattern: RegExp;
  severity: 'error' | 'warning';
  message: string;
  suggestion: string;
}

/**
 * Patterns that indicate potentially fabricated or misleading content.
 * Case-insensitive.
 */
const GUARD_PATTERNS: GuardPattern[] = [
  // Testing claims
  {
    pattern: /\bwe (tested|reviewed|tried|used|evaluated|benchmarked)\b/i,
    severity: 'error',
    message: 'Claims hands-on testing: "we tested/reviewed/tried..."',
    suggestion:
      'Replace with: "Based on specifications and our comparison criteria..." or "According to manufacturer data..."',
  },
  {
    pattern: /\bin our (hands-on|lab|testing|review|experience|testing)\b/i,
    severity: 'error',
    message: 'Claims hands-on experience or lab testing.',
    suggestion:
      'Replace with: "Based on available specifications..." or remove the claim.',
  },
  {
    pattern: /\bour (expert|team|editors?) (tested|found|discovered|verified|confirmed)\b/i,
    severity: 'error',
    message: 'Claims expert testing or verification by editorial team.',
    suggestion:
      'Replace with transparent language referencing publicly available information.',
  },
  {
    pattern: /\bafter (testing|trying|using|reviewing) (it|this|the product|these)\b/i,
    severity: 'error',
    message: 'Implies product was personally tested.',
    suggestion: 'Remove the testing claim. Use specification-based language.',
  },

  // Rating/review fabrication
  {
    pattern: /\b(rated|rated at|rates)\s+\d+(\.\d+)?\s*(out of|\/)\s*\d+\b/i,
    severity: 'error',
    message: 'Contains a fabricated product rating (e.g. "rated 4.5 out of 5").',
    suggestion:
      'Only include ratings if citing a verifiable public source (Amazon, official review site). Cite the source explicitly.',
  },
  {
    pattern: /\b\d[\d,]+\s+(customer|user|buyer)s?\s+reviews?\b/i,
    severity: 'error',
    message: 'Contains a fabricated review count (e.g. "2,000 customer reviews").',
    suggestion:
      'Remove the review count or cite the source and date explicitly.',
  },
  {
    pattern: /\b(customers?|users?|buyers?)\s+(love|recommend|prefer|rate)\b/i,
    severity: 'warning',
    message: 'Claims customer sentiment without a cited source.',
    suggestion:
      'Qualify the claim: "Many Amazon reviewers note..." or remove unsourced sentiment claims.',
  },

  // Price fabrication
  {
    pattern: /\b(priced at|costs?|available for|buy (it )?for|get (it )?for)\s+₹\s*[\d,]+\b/i,
    severity: 'warning',
    message: 'Contains a specific price claim without a source caveat.',
    suggestion:
      'Add a caveat: "Approximately ₹X at time of writing — check Amazon for current price." or use priceDisplay field instead.',
  },
  {
    pattern: /\bcurrently\s+(priced|selling|listed|available)\b/i,
    severity: 'warning',
    message: 'Claims current price/availability which may become inaccurate.',
    suggestion:
      'Add a date qualifier or use the product card fields (priceDisplay, availabilityNote) instead of body prose.',
  },

  // Availability fabrication
  {
    pattern: /\b(in stock|out of stock|ships in|arrives in|delivery in)\b/i,
    severity: 'warning',
    message: 'Claims specific availability or delivery information.',
    suggestion:
      'Remove or qualify: "Check Amazon India for current availability."',
  },
  {
    pattern: /\bcurrently (in|out of) stock\b/i,
    severity: 'error',
    message: 'Claims current stock status — cannot be verified in static content.',
    suggestion:
      'Remove. Use the availabilityNote product field which readers understand is point-in-time.',
  },

  // Credential fabrication
  {
    pattern: /\bour (in-house )?(expert|specialist|engineer|researcher|analyst)\b/i,
    severity: 'warning',
    message: 'References an "our expert" credential that may not exist.',
    suggestion:
      'Remove the credential claim or ensure the author bio accurately describes the expertise.',
  },
  {
    pattern: /\baccording to our (research|study|survey|analysis|data)\b/i,
    severity: 'error',
    message: 'Claims proprietary research or study data.',
    suggestion:
      'Replace with publicly available sources: "According to [source]..." or remove the claim.',
  },

  // Specification fabrication
  {
    pattern: /\b(we measured|our measurement|in our measurement|we clocked|we timed)\b/i,
    severity: 'error',
    message: 'Claims measured/benchmarked specifications.',
    suggestion:
      'Replace with: "The manufacturer specifies..." or "Spec sheet lists..."',
  },
];

// ---------------------------------------------------------------------------
// Main check function
// ---------------------------------------------------------------------------

/**
 * Scans article body text for content guardrail violations.
 *
 * @param text - The article body content (Markdown string)
 * @returns    - Array of QualityWarning objects. Empty array = clean.
 */
export function checkContentQuality(text: string): QualityWarning[] {
  const warnings: QualityWarning[] = [];

  for (const rule of GUARD_PATTERNS) {
    const match = rule.pattern.exec(text);
    if (match) {
      warnings.push({
        severity: rule.severity,
        message: rule.message,
        trigger: match[0],
        suggestion: rule.suggestion,
      });
    }
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the quality check found any errors (severity = 'error').
 * Warnings alone do not fail the check — they are shown to Antigravity for review.
 */
export function hasQualityErrors(warnings: QualityWarning[]): boolean {
  return warnings.some((w) => w.severity === 'error');
}

/**
 * Formats quality warnings into a human-readable report string.
 * Used by Antigravity to display issues before writing the draft.
 */
export function formatQualityReport(warnings: QualityWarning[]): string {
  if (warnings.length === 0) return '✅ Content quality check passed. No guardrail violations found.';

  const errors = warnings.filter((w) => w.severity === 'error');
  const cautions = warnings.filter((w) => w.severity === 'warning');

  const lines: string[] = [
    `⚠️  Content quality check found ${warnings.length} issue(s):`,
    '',
  ];

  if (errors.length > 0) {
    lines.push('ERRORS (must be fixed before drafting):');
    for (const e of errors) {
      lines.push(`  ❌ ${e.message}`);
      lines.push(`     Trigger: "${e.trigger}"`);
      lines.push(`     Fix: ${e.suggestion}`);
      lines.push('');
    }
  }

  if (cautions.length > 0) {
    lines.push('WARNINGS (review and confirm):');
    for (const w of cautions) {
      lines.push(`  ⚠️  ${w.message}`);
      lines.push(`     Trigger: "${w.trigger}"`);
      lines.push(`     Suggestion: ${w.suggestion}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
