<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { onMount, onDestroy } from 'svelte';
  import type {
    ExecutionMetadata,
    PhaseInfo,
    LogEntry,
    ExecutionStatus,
    PhaseName,
    PhaseStatus
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
    initialScrollPosition?: { x: number; y: number };
    onClose: () => void;
    onExecutionChange?: (newExecutionId: string, isRerun?: boolean) => void;
    onNavigate?: (direction: 'prev' | 'next') => void;
    onRerunSuccess?: () => void;
  }

  let {
    executionId,
    projectId,
    initialScrollPosition,
    onClose: closeDrawerCallback,
    onExecutionChange,
    onNavigate,
    onRerunSuccess
  }: Props = $props();

  let loading = $state(true);
  let execution = $state<ExecutionMetadata | null>(null);
  let phases = $state<PhaseInfo[]>([]);
  let logs = $state<LogEntry[]>([]);
  let isConnected = $state(false);
  let logsTabRef = $state<{ scrollToPhaseIndex?: (index: number) => void } | null>(null);
  let currentExecutionId = $state(executionId);
  let _actualPipelineName = $state<string | null>(null);
  let isScrollRestoreHandled = false;
  let scrollLockState: ScrollLockState | null = null;

  // WebSocket service - created only when needed
  let wsService = $state<LogWebSocketService | null>(null);
  let isSettingUpWebSocket = $state(false);
  let lastWebSocketSetupAttempt = $state(0);

  // Track last log received time for timeout detection
  let lastLogReceivedTime = $state<number>(Date.now());
  let timeoutCheckInterval: ReturnType<typeof setInterval> | null = null;
  let hasMarkedTimeoutFailure = false;

  // UI-only timeout indicator (doesn't modify actual execution status)
  let isTimeoutSuspected = $state(false);
  let timeoutMessage = $state<string | null>(null);

  // Store unsubscribers
  let unsubscribers: (() => void)[] = [];

  // Extract phase information from logs with improved detection
  function updatePhasesFromLogs(logs: LogEntry[], isRealTimeUpdate = false) {
    const phaseMap = new Map<string, PhaseInfo>();

    // Initialize with existing phases
    phases.forEach((p) => phaseMap.set(p.name, p));

    // For real-time updates during RUNNING status, start with empty phases
    // to build them incrementally as logs come in
    if (isRealTimeUpdate && execution?.status === 'RUNNING' && phases.length === 0) {
      // Don't pre-populate phases for real-time updates
      phaseMap.clear();
    }

    logs.forEach((log) => {
      const message = log.message || '';
      const currentTime = new Date().toISOString();

      // Check if log has structured metadata
      const phaseFromMetadata = log.metadata?.phase as string | undefined;
      const phaseStatusFromMetadata = log.metadata?.phaseStatus as PhaseStatus | undefined;

      // Detect phase start
      const phaseStart =
        message.match(/Entering phase\s+([A-Z_]+)/i) ||
        message.match(/Starting\s+([A-Z_]+)\s+phase/i) ||
        message.match(/\[([A-Z_]+)\]\s+phase\s+started/i);

      if (phaseStart || (phaseFromMetadata && phaseStatusFromMetadata === 'running')) {
        const phaseName = phaseStart?.[1] || phaseFromMetadata;
        if (phaseName) {
          if (!phaseMap.has(phaseName)) {
            phaseMap.set(phaseName, {
              id: phaseName,
              name: phaseName as PhaseName,
              status: 'running',
              startTime: log.timestamp,
              progress: 10,
              statusMetadata: {
                source: phaseFromMetadata ? 'websocket' : 'log_parsing',
                lastUpdateReason: 'Phase started',
                updatedAt: currentTime
              }
            });
          } else {
            const phase = phaseMap.get(phaseName)!;
            // Only update to running if not already completed/failed
            if (phase.status !== 'completed' && phase.status !== 'failed') {
              phase.status = 'running';
              phase.startTime = phase.startTime || log.timestamp;
              phase.progress = Math.max(phase.progress || 0, 10);
              phase.statusMetadata = {
                ...phase.statusMetadata,
                source: phaseFromMetadata ? 'websocket' : 'log_parsing',
                lastUpdateReason: 'Phase started',
                updatedAt: currentTime
              };
            }
          }
        }
      }

      // Detect phase completion
      const phaseComplete =
        message.match(/Phase complete:?\s*([A-Z_]+)/i) ||
        message.match(/([A-Z_]+)\s+phase\s+completed?/i) ||
        message.match(/\[([A-Z_]+)\]\s+✓\s+completed?/i) ||
        message.match(/Finished\s+([A-Z_]+)\s+phase/i);

      if (phaseComplete || (phaseFromMetadata && phaseStatusFromMetadata === 'completed')) {
        const phaseName = phaseComplete?.[1] || phaseFromMetadata;
        if (phaseName) {
          const phase = phaseMap.get(phaseName);
          if (phase) {
            phase.status = 'completed';
            phase.endTime = log.timestamp;
            phase.progress = 100;
            phase.statusMetadata = {
              ...phase.statusMetadata,
              source: phaseFromMetadata ? 'websocket' : 'log_parsing',
              lastUpdateReason: 'Phase completed successfully',
              hasExplicitCompletion: true,
              updatedAt: currentTime
            };
          }
        }
      }

      // Detect phase failure
      const phaseError =
        message.match(/Phase failed:?\s*([A-Z_]+)/i) ||
        message.match(/([A-Z_]+)\s+phase\s+failed/i) ||
        message.match(/Error in\s+([A-Z_]+)\s+phase/i) ||
        message.match(/\[([A-Z_]+)\]\s+✗\s+failed/i);

      if (phaseError || (phaseFromMetadata && phaseStatusFromMetadata === 'failed')) {
        const phaseName = phaseError?.[1] || phaseFromMetadata;
        if (phaseName) {
          const phase = phaseMap.get(phaseName);
          if (phase) {
            phase.status = 'failed';
            phase.endTime = log.timestamp;
            phase.statusMetadata = {
              ...phase.statusMetadata,
              source: phaseFromMetadata ? 'websocket' : 'log_parsing',
              lastUpdateReason: 'Phase failed',
              failureReason: message,
              updatedAt: currentTime
            };
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
          finalizingPhase.statusMetadata = {
            ...finalizingPhase.statusMetadata,
            source: 'log_parsing',
            lastUpdateReason: 'Build/Execution completed',
            hasExplicitCompletion: true,
            updatedAt: currentTime
          };
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
    hasMarkedTimeoutFailure = false;
    lastLogReceivedTime = Date.now();

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout - forcing completion');
        loading = false;
      }
    }, 10000); // 10 second timeout

    try {
      console.log('Loading execution data for ID:', currentExecutionId);
      const loadedExecution = await logApiService.getExecutionById(currentExecutionId);

      // Preserve RUNNING status if it was already set (e.g., from re-run)
      if (
        execution?.status?.toUpperCase() === 'RUNNING' &&
        loadedExecution?.status?.toUpperCase() === 'PENDING'
      ) {
        execution = { ...loadedExecution, status: 'RUNNING' };
      } else {
        execution = loadedExecution;
      }

      // Log the actual data to see what we're getting
      console.log('Loaded execution data:', $state.snapshot(execution));
      console.log('Metadata:', $state.snapshot(execution?.metadata));
      console.log('Pipeline info check:', {
        pipelineId: execution?.pipelineId,
        pipelineName: execution?.pipelineName,
        needsFetch:
          execution?.pipelineId &&
          (!execution.pipelineName ||
            execution.pipelineName === 'Unknown Pipeline' ||
            execution.pipelineName === '')
      });

      // Fetch actual pipeline name if we have a pipelineId but no pipeline name
      if (
        execution?.pipelineId &&
        (!execution.pipelineName ||
          execution.pipelineName === 'Unknown Pipeline' ||
          execution.pipelineName === '')
      ) {
        try {
          console.log('Fetching pipeline info for ID:', execution.pipelineId);
          const pipelineInfo = await api.functional.pipelines.getPipelineById(
            makeFetch(),
            execution.pipelineId
          );
          console.log('Pipeline info fetched:', pipelineInfo);

          if (pipelineInfo?.pipelineName) {
            _actualPipelineName = pipelineInfo.pipelineName;
            // Update execution object with actual pipeline name
            execution = { ...execution, pipelineName: pipelineInfo.pipelineName };
            console.log('Updated execution with pipeline name:', pipelineInfo.pipelineName);
          }
        } catch (err) {
          console.error('Failed to fetch pipeline info:', err);
        }
      }

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
          const latestLog = apiLogs[apiLogs.length - 1];
          const latestTimestamp = latestLog?.timestamp ? Date.parse(latestLog.timestamp) : NaN;
          if (!Number.isNaN(latestTimestamp)) {
            lastLogReceivedTime = latestTimestamp;
          }
          // Only update phases from logs if execution is completed or not connected to WebSocket
          // For RUNNING executions with WebSocket, phases will be updated in real-time
          const isCompleted = execution?.status === 'SUCCESS' || execution?.status === 'FAILED';
          if (isCompleted) {
            updatePhasesFromLogs(apiLogs);
          }
        } else {
          console.warn('No logs returned from API for execution:', currentExecutionId);
          lastLogReceivedTime = Date.now();

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

      // For mock data, try to fetch pipeline info too
      if (
        execution?.pipelineId &&
        (!execution.pipelineName || execution.pipelineName === 'Unknown Pipeline')
      ) {
        try {
          const pipelineInfo = await api.functional.pipelines.getPipelineById(
            makeFetch(),
            execution.pipelineId
          );
          if (pipelineInfo?.pipelineName) {
            _actualPipelineName = pipelineInfo.pipelineName;
            execution = { ...execution, pipelineName: pipelineInfo.pipelineName };
          }
        } catch (err) {
          console.error('Failed to fetch pipeline info for mock data:', err);
        }
      }
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
    hasMarkedTimeoutFailure = false;
    lastLogReceivedTime = Date.now();
    stopTimeoutCheck();

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

      // Notify parent component about the change (this is a re-run)
      if (onExecutionChange) {
        onExecutionChange(actualExecutionId, true);
      }

      // Don't call onRerunSuccess here - it should only be called
      // after the new execution data is loaded and displayed
      // to avoid closing the modal prematurely

      // Load new execution data and reconnect WebSocket
      await loadExecutionData();
      await setupWebSocket();

      // Now that the new execution is loaded and displayed,
      // notify parent to refresh the execution list
      if (onRerunSuccess) {
        onRerunSuccess();
      }
    } catch (error) {
      console.error('Failed to switch to new execution:', error);
      // Fallback: try using the original ID
      currentExecutionId = buildIdOrExecutionId;
      await loadExecutionData();
      await setupWebSocket();
    }
  }

  // Check for timeout (3 minutes without new logs) - UI indication only
  function startTimeoutCheck() {
    if (timeoutCheckInterval) {
      clearInterval(timeoutCheckInterval);
    }

    hasMarkedTimeoutFailure = false;
    isTimeoutSuspected = false;
    timeoutMessage = null;

    timeoutCheckInterval = setInterval(async () => {
      if (hasMarkedTimeoutFailure) {
        return;
      }

      const normalizedStatus = execution?.status?.toUpperCase();

      // Only track active executions
      if (!execution || !(normalizedStatus === 'RUNNING' || normalizedStatus === 'PENDING')) {
        return;
      }

      const timeSinceLastLog = Date.now() - lastLogReceivedTime;
      const threeMinutesInMs = 3 * 60 * 1000; // 3 minutes

      if (timeSinceLastLog >= threeMinutesInMs && logs.length === 0) {
        // Set UI-only timeout indicator without modifying actual execution status
        isTimeoutSuspected = true;
        const secondsWithoutLogs = Math.floor(timeSinceLastLog / 1000);
        timeoutMessage = `No logs received for ${secondsWithoutLogs} seconds. The execution might have stalled.`;

        console.warn(
          `No logs received for ${secondsWithoutLogs} seconds for execution ${currentExecutionId}.`
        );

        // Mark phases that were running as potentially stalled (UI only)
        phases = phases.map((phase) => {
          if (phase.status === 'running') {
            return {
              ...phase,
              statusMetadata: {
                ...phase.statusMetadata,
                source: 'timeout',
                lastUpdateReason: 'Possible timeout - no logs received',
                updatedAt: new Date().toISOString()
              }
            };
          }
          return phase;
        });

        // Only mark as failure in backend if we're absolutely sure
        if (timeSinceLastLog >= 5 * 60 * 1000 && !hasMarkedTimeoutFailure) {
          hasMarkedTimeoutFailure = true;

          const failureMetadata: Record<string, unknown> = {
            failureReason: 'no_logs_timeout',
            timeoutDurationMs: timeSinceLastLog
          };

          if (Number.isFinite(lastLogReceivedTime)) {
            failureMetadata.lastLogReceivedAt = new Date(lastLogReceivedTime).toISOString();
          }

          try {
            await logApiService.updateExecutionStatus(currentExecutionId, 'FAILED', {
              completedAt: new Date().toISOString(),
              errorMessage:
                'Automatically marked as failed after no logs were received for 5 minutes.',
              metadata: failureMetadata
            });
          } catch (error) {
            console.error('Failed to persist timeout failure status:', error);
          }
        }
      } else if (timeSinceLastLog < threeMinutesInMs && isTimeoutSuspected) {
        // Clear timeout suspicion if we start receiving logs again
        isTimeoutSuspected = false;
        timeoutMessage = null;

        // Clear timeout indicators from phases
        phases = phases.map((phase) => {
          if (phase.statusMetadata?.source === 'timeout') {
            return {
              ...phase,
              statusMetadata: {
                ...phase.statusMetadata,
                source: 'log_parsing',
                lastUpdateReason: 'Logs resumed',
                updatedAt: new Date().toISOString()
              }
            };
          }
          return phase;
        });
      }
    }, 10000); // Check every 10 seconds
  }

  function stopTimeoutCheck() {
    if (timeoutCheckInterval) {
      clearInterval(timeoutCheckInterval);
      timeoutCheckInterval = null;
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

    // Start timeout check when setting up WebSocket
    startTimeoutCheck();

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
            // For real-time logs, only update phases incrementally from new logs
            const newLogs = value.slice(logs.length); // Get only new logs
            logs = value;
            // Update last log received time when we get new logs
            const latestLog =
              newLogs.length > 0 ? newLogs[newLogs.length - 1] : value[value.length - 1];
            const parsedTimestamp = latestLog?.timestamp ? Date.parse(latestLog.timestamp) : NaN;
            lastLogReceivedTime = Number.isNaN(parsedTimestamp) ? Date.now() : parsedTimestamp;

            // Extract phase information from NEW log messages only for real-time updates
            if (newLogs.length > 0) {
              updatePhasesFromLogs(value, true); // Pass true to indicate real-time update
            }
          } else if (value.length === 0 && logs.length === 0) {
            // Only set empty logs if we don't have any logs from API either
            console.log('No logs from WebSocket and no existing logs');
          }
        })
      );

      unsubscribers.push(
        wsService.phases.subscribe((value) => {
          if (value.length > 0) {
            // Normalize and enrich phases from WebSocket
            phases = value.map((phase) => ({
              ...phase,
              // Ensure status is lowercase
              status: (phase.status?.toLowerCase() || 'pending') as PhaseStatus,
              // Add metadata if not present
              statusMetadata: phase.statusMetadata || {
                source: 'websocket',
                lastUpdateReason: 'Phase updated from server',
                updatedAt: new Date().toISOString()
              }
            }));

            // Clear timeout suspicion if we're getting phase updates
            if (isTimeoutSuspected && value.some((p) => p.status === 'running')) {
              isTimeoutSuspected = false;
              timeoutMessage = null;
            }
          }
        })
      );

      unsubscribers.push(
        wsService.status.subscribe((value) => {
          // Normalize status to uppercase first, keep existing status if no value
          const normalizedStatus = (value?.toUpperCase() ||
            execution?.status?.toUpperCase() ||
            'PENDING') as ExecutionStatus;

          if (execution && normalizedStatus) {
            // Only update if we have a valid status
            const now = new Date().toISOString();

            // Don't allow status to go backwards (e.g., from RUNNING to PENDING)
            const currentStatus = execution.status?.toUpperCase() as ExecutionStatus | undefined;
            const isGoingBackwards =
              (currentStatus === 'RUNNING' && normalizedStatus === 'PENDING') ||
              (currentStatus === 'SUCCESS' &&
                (normalizedStatus === 'RUNNING' || normalizedStatus === 'PENDING')) ||
              (currentStatus === 'FAILED' &&
                (normalizedStatus === 'RUNNING' || normalizedStatus === 'PENDING'));

            if (!isGoingBackwards) {
              execution = {
                ...execution,
                status: normalizedStatus,
                // Update completedAt when status changes to completed
                completedAt:
                  normalizedStatus === 'SUCCESS' ||
                  normalizedStatus === 'SUCCEEDED' ||
                  normalizedStatus === 'FAILED' ||
                  normalizedStatus === 'CANCELLED'
                    ? now
                    : execution.completedAt
              };
            }

            // Calculate duration if completed
            if (execution.completedAt && execution.startedAt && !execution.duration) {
              const start = new Date(execution.startedAt).getTime();
              const end = new Date(execution.completedAt).getTime();
              execution.duration = Math.floor((end - start) / 1000);
            }

            // Clear timeout suspicion on successful completion
            if (
              (normalizedStatus === 'SUCCESS' || normalizedStatus === 'SUCCEEDED') &&
              isTimeoutSuspected
            ) {
              isTimeoutSuspected = false;
              timeoutMessage = null;
            }

            // Refresh data when status changes from RUNNING to SUCCESS/FAILED
            if (
              currentStatus === 'RUNNING' &&
              (normalizedStatus === 'SUCCESS' ||
                normalizedStatus === 'SUCCEEDED' ||
                normalizedStatus === 'FAILED')
            ) {
              // Delay to ensure all final logs are received
              setTimeout(async () => {
                // Reload execution data to get final state
                await loadExecutionData();

                // Double check we have complete data
                if (logs.length === 0) {
                  console.warn('No logs after completion, reloading...');
                  await loadExecutionData();
                }

                // Disconnect WebSocket after data is loaded
                if (wsService) {
                  console.log('Disconnecting WebSocket after completion');
                  wsService.disconnect();
                  wsService = null;
                }
              }, 1000); // Give 1 second for final logs to arrive
            }
          }

          // Smart phase status normalization based on execution result
          if (normalizedStatus === 'SUCCESS' || normalizedStatus === 'SUCCEEDED') {
            phases = phases.map((p) => {
              // Only keep phases as 'failed' if they have explicit failure reasons
              if (p.status === 'failed' && p.statusMetadata?.failureReason) {
                // Keep failed status but add a note that execution succeeded anyway
                return {
                  ...p,
                  statusMetadata: {
                    ...p.statusMetadata,
                    lastUpdateReason: 'Execution succeeded despite phase failure',
                    updatedAt: new Date().toISOString()
                  }
                };
              }

              // Mark all non-explicitly-failed phases as completed
              if (p.status !== 'completed') {
                return {
                  ...p,
                  status: 'completed',
                  endTime: p.endTime || new Date().toISOString(),
                  progress: 100,
                  statusMetadata: {
                    ...p.statusMetadata,
                    source: 'websocket',
                    lastUpdateReason: p.statusMetadata?.hasExplicitCompletion
                      ? 'Phase completed successfully'
                      : 'Phase inferred as completed (execution succeeded)',
                    updatedAt: new Date().toISOString()
                  }
                };
              }

              return {
                ...p,
                endTime: p.endTime || new Date().toISOString(),
                progress: 100
              };
            });

            // Explicitly mark FINALIZING as completed
            const finalizingIdx = phases.findIndex((p) => p.name === 'FINALIZING');
            if (finalizingIdx >= 0 && phases[finalizingIdx].status !== 'completed') {
              phases[finalizingIdx].status = 'completed';
              phases[finalizingIdx].progress = 100;
              phases[finalizingIdx].statusMetadata = {
                ...phases[finalizingIdx].statusMetadata,
                source: 'websocket',
                lastUpdateReason: 'FINALIZING phase completed (execution succeeded)',
                hasExplicitCompletion: true,
                updatedAt: new Date().toISOString()
              };
            }
          } else if (normalizedStatus === 'FAILED') {
            phases = phases.map((p) => {
              // If already completed or failed, keep the status
              if (p.status === 'completed' || p.status === 'failed') {
                return p;
              }

              // Mark running/pending phases as failed
              return {
                ...p,
                status: 'failed',
                endTime: p.endTime || new Date().toISOString(),
                statusMetadata: {
                  ...p.statusMetadata,
                  source: 'websocket',
                  lastUpdateReason: 'Phase marked as failed (execution failed)',
                  failureReason: 'Execution failed',
                  updatedAt: new Date().toISOString()
                }
              };
            });
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
    // Use the scroll position passed from parent (or fallback to current)
    const scrollY = initialScrollPosition?.y ?? window.scrollY;
    const scrollX = initialScrollPosition?.x ?? window.scrollX;

    // Prevent body scroll when drawer is open
    if (typeof document !== 'undefined') {
      // Store current scroll position
      document.body.dataset.scrollY = String(scrollY);
      document.body.dataset.scrollX = String(scrollX);

      // Save original body overflow
      document.body.dataset.originalOverflow = document.body.style.overflow || '';
      document.body.dataset.originalPosition = document.body.style.position || '';
      document.body.dataset.originalTop = document.body.style.top || '';
      document.body.dataset.originalLeft = document.body.style.left || '';
      document.body.dataset.originalWidth = document.body.style.width || '';

      scrollLockState = {
        scrollY,
        scrollX,
        originalOverflow: document.body.dataset.originalOverflow || '',
        originalPosition: document.body.dataset.originalPosition || '',
        originalTop: document.body.dataset.originalTop || '',
        originalLeft: document.body.dataset.originalLeft || '',
        originalWidth: document.body.dataset.originalWidth || ''
      };

      // Lock body in place to prevent visible scroll jumps
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = `-${scrollX}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      // Ensure the page doesn't jump by maintaining scroll position
      // This is a workaround for some browsers that reset scroll on overflow hidden
      requestAnimationFrame(() => {
        if (window.scrollY !== scrollY) {
          window.scrollTo(scrollX, scrollY);
        }
      });
    }

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
    if (!isScrollRestoreHandled) {
      restoreBodyScroll();
    }

    // Clear navigation timeout
    if (navigationTimeout) {
      clearTimeout(navigationTimeout);
      navigationTimeout = null;
    }

    // Stop timeout check
    stopTimeoutCheck();

    // Unsubscribe from all stores
    unsubscribers.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error unsubscribing:', err);
      }
    });
    unsubscribers = [];

    if (wsService) {
      try {
        wsService.disconnect();
      } catch (err) {
        console.error('Error disconnecting WebSocket:', err);
      }
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

  // React to prop changes and reload data when executionId changes
  $effect(() => {
    if (executionId !== currentExecutionId) {
      const previousId = currentExecutionId;
      console.log('Execution ID changed from', currentExecutionId, 'to', executionId);
      currentExecutionId = executionId;

      // Only set loading if this is an actual navigation (not initial load)
      // and the ID actually changed
      if (previousId && previousId !== executionId) {
        loading = true;
      }

      // Clear current data and reload for new execution
      logs = [];
      phases = [];
      execution = null;
      hasMarkedTimeoutFailure = false;
      lastLogReceivedTime = Date.now();
      stopTimeoutCheck();

      // Disconnect from current WebSocket if connected
      if (wsService) {
        wsService.disconnect();
        wsService = null;
      }

      // Load new execution data
      loadExecutionData().then(() => {
        // Setup WebSocket for active executions
        const normalizedStatus = execution?.status?.toUpperCase();
        if (
          execution &&
          normalizedStatus !== 'SUCCESS' &&
          normalizedStatus !== 'FAILED' &&
          normalizedStatus !== 'SUCCEEDED' &&
          normalizedStatus !== 'COMPLETED' &&
          normalizedStatus !== 'CANCELLED'
        ) {
          setupWebSocket();
        }
      });
    }
  });

  // Monitor execution status changes and reconnect WebSocket if needed
  $effect(() => {
    if (execution && !loading && !isSettingUpWebSocket) {
      // Check if we need to setup WebSocket for active executions
      const normalizedStatus = execution?.status?.toUpperCase();

      // If execution is completed, stop timeout check
      if (
        normalizedStatus === 'SUCCESS' ||
        normalizedStatus === 'FAILED' ||
        normalizedStatus === 'SUCCEEDED' ||
        normalizedStatus === 'COMPLETED' ||
        normalizedStatus === 'CANCELLED'
      ) {
        stopTimeoutCheck();
      } else if (!wsService && !isSettingUpWebSocket) {
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

  // Keyboard navigation for log entries
  let currentLogIndex = $state(0);
  let totalLogs = $state(0);

  // Navigation state to prevent rapid execution changes
  let isNavigating = $state(false);
  let navigationTimeout: ReturnType<typeof setTimeout> | null = null;

  // Update total logs count when logs change
  $effect(() => {
    if (logs && logs.length > 0) {
      totalLogs = logs.length;
    }
  });

  // Navigate with debounce to prevent rapid changes
  function navigateWithDebounce(direction: 'prev' | 'next') {
    if (isNavigating || !onNavigate || loading) return;

    console.log(`[LogDrawer] Navigation requested: ${direction}`);

    // Store current execution ID before navigation
    const currentId = currentExecutionId;

    // Mark as navigating to prevent rapid clicks
    isNavigating = true;

    // Call the navigation function
    onNavigate(direction);

    // Only set loading if the execution ID actually changed
    // This will be handled by the reactive effect watching currentExecutionId

    // Clear any existing timeout
    if (navigationTimeout) {
      clearTimeout(navigationTimeout);
    }

    // Reset navigation state after delay
    navigationTimeout = setTimeout(() => {
      isNavigating = false;
      navigationTimeout = null;

      // Check if navigation actually happened
      if (currentId === currentExecutionId) {
        // Navigation didn't happen (we're at boundary)
        console.log(`[LogDrawer] Navigation blocked - at boundary for ${direction}`);
        loading = false;
      }
    }, 300); // 300ms debounce
  }

  // Keyboard event handler
  function handleKeyDown(event: KeyboardEvent) {
    // Navigate between executions with Shift+Arrow keys (with debounce)
    if (event.shiftKey && event.key === 'ArrowUp' && onNavigate) {
      event.preventDefault();
      navigateWithDebounce('prev');
    } else if (event.shiftKey && event.key === 'ArrowDown' && onNavigate) {
      event.preventDefault();
      navigateWithDebounce('next');
    }
    // Navigate through logs with arrow keys (without Shift)
    else if (event.key === 'ArrowUp' && !event.shiftKey) {
      event.preventDefault();
      if (currentLogIndex > 0) {
        currentLogIndex--;
        scrollToLog(currentLogIndex);
      }
    } else if (event.key === 'ArrowDown' && !event.shiftKey) {
      event.preventDefault();
      if (currentLogIndex < totalLogs - 1) {
        currentLogIndex++;
        scrollToLog(currentLogIndex);
      }
    } else if (event.key === 'Home') {
      event.preventDefault();
      currentLogIndex = 0;
      scrollToLog(currentLogIndex);
    } else if (event.key === 'End') {
      event.preventDefault();
      currentLogIndex = totalLogs - 1;
      scrollToLog(currentLogIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      const state = getScrollLockState();
      const runClose = () => closeDrawerWithDeferredRestore(state);
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(runClose);
      } else {
        setTimeout(runClose, 0);
      }
    }
  }

  type ScrollLockState = {
    scrollY: number;
    scrollX: number;
    originalOverflow: string;
    originalPosition: string;
    originalTop: string;
    originalLeft: string;
    originalWidth: string;
  };

  function getScrollLockState(): ScrollLockState | null {
    if (scrollLockState) {
      return scrollLockState;
    }

    if (typeof document === 'undefined') {
      return null;
    }

    const scrollY =
      Number.parseInt(
        document.body.dataset.scrollY ?? `${typeof window !== 'undefined' ? window.scrollY : 0}`,
        10
      ) || 0;
    const scrollX =
      Number.parseInt(
        document.body.dataset.scrollX ?? `${typeof window !== 'undefined' ? window.scrollX : 0}`,
        10
      ) || 0;
    const originalOverflow = document.body.dataset.originalOverflow || '';
    const originalPosition = document.body.dataset.originalPosition || '';
    const originalTop = document.body.dataset.originalTop || '';
    const originalLeft = document.body.dataset.originalLeft || '';
    const originalWidth = document.body.dataset.originalWidth || '';

    scrollLockState = {
      scrollY,
      scrollX,
      originalOverflow,
      originalPosition,
      originalTop,
      originalLeft,
      originalWidth
    };
    return scrollLockState;
  }

  function restoreBodyScroll(
    state?: ScrollLockState | null,
    options: { immediate?: boolean } = {}
  ) {
    if (typeof document === 'undefined') {
      return;
    }

    const targetState = state ?? getScrollLockState();
    if (!targetState) {
      return;
    }

    const applyRestore = () => {
      document.body.style.position = targetState.originalPosition || '';
      document.body.style.top = targetState.originalTop || '';
      document.body.style.left = targetState.originalLeft || '';
      document.body.style.width = targetState.originalWidth || '';
      document.body.style.overflow = targetState.originalOverflow || '';

      if (typeof window !== 'undefined') {
        const { scrollX: targetX, scrollY: targetY } = targetState;
        window.scrollTo(targetX, targetY);
      }

      delete document.body.dataset.scrollY;
      delete document.body.dataset.scrollX;
      delete document.body.dataset.originalOverflow;
      delete document.body.dataset.originalPosition;
      delete document.body.dataset.originalTop;
      delete document.body.dataset.originalLeft;
      delete document.body.dataset.originalWidth;
      scrollLockState = null;
    };

    if (options.immediate) {
      applyRestore();
    } else if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(applyRestore);
    } else {
      setTimeout(applyRestore, 16);
    }
  }

  function _closeDrawerWithImmediateRestore(state = getScrollLockState()) {
    if (isScrollRestoreHandled) {
      return;
    }

    isScrollRestoreHandled = true;
    restoreBodyScroll(state, { immediate: true });
    closeDrawerCallback();
  }

  function closeDrawerWithDeferredRestore(state = getScrollLockState()) {
    if (isScrollRestoreHandled) {
      return;
    }

    isScrollRestoreHandled = true;
    closeDrawerCallback();

    const scheduleRestore = () => restoreBodyScroll(state, { immediate: true });
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(scheduleRestore);
    } else {
      setTimeout(scheduleRestore, 0);
    }
  }

  // Scroll to specific log entry
  function scrollToLog(index: number) {
    const logsTabElement = document.querySelector('[data-logs-tab]');
    if (logsTabElement) {
      const logElements = logsTabElement.querySelectorAll('[data-log-entry]');
      if (logElements[index]) {
        // Remove previous highlights
        logElements.forEach((el) => {
          el.classList.remove('bg-blue-100', 'border-l-4', 'border-blue-500', 'pl-3');
        });

        // Add highlight to current log
        const element = logElements[index] as HTMLElement;
        element.classList.add('bg-blue-100', 'border-l-4', 'border-blue-500', 'pl-3');

        // Scroll into view with better positioning
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'start'
        });

        // Focus for accessibility
        element.focus({ preventScroll: true });
      }
    }
  }

  // Add keyboard listener when drawer is open
  $effect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  });
</script>

<!-- Backdrop -->
<button
  class="fixed inset-0 z-40 cursor-pointer bg-black/40 backdrop-blur-md"
  transition:fade={{ duration: 200 }}
  onclick={(e) => {
    e.stopPropagation();
    closeDrawerWithDeferredRestore();
  }}
  aria-label="Close drawer"
  tabindex="-1"
  type="button"
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
      <!-- Header -->
      {#if loading}
        <div class="flex justify-center p-6">
          <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      {:else if execution}
        <DrawerHeader
          {execution}
          {phases}
          {isConnected}
          {isNavigating}
          {isTimeoutSuspected}
          {timeoutMessage}
          onRerun={() => execution && handleRerun(execution)}
          onEdit={() =>
            execution?.pipelineId &&
            goto(`/projects/${projectId}/pipelines/${execution.pipelineId}`)}
          onClose={closeDrawerWithDeferredRestore}
          {onNavigate}
        />

        <!-- Simple Phase Status Indicator -->
        {#if phases && phases.length > 0}
          {@const validPhases = phases.filter((p) => p.name && p.name !== '')}
          {#if validPhases.length > 0}
            <div class="border-b border-gray-200 bg-gray-50/50 px-6 py-2">
              <div class="flex items-center gap-2 text-xs">
                <span class="font-medium text-gray-600">Phases:</span>
                <div class="flex items-center gap-1">
                  {#each validPhases as phase}
                    <button
                      type="button"
                      class="flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 transition-colors {phase.status ===
                      'completed'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : phase.status === 'running'
                          ? 'animate-pulse bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : phase.status === 'failed'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}"
                      onclick={() => {
                        const index = validPhases.indexOf(phase);
                        logsTabRef?.scrollToPhaseIndex?.(index);
                      }}
                      title={phase.name}
                    >
                      {#if phase.status === 'completed'}
                        <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fill-rule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      {:else if phase.status === 'running'}
                        <svg class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"
                          ></circle>
                          <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      {:else if phase.status === 'failed'}
                        <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fill-rule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      {:else}
                        <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <circle cx="10" cy="10" r="3" />
                        </svg>
                      {/if}
                      <span class="font-medium">{phase.name.replace(/_/g, ' ')}</span>
                    </button>
                  {/each}
                </div>
                <span class="ml-auto text-gray-500">
                  {validPhases.filter((p) => p.status === 'completed').length}/{validPhases.length}
                </span>
              </div>
            </div>
          {/if}
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
