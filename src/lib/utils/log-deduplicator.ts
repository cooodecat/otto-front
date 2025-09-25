import type { LogEntry } from '$lib/types/log.types';

interface _LogIdentifier {
  timestamp: string;
  message: string;
  phase?: string;
  level?: string;
}

export class LogDeduplicator {
  private seenLogs: Set<string>;
  private recentLogs: Map<string, LogEntry>;
  private maxCacheSize: number;

  constructor(maxCacheSize: number = 10000) {
    this.seenLogs = new Set();
    this.recentLogs = new Map();
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Generate a unique key for a log entry
   * Uses multiple fields to ensure uniqueness
   */
  private generateKey(log: LogEntry): string {
    // Include more fields in the key to better identify unique logs
    const parts = [
      log.timestamp,
      log.message || '',
      log.phase || '',
      log.level || '',
      log.step || ''
    ];

    return parts.join('|');
  }

  /**
   * Generate a fuzzy key for similar log detection
   * This helps identify logs that are essentially the same but with minor differences
   */
  private generateFuzzyKey(log: LogEntry): string {
    // Round timestamp to nearest second to catch rapid duplicate emissions
    const timestamp = new Date(log.timestamp);
    const roundedTime = new Date(Math.floor(timestamp.getTime() / 1000) * 1000).toISOString();

    // Normalize message by removing variable parts
    const normalizedMessage = (log.message || '')
      // Remove timestamps from message
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g, '')
      .replace(/\d{1,2}:\d{2}:\d{2}(\.\d+)?/g, '')
      // Remove numbers that might be counters or IDs
      .replace(/\b\d+\b/g, 'N')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();

    return `${roundedTime}|${normalizedMessage}|${log.phase || ''}|${log.level || ''}`;
  }

  /**
   * Check if a log has been seen before
   */
  hasSeenLog(log: LogEntry): boolean {
    const key = this.generateKey(log);
    return this.seenLogs.has(key);
  }

  /**
   * Check if a similar log was recently seen (within 1 second)
   */
  hasSimilarRecentLog(log: LogEntry): boolean {
    const fuzzyKey = this.generateFuzzyKey(log);
    const recentLog = this.recentLogs.get(fuzzyKey);

    if (!recentLog) return false;

    // Check if the similar log was within 1 second
    const timeDiff = Math.abs(
      new Date(log.timestamp).getTime() - new Date(recentLog.timestamp).getTime()
    );

    return timeDiff < 1000; // Within 1 second
  }

  /**
   * Add a log to the seen set
   */
  addLog(log: LogEntry): void {
    const key = this.generateKey(log);
    const fuzzyKey = this.generateFuzzyKey(log);

    this.seenLogs.add(key);
    this.recentLogs.set(fuzzyKey, log);

    // Prevent memory leak by limiting cache size
    if (this.seenLogs.size > this.maxCacheSize) {
      // Remove oldest entries (simple FIFO)
      const keysToRemove = Array.from(this.seenLogs).slice(0, 100);
      keysToRemove.forEach((k) => this.seenLogs.delete(k));
    }

    if (this.recentLogs.size > 1000) {
      // Keep only recent fuzzy matches
      const keysToRemove = Array.from(this.recentLogs.keys()).slice(0, 100);
      keysToRemove.forEach((k) => this.recentLogs.delete(k));
    }
  }

  /**
   * Deduplicate an array of logs
   */
  deduplicate(logs: LogEntry[]): LogEntry[] {
    const deduped: LogEntry[] = [];

    for (const log of logs) {
      // Skip if we've seen this exact log
      if (this.hasSeenLog(log)) {
        continue;
      }

      // Skip if a very similar log was just seen (likely a duplicate from AWS)
      if (this.hasSimilarRecentLog(log)) {
        console.debug('Skipping similar log:', log.message?.substring(0, 50));
        continue;
      }

      this.addLog(log);
      deduped.push(log);
    }

    return deduped;
  }

  /**
   * Deduplicate and merge log arrays
   */
  mergeAndDeduplicate(existingLogs: LogEntry[], newLogs: LogEntry[]): LogEntry[] {
    // First, add all existing logs to the seen set
    existingLogs.forEach((log) => this.addLog(log));

    // Then deduplicate new logs
    const dedupedNewLogs = this.deduplicate(newLogs);

    // Merge and sort
    const merged = [...existingLogs, ...dedupedNewLogs];

    // Sort by timestamp
    return merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Clear the deduplication cache
   */
  clear(): void {
    this.seenLogs.clear();
    this.recentLogs.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { seenCount: number; recentCount: number } {
    return {
      seenCount: this.seenLogs.size,
      recentCount: this.recentLogs.size
    };
  }
}
