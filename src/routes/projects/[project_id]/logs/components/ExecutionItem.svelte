<script lang="ts">
  import type { ExecutionMetadata } from '$lib/types/log.types';
  import { onDestroy } from 'svelte';
  import {
    Hammer,
    Rocket,
    GitBranch,
    User,
    Clock,
    Calendar,
    FileText,
    Copy,
    GitCommit,
    AlertCircle,
    AlertTriangle,
    Workflow
  } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { calculateExecutionDuration, formatDateTime } from '$lib/utils/duration';

  interface Props {
    execution: ExecutionMetadata;
    isSelected: boolean;
    isFocused?: boolean;
    isNew?: boolean;
    onSelect: (executionId: string) => void;
  }

  let { execution, isSelected, isFocused = false, isNew = false, onSelect }: Props = $props();

  const projectId = $derived($page.params.project_id);
  let currentTime = $state(Date.now());
  let intervalId: ReturnType<typeof setInterval> | null = null;

  // Update current time every second for running executions
  $effect(() => {
    const normalizedStatus = getNormalizedStatus(execution.status);
    if (normalizedStatus === 'RUNNING' || normalizedStatus === 'PENDING') {
      intervalId = setInterval(() => {
        currentTime = Date.now();
      }, 1000);
    } else {
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

  function handleClick() {
    onSelect(execution.executionId);
  }

  function _handleViewPipeline(e: Event) {
    e.stopPropagation(); // Prevent execution selection
    if (execution.pipelineId && projectId) {
      goto(`/projects/${projectId}/pipelines/${execution.pipelineId}`);
    }
  }

  // Use unified duration calculation
  const duration = $derived(calculateExecutionDuration(execution, undefined, currentTime));

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

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard access failed, ignore
    }
  }

  const statusColors: Record<string, string> = {
    SUCCESS: 'bg-green-100 text-green-800 border-green-200',
    SUCCEEDED: 'bg-green-100 text-green-800 border-green-200',
    COMPLETED: 'bg-green-100 text-green-800 border-green-200',
    FAILED: 'bg-red-100 text-red-800 border-red-200',
    RUNNING: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
    PENDING: 'bg-gray-100 text-gray-800 border-gray-200',
    CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  // Helper to get normalized status
  function getNormalizedStatus(status: string): string {
    return status?.toUpperCase() || 'PENDING';
  }
</script>

<button
  onclick={handleClick}
  onkeydown={(e) => {
    // Prevent spacebar from triggering click
    if (e.key === ' ') {
      e.preventDefault();
    }
    // Allow Enter key to work normally
    else if (e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  }}
  class="w-full cursor-pointer rounded-xl border bg-white p-5 text-left transition-all duration-200 hover:translate-y-[-2px] hover:border-blue-200 hover:shadow-lg {isSelected
    ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg'
    : isNew
      ? 'animate-highlight-new border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg'
      : 'border-gray-200 shadow-sm'} {isFocused ? 'ring-2 ring-blue-300' : ''}"
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
          Log {execution.buildNumber}
        </span>

        <span
          class="rounded-full px-2 py-1 text-xs font-medium {statusColors[
            getNormalizedStatus(execution.status)
          ] || 'border-gray-200 bg-gray-100 text-gray-800'}"
        >
          {getNormalizedStatus(execution.status)}
        </span>

        {#if isNew}
          <span
            class="animate-pulse rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-2 py-1 text-xs font-medium text-white shadow-sm"
          >
            NEW
          </span>
        {/if}
      </div>

      <!-- Started Time -->
      <div class="mb-2 flex items-center gap-2 text-sm text-gray-600">
        <Calendar class="h-3.5 w-3.5 text-gray-400" />
        <span title={new Date(execution.startedAt).toLocaleString()}>
          {formatDateTime(execution.startedAt)}
          <span class="ml-1 text-gray-400">({formatTime(execution.startedAt)})</span>
        </span>
      </div>

      <!-- Pipeline Info (moved up) -->
      {#if execution.pipelineName && execution.pipelineName !== 'Unknown Pipeline'}
        <div class="mb-2 flex items-center gap-1.5 text-sm">
          <Workflow class="h-4 w-4 text-indigo-500" />
          <span class="font-medium text-gray-700">
            {execution.pipelineName}
          </span>
        </div>
      {/if}

      <!-- Commit Info -->
      {#if (execution.commitMessage && execution.commitMessage.trim() !== '') || execution.commitId}
        <div class="mb-1 flex items-center gap-2 text-sm">
          {#if execution.commitId}
            <div class="flex items-center gap-1">
              <GitCommit class="h-3.5 w-3.5 text-gray-500" />
              <span
                class="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700"
              >
                {execution.commitId.slice(0, 7)}
                <span
                  role="button"
                  tabindex="0"
                  class="inline-flex cursor-pointer opacity-60 transition-opacity hover:opacity-100"
                  title="Copy full commit SHA"
                  onclick={(e) => {
                    e.stopPropagation();
                    copy(execution.commitId);
                  }}
                  onkeydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      copy(execution.commitId);
                    }
                  }}
                  aria-label="Copy full commit SHA"
                >
                  <Copy class="h-3 w-3" />
                </span>
              </span>
            </div>
          {/if}
          {#if execution.commitMessage && execution.commitMessage.trim() !== ''}
            <span class="truncate text-gray-600" title={execution.commitMessage || ''}
              >{execution.commitMessage}</span
            >
          {/if}
        </div>
      {/if}

      <!-- Meta Info (Branch & Author) -->
      <div class="flex items-center gap-4 text-xs text-gray-500">
        <div class="flex items-center gap-1">
          <GitBranch class="h-3 w-3" />
          {execution.branch}
        </div>
        {#if execution.author}
          <div class="flex items-center gap-1">
            <User class="h-3 w-3" />
            {execution.author}
          </div>
        {/if}
      </div>
    </div>

    <!-- Log Stats & Duration -->
    <div class="flex flex-col items-end gap-2 text-xs">
      <!-- Duration -->
      <div class="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
        <Clock class="h-3 w-3 text-gray-500" />
        <span class="font-medium text-gray-700">
          {duration.formatted}
        </span>
      </div>

      <!-- Errors & Warnings -->
      {#if execution.logStats?.errorCount && execution.logStats.errorCount > 0}
        <div class="flex items-center gap-1.5">
          <AlertCircle class="h-3 w-3 text-red-500" />
          <span class="text-red-600"
            >{execution.logStats.errorCount} error{execution.logStats.errorCount > 1
              ? 's'
              : ''}</span
          >
        </div>
      {/if}
      {#if execution.logStats?.warningCount && execution.logStats.warningCount > 0}
        <div class="flex items-center gap-1.5">
          <AlertTriangle class="h-3 w-3 text-yellow-500" />
          <span class="text-yellow-600"
            >{execution.logStats.warningCount} warning{execution.logStats.warningCount > 1
              ? 's'
              : ''}</span
          >
        </div>
      {/if}
    </div>
  </div>
</button>

<style>
  @keyframes highlight-new {
    0% {
      transform: scale(1);
    }
    25% {
      transform: scale(1.02);
    }
    50% {
      transform: scale(1);
    }
    75% {
      transform: scale(1.01);
    }
    100% {
      transform: scale(1);
    }
  }

  :global(.animate-highlight-new) {
    animation: highlight-new 0.6s ease-in-out;
  }
</style>
