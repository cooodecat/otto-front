<script lang="ts">
  import { X } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';
  import { onMount, onDestroy } from 'svelte';
  import type { ExecutionMetadata, PhaseInfo, LogEntry } from '$lib/types/log.types';
  import DrawerHeader from './DrawerHeader.svelte';
  import DrawerTabs from './DrawerTabs.svelte';
  import LogsTab from './tabs/LogsTab.svelte';
  import PipelineTab from './tabs/PipelineTab.svelte';
  import ArtifactsTab from './tabs/ArtifactsTab.svelte';
  import { logApiService } from '$lib/services/log-api.service';
  import { LogWebSocketService } from '$lib/services/log-websocket.service';
  import { tick } from 'svelte';

  interface Props {
    executionId: string;
    onClose: () => void;
    onExecutionChange?: (newExecutionId: string) => void;
  }

  let { executionId, onClose, onExecutionChange }: Props = $props();

  let activeTab = $state<'logs' | 'pipeline' | 'artifacts'>('logs');
  let loading = $state(true);
  let execution = $state<ExecutionMetadata | null>(null);
  let phases = $state<PhaseInfo[]>([]);
  let logs = $state<LogEntry[]>([]);
  let isConnected = $state(false);
  let logsTabRef = $state<any>(null);
  let currentExecutionId = $state(executionId);

  // WebSocket service
  const wsService = new LogWebSocketService();

  // Store unsubscribers
  let unsubscribers: (() => void)[] = [];

  // Load execution data from API
  async function loadExecutionData() {
    loading = true;
    try {
      console.log('Loading execution data for ID:', currentExecutionId);
      execution = await logApiService.getExecutionById(currentExecutionId);

      // Log the actual data to see what we're getting
      console.log('Loaded execution data:', execution);
      console.log('Metadata:', execution?.metadata);

      // Don't load logs here - WebSocket will provide them
      // Just set up initial phases structure
      phases = getMockPhases();
    } catch (error: any) {
      console.error('Failed to load execution:', error);
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        stack: error?.stack || '',
        executionId: currentExecutionId
      });
      // Fallback to mock data
      execution = getMockExecution();
      phases = getMockPhases();
    } finally {
      loading = false;
    }
  }

  // Handle new execution from re-run
  async function handleNewExecution(newExecutionId: string) {
    console.log('Switching to new execution:', newExecutionId);

    // Disconnect from current WebSocket
    wsService.disconnect();

    // Clear current data
    logs = [];
    phases = [];
    execution = null;

    // Update execution ID and reload
    currentExecutionId = newExecutionId;

    // Notify parent component about the change
    if (onExecutionChange) {
      onExecutionChange(newExecutionId);
    }

    // Load new execution data and reconnect WebSocket
    await loadExecutionData();
    await setupWebSocket();

    // Switch to logs tab to show the new execution
    activeTab = 'logs';
  }

  // Setup WebSocket connection
  async function setupWebSocket() {
    try {
      const token = localStorage.getItem('auth_token') || '';
      await wsService.connect(token);
      wsService.subscribe(currentExecutionId);

      // Subscribe to stores and track unsubscribers
      unsubscribers.push(
        wsService.connected.subscribe((value) => {
          isConnected = value;
        })
      );

      unsubscribers.push(
        wsService.logs.subscribe((value) => {
          // WebSocket으로 받은 로그를 설정 (WebSocket 서비스에서 이미 중복 제거됨)
          console.log('LogDrawer received logs from WebSocket:', value.length);
          if (value.length > 0) {
            logs = value;
          }
        })
      );

      unsubscribers.push(
        wsService.phases.subscribe((value) => {
          if (value.length > 0) {
            phases = value;
          }
        })
      );

      unsubscribers.push(
        wsService.status.subscribe((value) => {
          if (execution) {
            execution.status = value;
          }
        })
      );
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }

  onMount(() => {
    loadExecutionData();
    setupWebSocket();
  });

  onDestroy(() => {
    // Unsubscribe from all stores
    unsubscribers.forEach((fn) => fn());
    wsService.disconnect();
  });

  // Mock data fallback
  function getMockExecution(): ExecutionMetadata {
    return {
      executionId: currentExecutionId,
      buildNumber: 124,
      executionType: 'DEPLOY',
      status: 'RUNNING',
      startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      duration: 0,
      branch: 'main',
      commitId: 'abc123d',
      commitMessage: 'feat: add new feature',
      author: 'John Doe',
      pipelineId: 'pipeline-1',
      pipelineName: 'CI/CD Production',
      triggeredBy: 'webhook',
      logStats: {
        totalLines: 1234,
        errorCount: 0,
        warningCount: 3
      }
    };
  }

  // Mock phase data fallback
  function getMockPhases(): PhaseInfo[] {
    return [
      {
        id: '1',
        name: 'PREPARING',
        status: 'completed',
        startTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 4 * 60 * 1000 - 58 * 1000).toISOString(),
        duration: 2
      },
      {
        id: '2',
        name: 'BUILDING',
        status: 'completed',
        startTime: new Date(Date.now() - 4 * 60 * 1000 - 58 * 1000).toISOString(),
        endTime: new Date(Date.now() - 4 * 60 * 1000 - 13 * 1000).toISOString(),
        duration: 45
      },
      {
        id: '3',
        name: 'TESTING',
        status: 'completed',
        startTime: new Date(Date.now() - 4 * 60 * 1000 - 13 * 1000).toISOString(),
        endTime: new Date(Date.now() - 3 * 60 * 1000 - 43 * 1000).toISOString(),
        duration: 30
      },
      {
        id: '4',
        name: 'FINALIZING',
        status: 'running',
        startTime: new Date(Date.now() - 3 * 60 * 1000 - 43 * 1000).toISOString(),
        progress: 75,
        subSteps: [
          { name: 'Uploading to S3', completed: true },
          { name: 'Updating DNS', completed: true },
          { name: 'Health check', completed: false }
        ]
      }
    ];
  }

  // React to prop changes
  $effect(() => {
    if (executionId !== currentExecutionId) {
      currentExecutionId = executionId;
    }
  });

  // Keyboard shortcut for tabs
  $effect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === '1') activeTab = 'logs';
      else if (e.key === '2') activeTab = 'pipeline';
      else if (e.key === '3') activeTab = 'artifacts';
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<!-- Backdrop -->
<button
  class="fixed inset-0 z-40 cursor-pointer bg-black/30 backdrop-blur-sm"
  transition:fade={{ duration: 200 }}
  onclick={onClose}
  aria-label="Close drawer"
  tabindex="-1"
