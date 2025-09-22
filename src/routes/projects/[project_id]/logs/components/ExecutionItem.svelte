<script lang="ts">
  import type { ExecutionMetadata } from '$lib/types/log.types';
  import { Hammer, Rocket, GitBranch, User, Clock, FileText } from 'lucide-svelte';

  interface Props {
    execution: ExecutionMetadata;
    isSelected: boolean;
    isFocused?: boolean;
    onSelect: (executionId: string) => void;
  }

  let { execution, isSelected, isFocused = false, onSelect }: Props = $props();

  function handleClick() {
    onSelect(execution.executionId);
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes < 60) {
      return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  const statusColors = {
    SUCCESS: 'bg-green-100 text-green-800 border-green-200',
    FAILED: 'bg-red-100 text-red-800 border-red-200',
    RUNNING: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
    PENDING: 'bg-gray-100 text-gray-800 border-gray-200'
  };
</script>

<button
  onclick={handleClick}
  class="w-full rounded-lg border bg-white p-4 text-left transition-all hover:shadow-md {isSelected
    ? 'border-blue-500 shadow-md'
    : 'border-gray-200'} {isFocused ? 'ring-2 ring-blue-300' : ''}"
>
  <div class="flex items-start justify-between gap-4">
    <div class="flex-1">
      <!-- Header -->
      <div class="mb-2 flex items-center gap-3">
        {#if execution.executionType === 'BUILD'}
          <Hammer class="h-5 w-5 text-orange-500" />
        {:else if execution.executionType === 'DEPLOY'}
          <Rocket class="h-5 w-5 text-blue-500" />
        {:else}
          <FileText class="h-5 w-5 text-purple-500" />
        {/if}

        <span class="font-semibold text-gray-900">
          #{execution.buildNumber}
          {execution.executionType}
        </span>

        <span class="text-sm text-gray-500">• {formatTime(execution.startedAt)}</span>

        <span class="rounded-full px-2 py-1 text-xs font-medium {statusColors[execution.status]}">
          {execution.status}
        </span>
      </div>

      <!-- Commit Info -->
      <div class="mb-1 text-sm text-gray-600">
        "{execution.commitMessage}"
      </div>

      <!-- Meta Info -->
      <div class="flex items-center gap-4 text-xs text-gray-500">
        <div class="flex items-center gap-1">
          <GitBranch class="h-3 w-3" />
          {execution.branch}
        </div>
        <div class="flex items-center gap-1">
          <User class="h-3 w-3" />
          {execution.author}
        </div>
        {#if execution.status !== 'RUNNING' && execution.status !== 'PENDING'}
          <div class="flex items-center gap-1">
            <Clock class="h-3 w-3" />
            {formatDuration(execution.duration)}
          </div>
        {/if}
      </div>

      <!-- Pipeline Info -->
      <div class="mt-2 text-xs text-gray-500">
        <span class="inline-flex items-center gap-1">
          <FileText class="h-3 w-3" />
          Pipeline: {execution.pipelineName}
        </span>
      </div>
    </div>

    <!-- Log Stats -->
    {#if execution.logStats}
      <div class="text-right text-xs text-gray-500">
        <div>{execution.logStats.totalLines || 0} lines</div>
        {#if execution.logStats.errorCount > 0}
          <div class="text-red-600">{execution.logStats.errorCount} errors</div>
        {/if}
        {#if execution.logStats.warningCount > 0}
          <div class="text-yellow-600">{execution.logStats.warningCount} warnings</div>
        {/if}
      </div>
    {/if}
  </div>
</button>
