import * as fs from 'fs';
import * as path from 'path';

function getAllHtmlFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllHtmlFiles(fullPath, fileList);
    } else if (item.endsWith('.html')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export function runResponsiveAudit(): { totalPages: number; passed: number; issues: number } {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DESIOFFERS GUIDES — RESPONSIVE & MOBILE AUDIT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const rootDir = process.cwd();
  const distDir = path.join(rootDir, 'dist');

  if (!fs.existsSync(distDir)) {
    console.error('❌ dist/ directory not found. Please run "npm run build" first.');
    return { totalPages: 0, passed: 0, issues: 1 };
  }

  const htmlFiles = getAllHtmlFiles(distDir).filter(f => !f.includes('admin'));
  console.log(`🔍 Scanning ${htmlFiles.length} generated production pages for responsive compliance...\n`);

  let passed = 0;
  let issues = 0;

  for (const file of htmlFiles) {
    const relativePath = path.relative(distDir, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf-8');
    const warnings: string[] = [];

    // 1. Viewport Meta
    const hasViewport = content.includes('name="viewport"') && content.includes('width=device-width');
    if (!hasViewport) {
      warnings.push('Missing responsive viewport meta tag');
    }

    // 2. Skip to Content
    const hasSkipLink = content.includes('skip-to-content');
    if (!hasSkipLink) {
      warnings.push('Missing accessible skip-to-content link');
    }

    // 3. Header & Mobile Menu
    const hasHeader = content.includes('main-header');
    const hasMobileToggle = content.includes('mobile-menu-toggle');
    const hasMobileDrawer = content.includes('mobile-nav-drawer');
    if (!hasHeader) {
      warnings.push('Missing main header');
    } else if (!hasMobileToggle || !hasMobileDrawer) {
      warnings.push('Missing mobile drawer toggle or container');
    }

    // 4. Check for hazardous inline fixed widths
    const fixedWidthInlineMatches = content.match(/style="[^"]*width:\s*\d{3,}px/g) || [];
    if (fixedWidthInlineMatches.length > 0) {
      warnings.push(`Contains ${fixedWidthInlineMatches.length} fixed-width inline style(s)`);
    }

    if (warnings.length === 0) {
      passed++;
    } else {
      issues++;
      console.log(`❌ [${relativePath}]:`);
      warnings.forEach((w) => console.log(`   - ${w}`));
    }
  }

  // Check built CSS bundles in dist/_astro
  function getAllFilesWithExt(dir: string, ext: string, list: string[] = []): string[] {
    if (!fs.existsSync(dir)) return list;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        getAllFilesWithExt(full, ext, list);
      } else if (item.endsWith(ext)) {
        list.push(full);
      }
    }
    return list;
  }

  const cssFiles = getAllFilesWithExt(path.join(distDir, '_astro'), '.css');
  let found640Query = false;
  let foundTableScroll = false;
  let foundWordBreak = false;

  for (const file of cssFiles) {
    const cssContent = fs.readFileSync(file, 'utf-8');
    if (cssContent.includes('640px')) {
      found640Query = true;
    }
    if (cssContent.includes('overflow-x') && cssContent.includes('auto')) {
      foundTableScroll = true;
    }
    if (cssContent.includes('overflow-wrap') || cssContent.includes('break-word')) {
      foundWordBreak = true;
    }
  }

  console.log(`\n📊 AUDIT SUMMARY:`);
  console.log(`   - Total Pages Scanned: ${htmlFiles.length}`);
  console.log(`   - Fully Compliant Pages: ${passed}`);
  console.log(`   - Pages with Warnings/Issues: ${issues}`);
  console.log(`   - Responsive Mobile Breakpoints (@media max-width: 640px): ${found640Query ? '✅ ACTIVE' : '⚠️ NOT DETECTED'}`);
  console.log(`   - Table Local Scroll Protection (overflow-x: auto): ${foundTableScroll ? '✅ ACTIVE' : '⚠️ NOT DETECTED'}`);
  console.log(`   - Global Word Break Overflow Protection: ${foundWordBreak ? '✅ ACTIVE' : '⚠️ NOT DETECTED'}`);

  if (issues === 0 && found640Query && foundTableScroll && foundWordBreak) {
    console.log('\n🎉 ALL PAGES PASSED MOBILE & RESPONSIVE HARDENING AUDIT!');
  }

  return { totalPages: htmlFiles.length, passed, issues };
}

// Direct execution
runResponsiveAudit();

