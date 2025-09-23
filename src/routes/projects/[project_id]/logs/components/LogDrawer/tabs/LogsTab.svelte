<script lang="ts">
  import type { PhaseInfo, LogEntry } from '$lib/types/log.types';
  import type { LogWebSocketService } from '$lib/services/log-websocket.service';
  import { Download, Loader2, ChevronDown, ChevronUp } from 'lucide-svelte';
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
  
  // Debug log count
  $effect(() => {
    console.log('LogsTab - logs length:', logs?.length || 0);
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
    
    // Group logs
    logs.forEach(log => {
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
    const logText = logs
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

  function toggleAllGroups() {
    allExpanded = !allExpanded;
  }

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
  <!-- Toolbar -->
  <div class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
    <div class="flex items-center gap-4">
      <label class="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          bind:checked={showGrouped}
          class="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
        />
        Group by phase
      </label>
      
      {#if showGrouped}
        <button
          onclick={toggleAllGroups}
          class="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
        >
          {#if allExpanded}
            <ChevronUp class="h-4 w-4" />
            Collapse all
          {:else}
            <ChevronDown class="h-4 w-4" />
            Expand all
          {/if}
        </button>
      {/if}
      
      <label class="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          bind:checked={autoScroll}
          disabled={showGrouped}
          class="rounded border-gray-300 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
        />
        Auto-scroll
      </label>
    </div>

    <button
      onclick={downloadLogs}
      disabled={logs.length === 0}
      class="flex items-center gap-2 rounded px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
    >
      <Download class="h-4 w-4" />
      Download
    </button>
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
      {#each logsByPhase as [phase, phaseLogs]}
        <LogGroup 
          {phase}
          logs={phaseLogs}
          status={getPhaseStatus(phaseLogs)}
          startTime={phaseLogs[0]?.timestamp}
          endTime={phaseLogs[phaseLogs.length - 1]?.timestamp}
          initialExpanded={allExpanded || getPhaseStatus(phaseLogs) === 'running' || getPhaseStatus(phaseLogs) === 'failed'}
        />
      {/each}
    </div>
  {:else}
    <!-- Terminal View -->
    <div
      bind:this={logContainer}
      class="flex-1 overflow-y-auto bg-gray-900 p-4 font-mono text-sm text-gray-100"
    >
      {#each logs as log (log.timestamp + log.message)}
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