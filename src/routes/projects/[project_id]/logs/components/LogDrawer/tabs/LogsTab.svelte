<script lang="ts">
  import type { PhaseInfo, LogEntry } from '$lib/types/log.types';
  import type { LogWebSocketService } from '$lib/services/log-websocket.service';
  import { Download, Loader2, ChevronDown, ChevronUp, Search, Filter, Copy, Terminal, Layers } from 'lucide-svelte';
  import LogGroup from '../LogGroup.svelte';

  interface Props {
    executionId: string;
    phases: PhaseInfo[];
    logs?: LogEntry[];
    wsService?: LogWebSocketService;
    isLoading?: boolean;
  }

  let { executionId, phases, logs = [], wsService, isLoading = false }: Props = $props();

  let autoScroll = $state(true);
  let showGrouped = $state(true);
  let allExpanded = $state(false);
  let logContainer: HTMLDivElement;
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
      filtered = filtered.filter(log => log.level === selectedLevel);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(query) ||
        log.phase?.toLowerCase().includes(query) ||
        log.step?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  });
  
  // Group logs by phase
  const logsByPhase = $derived.by(() => {
    const groups = new Map<string, LogEntry[]>();
    
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
    
    knownPhases.forEach(phase => {
      groups.set(phase, []);
    });
    
    // Group filtered logs
    filteredLogs.forEach(log => {
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
    
    const hasError = phaseLogs.some(log => log.level === 'error');
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
      errors: logs.filter(l => l.level === 'error').length,
      warnings: logs.filter(l => l.level === 'warning').length
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
</script>

<div class="flex h-full flex-col">
  <!-- Enhanced Toolbar -->
  <div class="border-b border-gray-200 bg-white">
    <!-- Search and Filter Bar -->
    <div class="flex items-center gap-3 border-b border-gray-100 px-4 py-2">
      <!-- Search Input -->
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search logs..."
          class="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      
      <!-- Level Filter -->
      <div class="flex items-center gap-2 rounded-lg border border-gray-300 p-1">
        <button
          onclick={() => selectedLevel = 'all'}
          class="px-3 py-1 rounded text-xs font-medium transition-colors {selectedLevel === 'all' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'}"
        >
          All
        </button>
        <button
          onclick={() => selectedLevel = 'error'}
          class="px-3 py-1 rounded text-xs font-medium transition-colors {selectedLevel === 'error' ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-red-50'}"
        >
          Errors ({logStats.errors})
        </button>
        <button
          onclick={() => selectedLevel = 'warning'}
          class="px-3 py-1 rounded text-xs font-medium transition-colors {selectedLevel === 'warning' ? 'bg-yellow-600 text-white' : 'text-gray-600 hover:bg-yellow-50'}"
        >
          Warnings ({logStats.warnings})
        </button>
        <button
          onclick={() => selectedLevel = 'info'}
          class="px-3 py-1 rounded text-xs font-medium transition-colors {selectedLevel === 'info' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-blue-50'}"
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
            onclick={() => showGrouped = true}
            class="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors {showGrouped ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'}"
          >
            <Layers class="h-3.5 w-3.5" />
            Grouped
          </button>
          <button
            onclick={() => showGrouped = false}
            class="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors {!showGrouped ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'}"
          >
            <Terminal class="h-3.5 w-3.5" />
            Terminal
          </button>
        </div>
        
        {#if showGrouped}
          <button
            onclick={toggleAllGroups}
            class="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
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
            class="rounded border-gray-300 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
          />
          Auto-scroll
        </label>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <button
          onclick={copyLogs}
          disabled={filteredLogs.length === 0}
          class="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Copy class="h-3.5 w-3.5" />
          Copy
        </button>
        <button
          onclick={downloadLogs}
          disabled={filteredLogs.length === 0}
          class="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download class="h-3.5 w-3.5" />
          Download
        </button>
      </div>
    </div>
  </div>

  <!-- Content -->
  {#if isLoading}
    <div class="flex flex-1 flex-col items-center justify-center bg-gray-50">
      <Loader2 class="mb-4 h-8 w-8 animate-spin text-gray-400" />
      <p class="text-gray-500">Loading logs...</p>
    </div>
  {:else if logs.length === 0}
    <div class="flex flex-1 flex-col items-center justify-center bg-gray-50 p-8">
      <p class="mb-2 text-gray-500">No logs available yet</p>
      <p class="text-sm text-gray-400">Logs will appear here as the execution progresses</p>
    </div>
  {:else if showGrouped}
    <!-- Grouped View -->
    <div class="flex-1 overflow-y-auto bg-white">
      {#each logsByPhase as [phase, phaseLogs], index}
        <LogGroup 
          {phase}
          logs={phaseLogs}
          status={getPhaseStatus(phaseLogs)}
          startTime={phaseLogs[0]?.timestamp}
          endTime={phaseLogs[phaseLogs.length - 1]?.timestamp}
          initialExpanded={allExpanded || getPhaseStatus(phaseLogs) === 'running' || getPhaseStatus(phaseLogs) === 'failed'}
          phaseIndex={index}
          totalPhases={logsByPhase.length}
        />
      {/each}
    </div>
  {:else}
    <!-- Terminal View -->
    <div
      bind:this={logContainer}
      class="flex-1 overflow-y-auto bg-gray-900 p-4 font-mono text-sm text-gray-100"
    >
      {#each filteredLogs as log (log.timestamp + log.message)}
        <div class="group flex hover:bg-gray-800/50">
          <span class="mr-3 select-none text-gray-500">
            {new Date(log.timestamp).toLocaleTimeString()}
          </span>
          <span class="flex-1 whitespace-pre-wrap break-all {levelColors[log.level] || 'text-gray-300'}">
            {log.message}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>