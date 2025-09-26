<script lang="ts">
  import type { ExecutionMetadata, PhaseInfo } from '$lib/types/log.types';
  import { onDestroy } from 'svelte';
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
    Loader2,
    X,
    Workflow,
    Keyboard
  } from 'lucide-svelte';
  import {
    calculateExecutionDuration,
    formatDateTime,
    formatRelativeTime
  } from '$lib/utils/duration';

  interface Props {
    execution: ExecutionMetadata;
    phases?: PhaseInfo[];
    isConnected?: boolean;
    isNavigating?: boolean;
    isTimeoutSuspected?: boolean;
    timeoutMessage?: string | null;
    onRerun?: () => void;
    onEdit?: () => void;
    onClose?: () => void;
    onNavigate?: (direction: 'prev' | 'next') => void;
  }

  let {
    execution,
    phases = [],
    isConnected = false,
    isNavigating: _isNavigating = false,
    isTimeoutSuspected = false,
    timeoutMessage = null,
    onRerun,
    onEdit,
    onClose,
    onNavigate: _onNavigate
  }: Props = $props();
  let isRerunning = $state(false);
  let currentTime = $state(Date.now());
  let intervalId: ReturnType<typeof setInterval> | null = null;

  // Update current time every second for running executions
  $effect(() => {
    const normalizedStatus = getNormalizedStatus(execution.status);
    if (normalizedStatus === 'RUNNING' || normalizedStatus === 'PENDING') {
      // Start interval to update time every second
      intervalId = setInterval(() => {
        currentTime = Date.now();
      }, 1000);
    } else {
      // Clear interval if not running
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  });

  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  // Use unified duration calculation
  const duration = $derived(calculateExecutionDuration(execution, phases, currentTime));

  async function handleRerun() {
    if (isRerunning || !onRerun) return;
    isRerunning = true;
    try {
      await onRerun();
    } finally {
      isRerunning = false;
    }
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

<div class="border-b border-gray-200">
  <div class="px-6 py-4">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex min-w-0 flex-1 flex-wrap items-start gap-4">
        <!-- Execution Type Icon -->
        <div class="mt-1 flex-shrink-0">
          {#if execution.executionType === 'BUILD'}
            <Hammer class="h-6 w-6 text-orange-500" />
          {:else if execution.executionType === 'DEPLOY'}
            <Rocket class="h-6 w-6 text-blue-500" />
          {/if}
        </div>

        <div class="min-w-0 flex-1">
          <!-- Title and Status -->
          <div class="mb-2">
            <div class="flex items-center gap-3">
              <h2 class="text-xl font-semibold text-gray-900">
                Log {execution.buildNumber}
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

            {#if isTimeoutSuspected && timeoutMessage}
              <div
                class="mt-2 flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-2"
              >
                <svg
                  class="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div class="flex-1">
                  <p class="text-xs font-medium text-yellow-800">Timeout Warning</p>
                  <p class="text-xs text-yellow-700">{timeoutMessage}</p>
                </div>
              </div>
            {/if}

            {#if execution.pipelineName && execution.pipelineName !== 'Unknown Pipeline' && execution.pipelineName !== ''}
              <div class="mt-1 flex items-center gap-1.5">
                <Workflow class="h-3.5 w-3.5 text-indigo-500" />
                {#if execution.pipelineId && onEdit}
                  <button
                    onclick={onEdit}
                    class="cursor-pointer text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800 hover:underline"
                    title="View pipeline configuration"
                  >
                    {execution.pipelineName}
                  </button>
                {:else}
                  <span class="text-sm font-medium text-gray-600">
                    {execution.pipelineName}
                  </span>
                {/if}
              </div>
            {:else if execution.pipelineId && onEdit}
              <div class="mt-1 flex items-center gap-1.5">
                <Workflow class="h-3.5 w-3.5 text-gray-400" />
                <button
                  onclick={onEdit}
                  class="cursor-pointer text-sm font-medium text-gray-500 transition-colors hover:text-indigo-600 hover:underline"
                  title="View pipeline configuration"
                >
                  View Pipeline Configuration
                </button>
              </div>
            {:else if execution.pipelineId}
              <div class="mt-1 flex items-center gap-1.5">
                <Workflow class="h-3.5 w-3.5 text-gray-400" />
                <span class="text-sm font-medium text-gray-500">
                  Pipeline ID: {execution.pipelineId}
                </span>
              </div>
            {/if}
          </div>

          <!-- Metadata Grid -->
          <div class="grid grid-cols-1 gap-y-2 text-sm">
            <!-- Execution Start Time -->
            <div class="flex items-center gap-2 text-gray-600">
              <Calendar class="h-4 w-4 text-gray-400" />
              <span class="font-medium">Started:</span>
              <span title={new Date(execution.startedAt).toLocaleString()}>
                {formatDateTime(execution.startedAt)}
                <span class="ml-1 text-gray-400">({formatRelativeTime(execution.startedAt)})</span>
              </span>
            </div>

            <!-- Duration and Log Count -->
            <div class="flex items-center gap-6">
              <!-- Duration -->
              <div class="flex items-center gap-2 text-gray-600">
                <Clock class="h-4 w-4 text-gray-400" />
                <span class="font-medium">Duration:</span>
                <span>{duration.formatted}</span>
              </div>

              <!-- Log Count (replacing Lines) -->
              {#if execution.logStats?.totalLines}
                <div class="flex items-center gap-2 text-gray-600">
                  <svg
                    class="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span class="font-medium">Logs:</span>
                  <span>{execution.logStats.totalLines.toLocaleString()} entries</span>
                </div>
              {/if}
            </div>

            <!-- Git Info -->
            <div class="flex items-center gap-2 text-gray-600">
              <GitBranch class="h-4 w-4 text-gray-400" />
              <span class="font-medium">Branch:</span>
              <span class="truncate">
                {execution.branch || 'N/A'}
                {#if execution.commitId}
                  <span class="mx-1 text-gray-400">•</span>
                  <span class="font-mono text-xs">{execution.commitId.slice(0, 7)}</span>
                {/if}
              </span>
            </div>

            <!-- Author -->
            {#if execution.author && execution.author !== 'Unknown' && execution.author !== ''}
              <div class="flex items-center gap-2 text-gray-600">
                <User class="h-4 w-4 text-gray-400" />
                <span class="font-medium">Author:</span>
                <span>{execution.author}</span>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2">
        <!-- Keyboard shortcuts hint -->
        <div class="flex items-center gap-2 text-xs text-gray-500">
          <Keyboard class="h-3.5 w-3.5" />
          <span class="hidden lg:inline">
            <kbd class="rounded bg-gray-100 px-1 py-0.5 text-[10px]">Shift+↑↓</kbd>
            Logs •
            <kbd class="rounded bg-gray-100 px-1 py-0.5 text-[10px]">ESC</kbd>
            Close
          </span>
        </div>

        <!-- Action buttons group -->
        <div class="flex items-center gap-3">
          {#if onRerun}
            <button
              onclick={handleRerun}
              disabled={isRerunning ||
                execution.status === 'RUNNING' ||
                execution.status === 'PENDING'}
              class="flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
          {#if execution.pipelineId && onEdit}
            <button
              onclick={onEdit}
              class="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Edit3 class="h-3.5 w-3.5" />
              Edit Pipeline
            </button>
          {/if}
        </div>

        <!-- Close button with extra spacing -->
        {#if onClose}
          <button
            onclick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
            onpointerdown={(e) => e.stopPropagation()}
            class="relative z-50 ml-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-all hover:rotate-90 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close drawer"
            type="button"
          >
            <X class="pointer-events-none h-4 w-4" />
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>
