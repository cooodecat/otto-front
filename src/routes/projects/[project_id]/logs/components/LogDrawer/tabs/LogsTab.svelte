<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';
  import type { PhaseInfo, LogEntry } from '$lib/types/log.types';
  import type { LogWebSocketService } from '$lib/services/log-websocket.service';
  import {
    Download,
    Loader2,
    ChevronDown,
    ChevronUp,
    Search,
    Copy,
    Terminal,
    Layers
  } from 'lucide-svelte';
  import LogGroup from '../LogGroup.svelte';

  interface Props {
    executionId: string;
    phases: PhaseInfo[];
    logs?: LogEntry[];
    wsService?: LogWebSocketService;
    isLoading?: boolean;
  }

  let {
    executionId,
    phases: _phases,
    logs = [],
    wsService: _wsService,
    isLoading = false
  }: Props = $props();

  let autoScroll = $state(true);
  let showGrouped = $state(true);
  let allExpanded = $state(false);
  let logContainer = $state<HTMLDivElement>(); // terminal view container
  let scrollArea = $state<HTMLDivElement>(); // shared scrollable content area (grouped/terminal wrapper)
  let scrollTargetIndex = $state<number | null>(null); // target group to expand/scroll
  let searchQuery = $state('');
  let selectedLevel = $state<'all' | 'error' | 'warning' | 'info'>('all');

  // Debug log count
  $effect(() => {
    console.log('LogsTab - logs length:', logs?.length || 0);
  });

  // Filter logs based on search and level
  const filteredLogs = $derived.by(() => {
    let filtered = logs;

    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter((log) => log.level === selectedLevel);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(query) ||
          log.phase?.toLowerCase().includes(query) ||
          log.step?.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  // Group logs by phase
  const logsByPhase = $derived.by(() => {
    const groups = new SvelteMap<string, LogEntry[]>();

    // Initialize with known phases
    const knownPhases = [
      'DOWNLOAD_SOURCE',
      'INSTALL',
      'PRE_BUILD',
      'BUILD',
      'POST_BUILD',
      'UPLOAD_ARTIFACTS',
      'FINALIZING'
    ];

    knownPhases.forEach((phase) => {
      groups.set(phase, []);
    });

    // Group filtered logs
    filteredLogs.forEach((log) => {
      const phase = log.phase || 'OTHER';
      if (!groups.has(phase)) {
        groups.set(phase, []);
      }
      groups.get(phase)!.push(log);
    });

    // Filter out empty phases and sort
    return Array.from(groups.entries())
      .filter(([_, logs]) => logs.length > 0)
      .sort((a, b) => {
        const orderA = a[1][0]?.stepOrder || 999;
        const orderB = b[1][0]?.stepOrder || 999;
        return orderA - orderB;
      });
  });

  // Get phase status based on logs
  function getPhaseStatus(phaseLogs: LogEntry[]): 'pending' | 'running' | 'success' | 'failed' {
    if (phaseLogs.length === 0) return 'pending';

    const hasError = phaseLogs.some((log) => log.level === 'error');
    if (hasError) return 'failed';

    // Check if phase is complete (look for completion markers)
    const lastLog = phaseLogs[phaseLogs.length - 1];
    if (lastLog.message.includes('Phase complete') || lastLog.message.includes('Succeeded')) {
      return 'success';
    }

    // Default to running if we have logs
    return 'running';
  }

  function downloadLogs() {
    const logText = filteredLogs
      .map(
        (log) =>
          `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level.toUpperCase()}] ${log.phase ? `[${log.phase}]` : ''} ${log.message}`
      )
      .join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-${executionId}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyLogs() {
    const logText = filteredLogs
      .map(
        (log) =>
          `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level.toUpperCase()}] ${log.phase ? `[${log.phase}]` : ''} ${log.message}`
      )
      .join('\n');

    await navigator.clipboard.writeText(logText);
    // TODO: Add toast notification
  }

  function toggleAllGroups() {
    allExpanded = !allExpanded;
  }

  // Stats for display
  const logStats = $derived.by(() => {
    const stats = {
      total: logs.length,
      filtered: filteredLogs.length,
      errors: logs.filter((l) => l.level === 'error').length,
      warnings: logs.filter((l) => l.level === 'warning').length
    };
    return stats;
  });

  $effect(() => {
    if (autoScroll && logContainer && !showGrouped) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  });

  const levelColors = {
    info: 'text-gray-300',
    warning: 'text-yellow-400',
    error: 'text-red-400'
  };

  // Highlight search query in terminal view
  function splitBySearchQuery(text: string): { text: string; highlight: boolean }[] {
    if (!searchQuery || !searchQuery.trim()) return [{ text, highlight: false }];

    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => ({
      text: part,
      highlight: index % 2 === 1 // Every odd index is a match
    }));
  }

  // Expose scroll method for parent (LogDrawer) to navigate to a phase by index
  export function scrollToPhaseIndex(index: number) {
    showGrouped = true; // ensure grouped view
    // Clamp index to available groups
    const maxIndex = Math.max(0, logsByPhase.length - 1);
    const targetIndex = Math.min(Math.max(0, index), maxIndex);
    scrollTargetIndex = targetIndex; // request expansion
    // Wait for DOM update after toggling view
    requestAnimationFrame(() => {
      const target = document.getElementById(`phase-${targetIndex}`);
      if (!target || !scrollArea) return;
      // Use two rAF ticks to ensure layout after expansion
      requestAnimationFrame(() => {
        if (!scrollArea) return; // Additional check after async operation
        const areaRect = scrollArea.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const offset = targetRect.top - areaRect.top + scrollArea.scrollTop - 8; // small padding
        scrollArea.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
        // After a short delay (approximate scroll end), trigger highlight animation
        setTimeout(() => {
          target.classList.remove('highlight-phase');
          // retrigger animation by forcing reflow
          void target.offsetWidth;
          target.classList.add('highlight-phase');
          // clean up after animation ends
          setTimeout(() => target.classList.remove('highlight-phase'), 2000);
        }, 500);
      });
    });
  }
</script>

<div class="flex min-h-0 flex-1 flex-col bg-gray-50/50">
  <!-- Fixed Toolbar -->
  <div class="m-4 mb-3 shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm">
    <!-- Search and Filter Bar -->
    <div class="flex items-center gap-3 border-b border-gray-100 px-4 py-2">
      <!-- Search Input -->
      <div class="relative max-w-md flex-1">
        <Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search logs..."
          class="w-full rounded-lg border border-gray-300 py-1.5 pr-4 pl-10 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <!-- Level Filter -->
      <div class="flex items-center gap-2 rounded-lg border border-gray-300 p-1">
        <button
          onclick={() => (selectedLevel = 'all')}
          class="cursor-pointer rounded px-3 py-1 text-xs font-medium transition-colors {selectedLevel ===
          'all'
            ? 'bg-gray-800 text-white'
            : 'text-gray-600 hover:bg-gray-100'}"
        >
          All
        </button>
        <button
          onclick={() => (selectedLevel = 'error')}
          class="cursor-pointer rounded px-3 py-1 text-xs font-medium transition-colors {selectedLevel ===
          'error'
            ? 'bg-red-600 text-white'
            : 'text-gray-600 hover:bg-red-50'}"
        >
          Errors ({logStats.errors})
        </button>
        <button
          onclick={() => (selectedLevel = 'warning')}
          class="cursor-pointer rounded px-3 py-1 text-xs font-medium transition-colors {selectedLevel ===
          'warning'
            ? 'bg-yellow-600 text-white'
            : 'text-gray-600 hover:bg-yellow-50'}"
        >
          Warnings ({logStats.warnings})
        </button>
        <button
          onclick={() => (selectedLevel = 'info')}
          class="cursor-pointer rounded px-3 py-1 text-xs font-medium transition-colors {selectedLevel ===
          'info'
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 hover:bg-blue-50'}"
        >
          Info
        </button>
      </div>

      <!-- Stats -->
      {#if searchQuery || selectedLevel !== 'all'}
        <div class="text-xs text-gray-500">
          Showing {logStats.filtered} of {logStats.total} logs
        </div>
      {/if}
    </div>

    <!-- View Options Bar -->
    <div class="flex items-center justify-between px-4 py-2">
      <div class="flex items-center gap-3">
        <!-- View Toggle -->
        <div class="flex items-center gap-1 rounded-lg border border-gray-300 p-1">
          <button
            onclick={() => (showGrouped = true)}
            class="flex cursor-pointer items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors {showGrouped
              ? 'bg-gray-800 text-white'
              : 'text-gray-600 hover:bg-gray-100'}"
          >
            <Layers class="h-3.5 w-3.5" />
            Grouped
          </button>
          <button
            onclick={() => (showGrouped = false)}
            class="flex cursor-pointer items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors {!showGrouped
              ? 'bg-gray-800 text-white'
              : 'text-gray-600 hover:bg-gray-100'}"
          >
            <Terminal class="h-3.5 w-3.5" />
            Terminal
          </button>
        </div>

        {#if showGrouped}
          <button
            onclick={toggleAllGroups}
            class="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            {#if allExpanded}
              <ChevronUp class="h-3.5 w-3.5" />
              Collapse all
            {:else}
              <ChevronDown class="h-3.5 w-3.5" />
              Expand all
            {/if}
          </button>
        {/if}

        <label class="flex items-center gap-1.5 text-xs text-gray-600">
          <input
            type="checkbox"
            bind:checked={autoScroll}
            disabled={showGrouped}
            class="cursor-pointer rounded border-gray-300 text-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
          Auto-scroll
        </label>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <button
          onclick={copyLogs}
          disabled={filteredLogs.length === 0}
          class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Copy class="h-3.5 w-3.5" />
          Copy
        </button>
        <button
          onclick={downloadLogs}
          disabled={filteredLogs.length === 0}
          class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download class="h-3.5 w-3.5" />
          Download
        </button>
      </div>
    </div>
  </div>

  <!-- Scrollable Content Area -->
  <div class="min-h-0 flex-1 overflow-y-auto" bind:this={scrollArea}>
    {#if isLoading}
      <div class="flex flex-col items-center justify-center p-8">
        <div class="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <Loader2 class="mx-auto mb-4 h-8 w-8 animate-spin text-gray-400" />
          <p class="text-gray-500">Loading logs...</p>
        </div>
      </div>
    {:else if logs.length === 0}
      <div class="flex flex-col items-center justify-center p-8">
        <div class="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <Terminal class="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p class="mb-2 text-gray-500">No logs available yet</p>
          <p class="text-sm text-gray-400">Logs will appear here as the execution progresses</p>
        </div>
      </div>
    {:else if showGrouped}
      <!-- Grouped View with Floating Cards -->
      <div class="px-4 pb-4">
        {#each logsByPhase as [phase, phaseLogs], index (phase)}
          <LogGroup
            {phase}
            logs={phaseLogs}
            status={getPhaseStatus(phaseLogs)}
            startTime={phaseLogs[0]?.timestamp}
            endTime={phaseLogs[phaseLogs.length - 1]?.timestamp}
            initialExpanded={allExpanded ||
              getPhaseStatus(phaseLogs) === 'running' ||
              getPhaseStatus(phaseLogs) === 'failed'}
            phaseIndex={index}
            totalPhases={logsByPhase.length}
            {searchQuery}
            forceExpand={scrollTargetIndex === index}
          />
        {/each}
      </div>
    {:else}
      <!-- Terminal View with Phase Headers -->
      <div
        class="m-4 mt-2 rounded-lg border border-gray-800 bg-gray-900 font-mono text-sm text-gray-100 shadow-lg"
      >
        <div bind:this={logContainer}>
          {#each logsByPhase as [phase, phaseLogs] (phase)}
            <div class="phase-section">
              <!-- Phase Header (Sticky in scrollable container) -->
              <div
                class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-700 bg-gray-800 bg-gray-800/95 px-4 py-2 backdrop-blur-sm"
              >
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold tracking-wider text-gray-400 uppercase">
                    {phase.replace(/_/g, ' ')}
                  </span>
                  <span class="text-xs text-gray-500">
                    ({phaseLogs.length} logs)
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  {#if phaseLogs.some((l) => l.level === 'error')}
                    <span class="text-xs text-red-400">
                      {phaseLogs.filter((l) => l.level === 'error').length} errors
                    </span>
                  {/if}
                  {#if phaseLogs.some((l) => l.level === 'warning')}
                    <span class="text-xs text-yellow-400">
                      {phaseLogs.filter((l) => l.level === 'warning').length} warnings
                    </span>
                  {/if}
                </div>
              </div>

              <!-- Phase Logs -->
              <div class="px-4 py-2">
                {#each phaseLogs as log (log.timestamp + log.message)}
                  <div class="group flex py-0.5 hover:bg-gray-800/50">
                    <span class="mr-3 text-gray-500 select-none">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      class="flex-1 break-all whitespace-pre-wrap {levelColors[log.level] ||
                        'text-gray-300'}"
                    >
                      {#each splitBySearchQuery(log.message) as part (part.text + part.highlight)}
                        {#if part.highlight}
                          <mark class="rounded bg-yellow-300 px-0.5 text-black">{part.text}</mark>
                        {:else}
                          {part.text}
                        {/if}
                      {/each}
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
