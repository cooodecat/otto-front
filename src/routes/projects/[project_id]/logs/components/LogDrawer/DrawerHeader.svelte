<script lang="ts">
  import type { ExecutionMetadata } from '$lib/types/log.types';
  import {
    Calendar,
    GitBranch,
    User,
    Clock,
    Hammer,
    Rocket,
    Wifi,
    WifiOff,
    Edit3,
    RefreshCw,
    Loader2
  } from 'lucide-svelte';

  interface Props {
    execution: ExecutionMetadata;
    isConnected?: boolean;
    onRerun?: () => void;
    onEdit?: () => void;
  }

  let { execution, isConnected = false, onRerun, onEdit }: Props = $props();
  let isRerunning = $state(false);

  async function handleRerun() {
    if (isRerunning || !onRerun) return;
    isRerunning = true;
    try {
      await onRerun();
    } finally {
      isRerunning = false;
    }
  }

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

  function formatRelative(dateStr: string): string {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function calculateDuration(): string {
    // Debug logging
    console.log('Calculating duration:', {
      duration: execution.duration,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      status: execution.status
    });
    
    // execution.duration이 있으면 사용 (백엔드에서 제공하는 값, 초 단위)
    if (execution.duration !== undefined && execution.duration !== null && execution.duration > 0) {
      return formatDuration(execution.duration);
    }
    
    // completedAt이 있으면 직접 계산
    if (execution.completedAt && execution.startedAt) {
      const start = new Date(execution.startedAt).getTime();
      const end = new Date(execution.completedAt).getTime();
      const seconds = Math.floor((end - start) / 1000);
      return formatDuration(seconds);
    }
    
    // 실행 중이면 현재까지 경과 시간 표시
    if ((getNormalizedStatus(execution.status) === 'RUNNING' || getNormalizedStatus(execution.status) === 'PENDING') && execution.startedAt) {
      const start = new Date(execution.startedAt).getTime();
      const now = Date.now();
      const seconds = Math.floor((now - start) / 1000);
      return `${formatDuration(seconds)} (running)`;
    }
    
    // startedAt만 있는 경우에도 시도
    if (execution.startedAt) {
      return 'In progress';
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

  const statusColors: Record<string, string> = {
    SUCCESS: 'bg-green-100 text-green-800',
    SUCCEEDED: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    RUNNING: 'bg-blue-100 text-blue-800',
    PENDING: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-gray-100 text-gray-800'
  };

  // Helper to get normalized status
  function getNormalizedStatus(status: string): string {
    return status?.toUpperCase() || 'PENDING';
  }
</script>

<div class="relative border-b border-gray-200">
  <!-- Action Buttons at Top Right (next to close button) -->
  <div class="absolute top-6 right-20 z-10 flex gap-2">
    {#if execution.pipelineId && onEdit}
      <button
        onclick={onEdit}
        class="flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <Edit3 class="h-3.5 w-3.5" />
        Edit Pipeline
      </button>
    {/if}
    {#if onRerun}
      <button
        onclick={handleRerun}
        disabled={isRerunning || execution.status === 'RUNNING' || execution.status === 'PENDING'}
        class="flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        title={execution.status === 'RUNNING' || execution.status === 'PENDING'
          ? 'Pipeline is currently running'
          : 'Re-run this pipeline'}
      >
        {#if isRerunning}
          <Loader2 class="h-3.5 w-3.5 animate-spin" />
          Re-running...
        {:else}
          <RefreshCw class="h-3.5 w-3.5" />
          Re-run
        {/if}
      </button>
    {/if}
  </div>

  <div class="px-6 py-4">
    <div class="flex items-start gap-4">
      <!-- Execution Type Icon -->
      <div class="mt-1 flex-shrink-0">
        {#if execution.executionType === 'BUILD'}
          <Hammer class="h-6 w-6 text-orange-500" />
        {:else if execution.executionType === 'DEPLOY'}
          <Rocket class="h-6 w-6 text-blue-500" />
        {/if}
      </div>

      <div class="flex-1 pr-48">
        <!-- Title and Status -->
        <div class="mb-2 flex items-center gap-3">
        <h2 class="text-xl font-semibold text-gray-900">
          {execution.executionType} #{execution.buildNumber}
        </h2>
        <span
          class="rounded-full px-2.5 py-1 text-xs font-semibold {statusColors[
            getNormalizedStatus(execution.status)
          ] || 'bg-gray-100 text-gray-800'}"
        >
          {getNormalizedStatus(execution.status)}
        </span>
        {#if getNormalizedStatus(execution.status) === 'RUNNING' || getNormalizedStatus(execution.status) === 'PENDING'}
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
          <span title={formatDateTime(execution.startedAt)}>
            {formatDateTime(execution.startedAt)}
            <span class="ml-1 text-gray-400">({formatRelative(execution.startedAt)})</span>
          </span>
          {#if execution.completedAt}
            <span class="text-gray-400">→</span>
            <span title={formatDateTime(execution.completedAt)}>
              {formatDateTime(execution.completedAt)}
              <span class="ml-1 text-gray-400">({formatRelative(execution.completedAt)})</span>
            </span>
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
          <span class="truncate">
            {execution.branch || 'N/A'}
            {#if execution.commitId}
              <span class="mx-1 text-gray-400">•</span>
              <span class="font-mono">{execution.commitId.slice(0, 7)}</span>
            {/if}
          </span>
        </div>

        <!-- Author -->
        {#if execution.author && execution.author !== 'Unknown'}
          <div class="flex items-center gap-2 text-gray-600">
            <User class="h-4 w-4 text-gray-400" />
            <span>{execution.author}</span>
          </div>
        {/if}
      </div>

      <!-- Pipeline Info Row -->
      {#if execution.pipelineName && !execution.pipelineName.includes('Unknown')}
        <div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>Pipeline: <span class="font-medium">{execution.pipelineName}</span></span>
        </div>
      {/if}
    </div>
  </div>
  </div>
</div>