></button>

<!-- Floating Drawer Container -->
<div class="pointer-events-none fixed inset-0 z-50 p-6">
  <!-- Drawer with Floating Style (Full Width) -->
  <div
    class="pointer-events-auto relative ml-auto flex h-full min-h-0 w-[85%] max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200/50"
    transition:fly={{ x: '100%', duration: 300 }}
  >
    <!-- Main Content Panel -->
    <div class="flex min-h-0 flex-1 flex-col">
      <!-- Close Button -->
      <button
        onclick={onClose}
        class="absolute top-4 right-4 z-10 cursor-pointer rounded-full bg-gray-100 p-2 transition-all hover:rotate-90 hover:bg-gray-200"
        aria-label="Close drawer"
      >
        <X class="h-5 w-5 text-gray-700" />
      </button>

      <!-- Header -->
      {#if loading}
        <div class="flex justify-center p-6">
          <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      {:else if execution}
        <DrawerHeader {execution} {isConnected} />

        <!-- Compact Phase Progress Indicator -->
        {#if phases.length > 0}
          <div class="border-b border-gray-200 bg-gray-50/50 px-6 py-3">
            <div class="flex items-center gap-3">
              <span class="text-xs font-medium text-gray-600">Progress:</span>
              <div class="flex flex-1 items-center gap-2">
                {#each phases as phase, index}
                  <button
                    type="button"
                    class="group relative flex-1 cursor-pointer"
                    onclick={async () => {
                      activeTab = 'logs';
                      // Wait for LogsTab to mount/bind
                      await tick();
                      // Give the child a moment if switching tabs
                      setTimeout(() => {
                        logsTabRef?.scrollToPhaseIndex?.(index);
                      }, 0);
                    }}
                  >
                    <div class="h-1.5 overflow-hidden rounded-full bg-gray-200">
                      <div
                        class="h-full transition-all duration-300 {phase.status === 'completed'
                          ? 'bg-green-500'
                          : phase.status === 'running'
                            ? 'animate-pulse bg-blue-500'
                            : phase.status === 'failed'
                              ? 'bg-red-500'
                              : 'bg-gray-300'}"
                        style="width: {phase.status === 'completed'
                          ? '100%'
                          : phase.status === 'running'
                            ? `${phase.progress || 50}%`
                            : '0%'}"
                      ></div>
                    </div>
                    <!-- Tooltip -->
                    <div
                      class="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      {phase.name}
                    </div>
                  </button>
                {/each}
              </div>
              <span class="text-xs text-gray-500">
                {phases.filter((p) => p.status === 'completed').length}/{phases.length} completed
              </span>
            </div>
          </div>
        {/if}
      {/if}

      <!-- Tabs -->
      <DrawerTabs bind:activeTab />

      <!-- Tab Content -->
      <div class="flex min-h-0 flex-1 flex-col">
        {#if execution}
          {#if activeTab === 'logs'}
            <LogsTab
              bind:this={logsTabRef}
              executionId={execution.executionId}
              {phases}
              {logs}
              {wsService}
              isLoading={loading}
            />
          {:else if activeTab === 'pipeline'}
            <PipelineTab {execution} onNewExecution={handleNewExecution} />
          {:else if activeTab === 'artifacts'}
            <ArtifactsTab executionId={execution.executionId} />
          {/if}
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  :global(.highlight-phase) {
    animation: highlight 2s ease-in-out;
  }

  @keyframes highlight {
    0% {
      background-color: transparent;
    }
    25% {
      background-color: rgb(59 130 246 / 0.1);
      box-shadow: 0 0 20px rgb(59 130 246 / 0.3);
    }
    75% {
      background-color: rgb(59 130 246 / 0.1);
      box-shadow: 0 0 20px rgb(59 130 246 / 0.3);
    }
    100% {
      background-color: transparent;
    }
  }
</style>
