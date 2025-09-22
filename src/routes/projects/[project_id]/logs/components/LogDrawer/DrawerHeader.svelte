<script lang="ts">
  import type { ExecutionMetadata } from '$lib/types/log.types';
  import { Calendar, GitBranch, User, Clock, Hammer, Rocket, Wifi, WifiOff } from 'lucide-svelte';

  interface Props {
    execution: ExecutionMetadata;
    isConnected?: boolean;
  }

  let { execution, isConnected = false }: Props = $props();

  function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function calculateDuration(): string {
    if (execution.completedAt) {
      const start = new Date(execution.startedAt).getTime();
      const end = new Date(execution.completedAt).getTime();
      const seconds = Math.floor((end - start) / 1000);
      return formatDuration(seconds);
    } else if (execution.status === 'RUNNING') {
      const start = new Date(execution.startedAt).getTime();
      const now = Date.now();
      const seconds = Math.floor((now - start) / 1000);
      return `${formatDuration(seconds)} (running)`;
    }
    return 'N/A';
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes < 60) {
      return secs > 0 ? `${minutes}m ${secs}s` : `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  const statusColors = {
    SUCCESS: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    RUNNING: 'bg-blue-100 text-blue-800',
    PENDING: 'bg-gray-100 text-gray-800'
  };
</script>

<div class="border-b border-gray-200 px-6 py-4 pr-16">
  <div class="flex items-start gap-4">
    <!-- Execution Type Icon -->
    <div class="mt-1 flex-shrink-0">
      {#if execution.executionType === 'BUILD'}
        <Hammer class="h-6 w-6 text-orange-500" />
      {:else if execution.executionType === 'DEPLOY'}
        <Rocket class="h-6 w-6 text-blue-500" />
      {/if}
    </div>

    <div class="flex-1">
      <!-- Title and Status -->
      <div class="mb-2 flex items-center gap-3">
        <h2 class="text-xl font-semibold text-gray-900">
          {execution.executionType} #{execution.buildNumber}
        </h2>
        <span
          class="rounded-full px-2.5 py-1 text-xs font-semibold {statusColors[execution.status]}"
        >
          {execution.status}
        </span>
        {#if execution.status === 'RUNNING'}
          <div
            class="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs {isConnected
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'}"
          >
            {#if isConnected}
              <Wifi class="h-3 w-3" />
              <span>Live</span>
            {:else}
              <WifiOff class="h-3 w-3" />
              <span>Disconnected</span>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Metadata Grid -->
      <div class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <!-- Time Info -->
        <div class="flex items-center gap-2 text-gray-600">
          <Calendar class="h-4 w-4 text-gray-400" />
          <span>{formatDateTime(execution.startedAt)}</span>
          {#if execution.completedAt}
            <span class="text-gray-400">→</span>
            <span>{formatDateTime(execution.completedAt)}</span>
          {/if}
        </div>

        <!-- Duration -->
        <div class="flex items-center gap-2 text-gray-600">
          <Clock class="h-4 w-4 text-gray-400" />
          <span>{calculateDuration()}</span>
        </div>

        <!-- Git Info -->
        <div class="flex items-center gap-2 text-gray-600">
          <GitBranch class="h-4 w-4 text-gray-400" />
          <span>{execution.branch} • {execution.commitId}</span>
        </div>

        <!-- Author -->
        <div class="flex items-center gap-2 text-gray-600">
          <User class="h-4 w-4 text-gray-400" />
          <span>{execution.author}</span>
        </div>
      </div>

      <!-- Commit Message -->
      <div class="mt-3 rounded bg-gray-50 p-2 text-sm text-gray-700">
        "{execution.commitMessage}"
      </div>

      <!-- Trigger Info -->
      <div class="mt-2 text-xs text-gray-500">
        Triggered by: <span class="font-medium">{execution.triggeredBy}</span> • Pipeline:
        <span class="font-medium">{execution.pipelineName}</span>
      </div>
    </div>
  </div>
</div>
