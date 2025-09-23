<script lang="ts">
  import type { PhaseInfo, LogEntry } from '$lib/types/log.types';
  import type { LogWebSocketService } from '$lib/services/log-websocket.service';
  import { Download } from 'lucide-svelte';

  interface Props {
    executionId: string;
    phases: PhaseInfo[];
    logs?: LogEntry[];
    wsService?: LogWebSocketService;
  }

  let { executionId, phases: _phases, logs = [], wsService: _wsService }: Props = $props();

  let autoScroll = $state(true);
  let logContainer: HTMLDivElement;

  // Mock data for fallback only
  const mockLogs: LogEntry[] = [
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '[PREPARING] Initializing build environment...',
      phase: 'PREPARING'
    },
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '[PREPARING] Loading configuration...',
      phase: 'PREPARING'
    },
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '[PREPARING] Configuration loaded successfully',
      phase: 'PREPARING'
    },
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '[BUILDING] Running npm install...',
      phase: 'BUILDING'
    },
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '[BUILDING] > added 42 packages',
      phase: 'BUILDING'
    },
    {
      timestamp: new Date().toISOString(),
      level: 'warning',
      message: '[BUILDING] Warning: peer dependency not met',
      phase: 'BUILDING'
    },
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '[BUILDING] Building application...',
      phase: 'BUILDING'
    },
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '[TESTING] Running test suite...',
      phase: 'TESTING'
    },
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '[TESTING] ✓ 15 tests passed',
      phase: 'TESTING'
    },
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '[TESTING] All tests completed successfully',
      phase: 'TESTING'
    },
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '[FINALIZING] Uploading to S3...',
      phase: 'FINALIZING'
    },
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '[FINALIZING] > Progress: 75%',
      phase: 'FINALIZING'
    },
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '[FINALIZING] > Uploaded 34.5MB',
      phase: 'FINALIZING'
    }
  ];

  const displayLogs = $derived(logs.length > 0 ? logs : mockLogs);

  function downloadLogs() {
    const logText = displayLogs
      .map(
        (log) =>
          `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level.toUpperCase()}] ${log.message}`
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

  $effect(() => {
    if (autoScroll && logContainer) {
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
  <div class="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2">
    <div class="flex items-center gap-4">
      <label class="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          bind:checked={autoScroll}
          class="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
        />
        Auto-scroll
      </label>
    </div>

    <button
      onclick={downloadLogs}
      class="flex items-center gap-2 rounded px-3 py-1 text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
    >
      <Download class="h-4 w-4" />
      Download
    </button>
  </div>

  <!-- Terminal -->
  <div
    bind:this={logContainer}
    class="flex-1 overflow-y-auto bg-gray-900 p-4 font-mono text-sm text-gray-100"
  >
    {#if displayLogs.length === 0}
      <div class="py-8 text-center text-gray-500">Waiting for logs...</div>
    {:else}
      {#each displayLogs as log}
        <div class="-mx-2 mb-1 px-2 py-0.5 hover:bg-gray-800/50" data-phase={log.phase}>
          <span class="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
          <span class="{levelColors[log.level]} mx-2">[{log.level.toUpperCase()}]</span>
          <span>{log.message}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  /* Custom scrollbar for terminal */
  div::-webkit-scrollbar {
    width: 8px;
  }

  div::-webkit-scrollbar-track {
    background: rgb(31, 41, 55);
  }

  div::-webkit-scrollbar-thumb {
    background: rgb(75, 85, 99);
    border-radius: 4px;
  }

  div::-webkit-scrollbar-thumb:hover {
    background: rgb(107, 114, 128);
  }
</style>
