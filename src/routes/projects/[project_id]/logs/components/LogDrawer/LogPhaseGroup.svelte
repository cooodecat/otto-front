<script lang="ts">
  import type { LogEntry } from '$lib/types/log.types';
  import {
    ChevronDown,
    ChevronRight,
    CheckCircle,
    XCircle,
    Loader2,
    AlertCircle,
    FileText,
    Activity,
    Layers,
    Terminal
  } from 'lucide-svelte';
  import type { LogPhaseGroup } from '$lib/utils/log-grouping';
  import LogSegment from './LogSegment.svelte';
  import { LogParser } from '$lib/utils/log-parser';

  interface Props {
    group: LogPhaseGroup;
    index: number;
    totalGroups: number;
    searchQuery?: string;
    forceExpanded?: boolean;
    onLogClick?: (log: LogEntry, index: number) => void;
  }

  let {
    group,
    index,
    totalGroups,
    searchQuery = '',
    forceExpanded = false,
    onLogClick
  }: Props = $props();

  let isExpanded = $state(group.status === 'running' || group.status === 'failed' || forceExpanded);
  let viewMode = $state<'grouped' | 'terminal'>('grouped');

  // Status configuration
  const statusConfig = $derived.by(() => {
    switch (group.status) {
      case 'success':
        return {
          icon: CheckCircle,
          iconClass: 'text-green-500',
          bgClass: 'bg-gradient-to-r from-green-50 to-white',
          borderClass: 'border-l-4 border-green-500'
        };
      case 'failed':
        return {
          icon: XCircle,
          iconClass: 'text-red-500',
          bgClass: 'bg-gradient-to-r from-red-50 to-white',
          borderClass: 'border-l-4 border-red-500'
        };
      case 'running':
        return {
          icon: Loader2,
          iconClass: 'text-blue-500 animate-spin',
          bgClass: 'bg-gradient-to-r from-blue-50 to-white',
          borderClass: 'border-l-4 border-blue-500'
        };
      default:
        return {
          icon: FileText,
          iconClass: 'text-gray-400',
          bgClass: 'bg-gradient-to-r from-gray-50 to-white',
          borderClass: 'border-l-4 border-gray-300'
        };
    }
  });

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }

  function parseMessage(message: string) {
    return LogParser.parseMessage(message, searchQuery);
  }

  $effect(() => {
    if (forceExpanded) {
      isExpanded = true;
    }
  });
</script>

<div
  id="phase-group-{index}"
  class="mb-4 rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
>
  <!-- Header -->
  <button
    onclick={toggleExpanded}
    class="flex w-full cursor-pointer items-center justify-between px-4 py-3 transition-colors {statusConfig.bgClass} {statusConfig.borderClass}"
  >
    <div class="flex items-center gap-3">
      {#if isExpanded}
        <ChevronDown class="h-4 w-4 text-gray-500" />
      {:else}
        <ChevronRight class="h-4 w-4 text-gray-500" />
      {/if}

      {#if statusConfig.icon}
        <svelte:component this={statusConfig.icon} class="h-5 w-5 {statusConfig.iconClass}" />
      {/if}

      <span class="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium">
        {index + 1}/{totalGroups}
      </span>

      <h3 class="text-sm font-semibold text-gray-800">{group.displayName}</h3>

      <!-- Stats badges -->
      <div class="flex items-center gap-2">
        <span class="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
          <FileText class="h-3 w-3" />
          {group.stats.totalCount}
        </span>

        {#if group.stats.errorCount > 0}
          <span
            class="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700"
          >
            <XCircle class="h-3 w-3" />
            {group.stats.errorCount}
          </span>
        {/if}

        {#if group.stats.warningCount > 0}
          <span
            class="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700"
          >
            <AlertCircle class="h-3 w-3" />
            {group.stats.warningCount}
          </span>
        {/if}
      </div>
    </div>

    <div class="flex items-center gap-2">
      {#if group.status === 'running'}
        <Activity class="h-4 w-4 animate-pulse text-blue-500" />
      {/if}
    </div>
  </button>

  <!-- Content -->
  {#if isExpanded}
    <div class="border-t border-gray-200">
      <!-- View mode toggle -->
      <div class="border-b border-gray-100 bg-gray-50 px-4 py-2">
        <div class="flex items-center gap-2">
          <button
            onclick={() => (viewMode = 'grouped')}
            class="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors {viewMode ===
            'grouped'
              ? 'bg-gray-700 text-white'
              : 'text-gray-600 hover:bg-gray-200'}"
          >
            <Layers class="h-3 w-3" />
            Grouped by Step
          </button>
          <button
            onclick={() => (viewMode = 'terminal')}
            class="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors {viewMode ===
            'terminal'
              ? 'bg-gray-700 text-white'
              : 'text-gray-600 hover:bg-gray-200'}"
          >
            <Terminal class="h-3 w-3" />
            Terminal View
          </button>
        </div>
      </div>

      <!-- Logs display -->
      {#if viewMode === 'grouped'}
        <!-- Grouped by steps -->
        {#each group.steps as stepGroup}
          <div class="border-b border-gray-100 last:border-0">
            {#if stepGroup.step !== 'General'}
              <div class="bg-gray-50 px-6 py-1.5">
                <span class="text-xs font-medium text-gray-600">{stepGroup.step}</span>
              </div>
            {/if}

            <div class="bg-gray-900">
              {#each stepGroup.logs as log, logIndex}
                <button
                  onclick={() => onLogClick?.(log, logIndex)}
                  class="group w-full cursor-pointer px-6 py-1 text-left transition-colors hover:bg-gray-800/50 {log.level ===
                  'error'
                    ? 'bg-red-950/20 text-red-400'
                    : log.level === 'warning'
                      ? 'bg-yellow-950/20 text-yellow-400'
                      : 'text-gray-300'}"
                >
                  <div class="flex items-start gap-3 font-mono text-xs">
                    <span class="w-20 shrink-0 text-gray-500 select-none">
                      {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                    </span>
                    <div class="flex-1 whitespace-pre-wrap">
                      {#each parseMessage(log.message || '').segments as segment}
                        <LogSegment {segment} />
                      {/each}
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          </div>
        {/each}
      {:else}
        <!-- Terminal view -->
        <div class="bg-gray-900 p-4 font-mono text-xs">
          {#each group.logs as log, logIndex}
            <div
              onclick={() => onLogClick?.(log, logIndex)}
              class="group cursor-pointer py-0.5 hover:bg-gray-800/50 {log.level === 'error'
                ? 'text-red-400'
                : log.level === 'warning'
                  ? 'text-yellow-400'
                  : 'text-gray-300'}"
            >
              <span class="mr-3 text-gray-500 select-none">
                {String(logIndex + 1).padStart(4, ' ')}
              </span>
              {#each parseMessage(log.message || '').segments as segment}
                <LogSegment {segment} />
              {/each}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
