import type { ExecutionMetadata, PhaseInfo } from '$lib/types/log.types';

/**
 * Format seconds into human-readable duration string
 */
export function formatDuration(seconds: number): string {
  // Handle negative or invalid values
  if (seconds <= 0) return '0s';

  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Calculate duration for an execution
 * For running: calculate elapsed time from startedAt
 * For completed: use duration from backend or calculate from timestamps
 */
export function calculateExecutionDuration(
  execution: ExecutionMetadata,
  phases?: PhaseInfo[],
  currentTime?: number
): { seconds: number; isRunning: boolean; formatted: string } {
  const normalizedStatus = execution.status?.toUpperCase() || 'PENDING';
  const isRunning = normalizedStatus === 'RUNNING' || normalizedStatus === 'PENDING';
  const now = currentTime || Date.now();

  // Get start time
  const startTime = execution.startedAt ? new Date(execution.startedAt).getTime() : null;

  if (!startTime) {
    return { seconds: 0, isRunning, formatted: isRunning ? '0s (starting)' : '0s' };
  }

  let seconds: number;

  if (isRunning) {
    // For running executions, always calculate real-time elapsed
    seconds = Math.max(0, Math.floor((now - startTime) / 1000));
  } else {
    // For completed executions, prefer backend duration
    if (execution.duration !== undefined && execution.duration !== null && execution.duration > 0) {
      seconds = execution.duration;
    } else if (execution.completedAt) {
      // Fallback to calculating from timestamps
      const endTime = new Date(execution.completedAt).getTime();
      seconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
    } else if (execution.updatedAt) {
      // Last resort: use updatedAt
      const endTime = new Date(execution.updatedAt).getTime();
      seconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
    } else {
      seconds = 0;
    }
  }

  const formatted = isRunning ? `${formatDuration(seconds)} (running)` : formatDuration(seconds);

  return { seconds, isRunning, formatted };
}

/**
 * Format a relative time string (e.g., "5m ago", "2h ago")
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Format a date string for display
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}
