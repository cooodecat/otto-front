<script lang="ts">
  import type { ExecutionMetadata } from '$lib/types/log.types';
  import {
    Hammer,
    Rocket,
    GitBranch,
    User,
    Clock,
    FileText,
    Copy,
    ExternalLink
  } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  interface Props {
    execution: ExecutionMetadata;
    isSelected: boolean;
    isFocused?: boolean;
    onSelect: (executionId: string) => void;
  }

  let { execution, isSelected, isFocused = false, onSelect }: Props = $props();

  const projectId = $derived($page.params.project_id);

  function handleClick() {
    onSelect(execution.executionId);
  }

  function handleViewPipeline(e: Event) {
    e.stopPropagation(); // Prevent execution selection
    if (execution.pipelineId && projectId) {
      goto(`/projects/${projectId}/pipelines/${execution.pipelineId}`);
    }
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

  function elapsedSince(dateStr: string): string {
    const start = new Date(dateStr).getTime();
    const secs = Math.max(0, Math.floor((Date.now() - start) / 1000));
    return formatDuration(secs);
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
  class="w-full cursor-pointer rounded-xl border bg-white p-5 text-left transition-all duration-200 hover:translate-y-[-2px] hover:border-blue-200 hover:shadow-lg {isSelected
    ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg'
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
          #{execution.buildNumber}
          {execution.executionType}
        </span>

        <span class="text-sm text-gray-500" title={new Date(execution.startedAt).toLocaleString()}
          >• {formatTime(execution.startedAt)}</span
        >

        <span
          class="rounded-full px-2 py-1 text-xs font-medium {statusColors[
            getNormalizedStatus(execution.status)
          ] || 'border-gray-200 bg-gray-100 text-gray-800'}"
        >
          {getNormalizedStatus(execution.status)}
        </span>
      </div>

      <!-- Commit Info -->
      {#if (execution.commitMessage && execution.commitMessage.trim() !== '') || execution.commitId}
        <div class="mb-1 flex items-center gap-2 text-sm text-gray-600">
          {#if execution.commitMessage && execution.commitMessage.trim() !== ''}
            <span class="truncate" title={execution.commitMessage || ''}
              >"{execution.commitMessage}"</span
            >
          {/if}
          {#if execution.commitId}
            <span
              class="inline-flex items-center gap-1 rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600"
            >
              <span class="font-mono">{execution.commitId.slice(0, 7)}</span>
              <span
                role="button"
                tabindex="0"
                class="inline-flex opacity-70 hover:opacity-100"
                title="Copy full SHA"
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
          {/if}
        </div>
      {/if}

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
        {#if getNormalizedStatus(execution.status) !== 'RUNNING' && getNormalizedStatus(execution.status) !== 'PENDING'}
          <div class="flex items-center gap-1">
            <Clock class="h-3 w-3" />
            {formatDuration(execution.duration)}
          </div>
        {:else}
          <div class="flex items-center gap-1">
            <Clock class="h-3 w-3" />
            {elapsedSince(execution.startedAt)}
          </div>
        {/if}
      </div>

      <!-- Pipeline Info -->
      <div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span class="inline-flex items-center gap-1">
          <FileText class="h-3 w-3" />
          Pipeline: {execution.pipelineName}
          {#if execution.pipelineId}
            <span
              role="button"
              tabindex="0"
              onclick={(e) => {
                e.stopPropagation();
                handleViewPipeline(e);
              }}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleViewPipeline(e);
                }
              }}
              class="ml-1 inline-flex cursor-pointer items-center gap-0.5 rounded px-1 py-0.5 hover:bg-gray-100"
              title="View Pipeline"
              aria-label="View Pipeline"
            >
              <ExternalLink class="h-3 w-3 text-blue-500" />
            </span>
          {/if}
        </span>
        <span class="inline-flex items-center gap-1">
          ID:
          <span class="font-mono text-gray-700">{execution.executionId}</span>
          <span
            role="button"
            tabindex="0"
            class="inline-flex opacity-60 hover:opacity-100"
            title="Copy execution ID"
            onclick={(e) => {
              e.stopPropagation();
              copy(execution.executionId);
            }}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                copy(execution.executionId);
              }
            }}
            aria-label="Copy execution ID"
          >
            <Copy class="h-3 w-3" />
          </span>
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
