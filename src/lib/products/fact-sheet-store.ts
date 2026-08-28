/**
 * Product Fact Sheet Persistence Store
 *
 * Provides deterministic file-based persistence for ProductFactSheet records
 * in src/data/fact-sheets/<asin>.json.
 */

import fs from 'fs';
import path from 'path';
import type { ProductFactSheet } from './fact-sheet-types.js';

export function getFactSheetDir(customRootDir?: string): string {
  const root = customRootDir || process.cwd();
  return path.join(root, 'src', 'data', 'fact-sheets');
}

export function getFactSheetPath(asin: string, customRootDir?: string): string {
  const dir = getFactSheetDir(customRootDir);
  const cleanAsin = asin.toUpperCase().trim();
  return path.join(dir, `${cleanAsin}.json`);
}

export function loadFactSheetByAsin(asin: string, customRootDir?: string): ProductFactSheet | null {
  try {
    const filePath = getFactSheetPath(asin, customRootDir);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as ProductFactSheet;
  } catch {
    return null;
  }
}

export function saveFactSheet(factSheet: ProductFactSheet, customRootDir?: string): string {
  const dir = getFactSheetDir(customRootDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = getFactSheetPath(factSheet.asin, customRootDir);
  fs.writeFileSync(filePath, JSON.stringify(factSheet, null, 2), 'utf-8');
  return filePath;
}

export function listAllFactSheets(customRootDir?: string): ProductFactSheet[] {
  const dir = getFactSheetDir(customRootDir);
  if (!fs.existsSync(dir)) {
    return [];
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const sheets: ProductFactSheet[] = [];
  for (const f of files) {
    try {
      const content = fs.readFileSync(path.join(dir, f), 'utf-8');
      sheets.push(JSON.parse(content));
    } catch {}
  }
  return sheets;
}
