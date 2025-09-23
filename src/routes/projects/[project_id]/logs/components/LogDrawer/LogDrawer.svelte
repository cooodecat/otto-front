<script lang="ts">
  import { X } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';
  import { onMount, onDestroy } from 'svelte';
  import type { ExecutionMetadata, PhaseInfo, LogEntry } from '$lib/types/log.types';
  import PhaseTimeline from './PhaseTimeline.svelte';
  import DrawerHeader from './DrawerHeader.svelte';
  import DrawerTabs from './DrawerTabs.svelte';
  import LogsTab from './tabs/LogsTab.svelte';
  import PipelineTab from './tabs/PipelineTab.svelte';
  import ArtifactsTab from './tabs/ArtifactsTab.svelte';
  import { logApiService } from '$lib/services/log-api.service';
  import { LogWebSocketService } from '$lib/services/log-websocket.service';

  interface Props {
    executionId: string;
    onClose: () => void;
  }

  let { executionId, onClose }: Props = $props();

  let activeTab = $state<'logs' | 'pipeline' | 'artifacts'>('logs');
  let loading = $state(true);
  let execution = $state<ExecutionMetadata | null>(null);
  let phases = $state<PhaseInfo[]>([]);
  let logs = $state<LogEntry[]>([]);
  let isConnected = $state(false);

  // WebSocket service
  const wsService = new LogWebSocketService();

  // Load execution data from API
  async function loadExecutionData() {
    loading = true;
    try {
      execution = await logApiService.getExecutionById(executionId);
      
      // Load actual logs from DB
      const executionLogs = await logApiService.getExecutionLogs(executionId, {
        limit: 1000 // Get more logs
      });
      logs = executionLogs;
      
      // Extract phases from logs if available
      const phaseSet = new Set<string>();
      executionLogs.forEach(log => {
        if (log.phase) {
          phaseSet.add(log.phase);
        }
      });
      
      // Create phase info from logs
      if (phaseSet.size > 0) {
        phases = Array.from(phaseSet).map((phaseName, index) => ({
          id: String(index + 1),
          name: phaseName as any,
          status: 'completed' as const,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 0
        }));
      } else {
        phases = getMockPhases();
      }
    } catch (error) {
      console.error('Failed to load execution:', error);
      // Fallback to mock data
      execution = getMockExecution();
      phases = getMockPhases();
      logs = [];
    } finally {
      loading = false;
    }
  }

  // Setup WebSocket connection
  async function setupWebSocket() {
    try {
      const token = localStorage.getItem('auth_token') || '';
      await wsService.connect(token);
      wsService.subscribe(executionId);

      // Subscribe to stores
      wsService.connected.subscribe((value) => {
        isConnected = value;
      });

      wsService.logs.subscribe((value) => {
        logs = value;
      });

      wsService.phases.subscribe((value) => {
        if (value.length > 0) {
          phases = value;
        }
      });

      wsService.status.subscribe((value) => {
        if (execution) {
          execution.status = value;
        }
      });
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }

  onMount(() => {
    loadExecutionData();
    setupWebSocket();
  });

  onDestroy(() => {
    wsService.disconnect();
  });

  // Mock data fallback
  function getMockExecution(): ExecutionMetadata {
    return {
      executionId,
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

  function handlePhaseClick(_phaseId: string) {
    activeTab = 'logs';
    // TODO: Scroll to phase logs
  }

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
  class="fixed inset-0 z-40 bg-black/30"
  transition:fade={{ duration: 200 }}
  onclick={onClose}
  aria-label="Close drawer"
  tabindex="-1"
></button>

<!-- Drawer -->
<div
  class="fixed top-0 right-0 z-50 flex h-full w-[80%] max-w-6xl bg-white shadow-2xl"
  transition:fly={{ x: '100%', duration: 300 }}
>
  <!-- Left Panel - Phase Timeline (30%) -->
  <div class="flex w-[30%] flex-col border-r border-gray-200 bg-gray-50">
    <div class="border-b border-gray-200 p-4">
      <h3 class="font-semibold text-gray-900">Execution Phases</h3>
    </div>
    <div class="flex-1 overflow-y-auto">
      <PhaseTimeline {phases} onPhaseClick={handlePhaseClick} />
    </div>
  </div>

  <!-- Right Panel - Details (70%) -->
  <div class="flex flex-1 flex-col">
    <!-- Close Button -->
    <button
      onclick={onClose}
      class="absolute top-4 right-4 z-10 rounded-lg p-2 transition-colors hover:bg-gray-100"
    >
      <X class="h-5 w-5 text-gray-500" />
    </button>

    <!-- Header -->
    {#if loading}
      <div class="flex justify-center p-6">
        <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    {:else if execution}
      <DrawerHeader {execution} {isConnected} />
    {/if}

    <!-- Tabs -->
    <DrawerTabs bind:activeTab />

    <!-- Tab Content -->
    <div class="flex-1 overflow-hidden">
      {#if execution}
        {#if activeTab === 'logs'}
          <LogsTab executionId={execution.executionId} {phases} {logs} {wsService} />
        {:else if activeTab === 'pipeline'}
          <PipelineTab {execution} />
        {:else if activeTab === 'artifacts'}
          <ArtifactsTab executionId={execution.executionId} />
        {/if}
      {/if}
    </div>
  </div>
</div>
