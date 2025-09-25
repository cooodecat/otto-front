<script lang="ts">
  import { X } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { onMount, onDestroy } from 'svelte';
  import type {
    ExecutionMetadata,
    PhaseInfo,
    LogEntry,
    ExecutionStatus,
    PhaseName
  } from '$lib/types/log.types';
  import DrawerHeader from './DrawerHeader.svelte';
  import LogsTab from './tabs/LogsTab.svelte';
  import { logApiService } from '$lib/services/log-api.service';
  import { LogWebSocketService } from '$lib/services/log-websocket.service';
  import api from '$lib/sdk';
  import { makeFetch } from '$lib/utils/make-fetch';
  import { goto } from '$app/navigation';

  interface Props {
    executionId: string;
    projectId?: string;
    onClose: () => void;
    onExecutionChange?: (newExecutionId: string) => void;
  }

  let { executionId, projectId, onClose, onExecutionChange }: Props = $props();

  let loading = $state(true);
  let execution = $state<ExecutionMetadata | null>(null);
  let phases = $state<PhaseInfo[]>([]);
  let logs = $state<LogEntry[]>([]);
  let isConnected = $state(false);
  let logsTabRef = $state<{ scrollToPhaseIndex?: (index: number) => void } | null>(null);
  let currentExecutionId = $state(executionId);

  // WebSocket service - created only when needed
  let wsService = $state<LogWebSocketService | null>(null);
  let isSettingUpWebSocket = $state(false);
  let lastWebSocketSetupAttempt = $state(0);

  // Store unsubscribers
  let unsubscribers: (() => void)[] = [];

  // Extract phase information from logs
  function updatePhasesFromLogs(logs: LogEntry[]) {
    const phaseMap = new Map<string, PhaseInfo>();

    // Initialize with existing phases
    phases.forEach((p) => phaseMap.set(p.name, p));

    logs.forEach((log) => {
      const message = log.message || '';

      // Detect phase start
      const phaseStart = message.match(/Entering phase\s+([A-Z_]+)/i);
      if (phaseStart) {
        const phaseName = phaseStart[1];
        if (!phaseMap.has(phaseName)) {
          phaseMap.set(phaseName, {
            id: phaseName,
            name: phaseName as PhaseName,
            status: 'running',
            startTime: log.timestamp,
            progress: 10
          });
        } else {
          const phase = phaseMap.get(phaseName)!;
          phase.status = 'running';
          phase.startTime = phase.startTime || log.timestamp;
          phase.progress = Math.max(phase.progress || 0, 10);
        }
      }

      // Detect phase completion
      const phaseComplete = message.match(/Phase complete:?\s*([A-Z_]+)/i);
      if (phaseComplete) {
        const phaseName = phaseComplete[1];
        const phase = phaseMap.get(phaseName);
        if (phase) {
          phase.status = 'completed';
          phase.endTime = log.timestamp;
          phase.progress = 100;

          // Calculate duration
          if (phase.startTime) {
            const start = new Date(phase.startTime).getTime();
            const end = new Date(log.timestamp).getTime();
            phase.duration = Math.floor((end - start) / 1000);
          }
        }
      }

      // Special handling for FINALIZING phase completion
      if (message.match(/Build succeeded|SUCCEEDED|Build complete|Execution complete/i)) {
        const finalizingPhase = phaseMap.get('FINALIZING');
        if (finalizingPhase && finalizingPhase.status === 'running') {
          finalizingPhase.status = 'completed';
          finalizingPhase.endTime = log.timestamp;
          finalizingPhase.progress = 100;

          if (finalizingPhase.startTime) {
            const start = new Date(finalizingPhase.startTime).getTime();
            const end = new Date(log.timestamp).getTime();
            finalizingPhase.duration = Math.floor((end - start) / 1000);
          }
        }
      }

      // Update progress based on log content
      if (log.phase && phaseMap.has(log.phase)) {
        const phase = phaseMap.get(log.phase)!;
        if (phase.status === 'running' && phase.progress) {
          // Increment progress gradually
          phase.progress = Math.min(95, (phase.progress || 0) + 5);
        }
      }
    });

    // Update phases state
    phases = Array.from(phaseMap.values()).sort((a, b) => {
      const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
      const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
      return aTime - bTime;
    });
  }

  // Load execution data from API
  async function loadExecutionData() {
    loading = true;

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout - forcing completion');
        loading = false;
      }
    }, 10000); // 10 second timeout

    try {
      console.log('Loading execution data for ID:', currentExecutionId);
      execution = await logApiService.getExecutionById(currentExecutionId);

      // Log the actual data to see what we're getting
      console.log('Loaded execution data:', $state.snapshot(execution));
      console.log('Metadata:', $state.snapshot(execution?.metadata));

      // Always try to load logs from API first as a fallback
      console.log(
        'Loading logs from API for execution:',
        currentExecutionId,
        'Status:',
        execution?.status
      );
      try {
        const apiLogs = await logApiService.getExecutionLogs(currentExecutionId, { limit: 1000 });
        console.log('Loaded logs from API:', apiLogs?.length || 0);
        if (apiLogs && apiLogs.length > 0) {
          logs = apiLogs;
          updatePhasesFromLogs(apiLogs);
        } else {
          console.warn('No logs returned from API for execution:', currentExecutionId);

          // Check if this is a stale RUNNING execution
          if (execution?.status === 'RUNNING' && execution?.startedAt) {
            const startTime = new Date(execution.startedAt).getTime();
            const now = Date.now();
            const hoursSinceStart = (now - startTime) / (1000 * 60 * 60);

            if (hoursSinceStart > 1) {
              console.warn(
                `Execution has been running for ${hoursSinceStart.toFixed(1)} hours with no logs - likely interrupted`
              );
            }
          }

          // Try to get archived logs URL as fallback
          try {
            const archiveUrl = await logApiService.getArchivedLogUrl(currentExecutionId);
            console.log('Archive URL available:', archiveUrl);
          } catch (archiveError) {
            console.error('Failed to get archive URL:', archiveError);
          }
        }
      } catch (logError) {
        console.error('Failed to load logs from API:', logError);
      }

      // Initialize phases based on execution type if no phases from server
      if (!phases || phases.length === 0) {
        phases = []; // Start with empty phases, will be populated from WebSocket or logs
      }
    } catch (error) {
      console.error('Failed to load execution:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : '',
        executionId: currentExecutionId
      });
      // Fallback to mock data
      execution = getMockExecution();
      phases = getMockPhases();
    } finally {
      clearTimeout(timeoutId);
      loading = false;
    }
  }

  // Handle re-run
  async function handleRerun(execution: ExecutionMetadata) {
    if (!execution?.pipelineId) {
      console.error('Pipeline ID not found for re-run');
      return;
    }

    try {
      const connection = makeFetch();
      const response = await api.functional.pipelines.execute.executePipeline(
        connection,
        execution.pipelineId
      );

      console.log('Re-run response:', response);

      // Use buildId from the response
      const newExecutionId = response.buildId;
      if (newExecutionId) {
        console.log('Switching to new execution:', newExecutionId);
        await handleNewExecution(newExecutionId);
      }
    } catch (error) {
      console.error('Failed to re-run execution:', error);
      // TODO: Show error toast
    }
  }

  // Handle new execution from re-run
  async function handleNewExecution(buildIdOrExecutionId: string) {
    console.log('Switching to new execution with buildId/executionId:', buildIdOrExecutionId);

    // Disconnect from current WebSocket
    if (wsService) {
      wsService.disconnect();
      wsService = null;
    }

    // Clear current data
    logs = [];
    phases = [];
    execution = null;
    loading = true;

    // Wait for the new execution to be created in the backend
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      // If it looks like a buildId (contains ':'), we need to find the actual executionId
      let actualExecutionId = buildIdOrExecutionId;

      if (buildIdOrExecutionId.includes(':')) {
        console.log('BuildId detected, fetching latest execution...');
        // Get the latest execution for this project
        const executions = await logApiService.getExecutions({
          projectId: projectId || '',
          pageSize: 5
        });

        // Find the most recent execution (should be the one we just created)
        const latestExecution = executions[0];
        if (latestExecution) {
          actualExecutionId = latestExecution.executionId;
          console.log('Found latest execution:', actualExecutionId);
        }
      }

      // Update execution ID and reload
      currentExecutionId = actualExecutionId;

      // Notify parent component about the change
      if (onExecutionChange) {
        onExecutionChange(actualExecutionId);
      }

      // Load new execution data and reconnect WebSocket
      await loadExecutionData();
      await setupWebSocket();
    } catch (error) {
      console.error('Failed to switch to new execution:', error);
      // Fallback: try using the original ID
      currentExecutionId = buildIdOrExecutionId;
      await loadExecutionData();
      await setupWebSocket();
    }
  }

  // Setup WebSocket connection
  async function setupWebSocket() {
    // Prevent concurrent setup attempts
    if (isSettingUpWebSocket) {
      console.log('WebSocket setup already in progress, skipping');
      return;
    }

    // Rate limit setup attempts (minimum 5 seconds between attempts)
    const now = Date.now();
    if (now - lastWebSocketSetupAttempt < 5000) {
      console.log('WebSocket setup rate limited, skipping');
      return;
    }

    // Skip WebSocket for completed executions
    if (
      execution?.status === 'SUCCESS' ||
      execution?.status === 'FAILED' ||
      execution?.status === 'SUCCEEDED' ||
      execution?.status === 'COMPLETED' ||
      execution?.status === 'CANCELLED'
    ) {
      console.log('Execution is completed, skipping WebSocket connection');
      return;
    }

    isSettingUpWebSocket = true;
    lastWebSocketSetupAttempt = now;

    try {
      // Create WebSocket service only for running executions
      if (!wsService) {
        wsService = new LogWebSocketService();
      }

      // Don't pass token - server will extract from cookies
      // Create a timeout promise
      const connectTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
      });

      // Race between connection and timeout
      await Promise.race([wsService.connect(''), connectTimeout]);

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
          // Only update if we have new logs from WebSocket
          // Don't overwrite with empty array if WebSocket hasn't sent anything yet
          if (value.length > 0) {
            logs = value;

            // Extract phase information from log messages
            updatePhasesFromLogs(value);
          } else if (value.length === 0 && logs.length === 0) {
            // Only set empty logs if we don't have any logs from API either
            console.log('No logs from WebSocket and no existing logs');
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
          // Normalize status to uppercase first
          const normalizedStatus = (value?.toUpperCase() || 'PENDING') as ExecutionStatus;

          if (execution) {
            // Create a new object for reactivity in Svelte 5
            execution = { ...execution, status: normalizedStatus };
          }
          // If backend only sends final execution status but not final phase updates,
          // coerce phase statuses so UI can finish gracefully.
          if (normalizedStatus === 'SUCCESS' || normalizedStatus === 'SUCCEEDED') {
            phases = phases.map((p) => ({
              ...p,
              status: p.status === 'failed' ? 'failed' : 'completed',
              endTime: p.endTime || new Date().toISOString(),
              progress: 100
            }));

            // Explicitly mark FINALIZING as completed
            const finalizingIdx = phases.findIndex((p) => p.name === 'FINALIZING');
            if (finalizingIdx >= 0) {
              phases[finalizingIdx].status = 'completed';
              phases[finalizingIdx].progress = 100;
            }
          } else if (normalizedStatus === 'FAILED') {
            phases = phases.map((p) =>
              p.status === 'completed' || p.status === 'failed'
                ? p
                : { ...p, status: 'failed', endTime: p.endTime || new Date().toISOString() }
            );
          }
        })
      );
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      // Don't retry immediately, let the rate limiting handle it
    } finally {
      isSettingUpWebSocket = false;
    }
  }

  onMount(async () => {
    // Load execution data first, then setup WebSocket if needed
    await loadExecutionData();

    // Setup WebSocket for active executions (PENDING, RUNNING, or any in-progress state)
    const normalizedStatus = execution?.status?.toUpperCase();
    if (
      execution &&
      normalizedStatus !== 'SUCCESS' &&
      normalizedStatus !== 'FAILED' &&
      normalizedStatus !== 'SUCCEEDED' &&
      normalizedStatus !== 'COMPLETED' &&
      normalizedStatus !== 'CANCELLED'
    ) {
      await setupWebSocket();
    }
  });

  onDestroy(() => {
    // Unsubscribe from all stores
    unsubscribers.forEach((fn) => fn());
    if (wsService) {
      wsService.disconnect();
      wsService = null;
    }
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

  // Monitor execution status changes and reconnect WebSocket if needed
  $effect(() => {
    if (execution && !loading && !isSettingUpWebSocket) {
      // Check if we need to setup WebSocket for active executions
      const normalizedStatus = execution?.status?.toUpperCase();
      if (
        !wsService &&
        !isSettingUpWebSocket &&
        normalizedStatus !== 'SUCCESS' &&
        normalizedStatus !== 'FAILED' &&
        normalizedStatus !== 'SUCCEEDED' &&
        normalizedStatus !== 'COMPLETED' &&
        normalizedStatus !== 'CANCELLED'
      ) {
        // Debounce the setup to prevent rapid retries
        const timeoutId = setTimeout(() => {
          if (!wsService && !isSettingUpWebSocket) {
            console.log('Execution status indicates active state, setting up WebSocket');
            setupWebSocket();
          }
        }, 1000);

        // Cleanup timeout on effect cleanup
        return () => clearTimeout(timeoutId);
      }
    }
  });
</script>

<!-- Backdrop -->
<button
  class="fixed inset-0 z-40 cursor-pointer bg-black/40 backdrop-blur-md"
  transition:fade={{ duration: 200 }}
  onclick={onClose}
  aria-label="Close drawer"
  tabindex="-1"
></button>

<!-- Floating Drawer Container -->
<div class="pointer-events-none fixed inset-0 z-50 p-8">
  <!-- Drawer with Floating Style (Full Width) -->
  <div
    class="pointer-events-auto relative ml-auto flex h-full min-h-0 w-[90%] max-w-7xl flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-white to-gray-50 shadow-2xl ring-1 ring-gray-200/60"
    transition:fly={{ x: 600, duration: 300, easing: cubicOut }}
  >
    <!-- Main Content Panel -->
    <div class="flex min-h-0 flex-1 flex-col">
      <!-- Close Button -->
      <button
        onclick={onClose}
        class="absolute top-6 right-6 z-10 cursor-pointer rounded-full bg-white/80 p-2.5 shadow-lg backdrop-blur transition-all hover:rotate-90 hover:bg-white hover:shadow-xl"
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
        <DrawerHeader
          {execution}
          {isConnected}
          onRerun={() => execution && handleRerun(execution)}
          onEdit={() =>
            execution?.pipelineId &&
            goto(`/projects/${projectId}/pipelines/${execution.pipelineId}`)}
        />

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
                    onclick={() => {
                      logsTabRef?.scrollToPhaseIndex?.(index);
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

      <!-- Log Content -->
      <div class="flex min-h-0 flex-1 flex-col">
        {#if execution}
          <LogsTab
            bind:this={logsTabRef}
            executionId={execution.executionId}
            executionStatus={execution.status}
            executionStartedAt={execution.startedAt}
            {phases}
            {logs}
            {wsService}
            isLoading={loading}
            onRerun={() => execution && handleRerun(execution)}
          />
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
