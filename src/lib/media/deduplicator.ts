/**
 * Media Deduplicator
 *
 * Deterministic duplicate detection using SHA-256 content hashes.
 *
 * RULES:
 * - Checks if a media asset with the same content hash already exists.
 * - If found, reuses the existing R2 key and public delivery URL.
 * - Non-destructive (never deletes existing objects).
 */

import type { MediaRecord } from './types.js';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingRecord?: MediaRecord;
  existingKey?: string;
  existingUrl?: string;
}

export class MediaDeduplicator {
  private hashRegistry: Map<string, MediaRecord> = new Map();

  constructor(initialRecords: MediaRecord[] = []) {
    for (const record of initialRecords) {
      if (record.contentHash) {
        this.hashRegistry.set(record.contentHash, record);
      }
    }
  }

  /**
   * Registers a newly uploaded media record.
   */
  public register(record: MediaRecord): void {
    if (record.contentHash) {
      this.hashRegistry.set(record.contentHash, record);
    }
  }

  /**
   * Checks whether a content hash already exists in the registry.
   */
  public check(contentHash: string): DuplicateCheckResult {
    const existing = this.hashRegistry.get(contentHash);
    if (existing) {
      return {
        isDuplicate: true,
        existingRecord: existing,
        existingKey: existing.r2Key,
        existingUrl: existing.publicUrl,
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Returns all registered records.
   */
  public getAllRecords(): MediaRecord[] {
    return Array.from(this.hashRegistry.values());
  }
}
