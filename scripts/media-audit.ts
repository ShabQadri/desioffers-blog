/**
 * Media Audit CLI Entry Point
 *
 * Scans all existing articles, audits their media references, and prints
 * a classification report.
 *
 * USAGE:
 *   npm run media:audit
 */

import { auditAllArticlesMedia, formatMediaAuditReport } from '../src/lib/media/audit.js';

function main() {
  console.log('\n🔍 Running DesiOffers Guides Media Reference Audit...\n');
  const audit = auditAllArticlesMedia();
  console.log(formatMediaAuditReport(audit));
}

main();
