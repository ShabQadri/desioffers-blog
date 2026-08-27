/**
 * Media Manifest & Registry
 *
 * Provides a structured, deterministic catalog for all editorial media assets.
 * Allows querying assets by article slug, role, category, or rights status.
 */

import type { MediaRecord, MediaRole, ImageRightsStatus } from './types.js';

export class MediaManifest {
  private records: Map<string, MediaRecord> = new Map();

  constructor(initialRecords: MediaRecord[] = []) {
    for (const record of initialRecords) {
      this.addRecord(record);
    }
  }

  public addRecord(record: MediaRecord): void {
    this.records.set(record.r2Key, record);
  }

  public getRecordByKey(r2Key: string): MediaRecord | undefined {
    return this.records.get(r2Key);
  }

  public getRecordsByArticle(articleSlug: string): MediaRecord[] {
    return Array.from(this.records.values()).filter((r) => r.contextSlug === articleSlug);
  }

  public getRecordsByCategory(categorySlug: string): MediaRecord[] {
    return Array.from(this.records.values()).filter((r) => r.contextSlug === categorySlug && r.role === 'category');
  }

  public getRecordsByRole(role: MediaRole): MediaRecord[] {
    return Array.from(this.records.values()).filter((r) => r.role === role);
  }

  public getRecordsByRightsStatus(status: ImageRightsStatus): MediaRecord[] {
    return Array.from(this.records.values()).filter((r) => r.rightsStatus === status);
  }

  public getAllRecords(): MediaRecord[] {
    return Array.from(this.records.values());
  }

  public toJSON(): MediaRecord[] {
    return this.getAllRecords();
  }
}
