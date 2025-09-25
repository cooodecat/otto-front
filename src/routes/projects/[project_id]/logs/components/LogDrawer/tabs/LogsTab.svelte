<script lang="ts">
  import type { PhaseInfo, LogEntry, ExecutionStatus } from '$lib/types/log.types';
  import type { LogWebSocketService } from '$lib/services/log-websocket.service';
  import { untrack } from 'svelte';
  import {
    Download,
    Loader2,
    ChevronDown,
    ChevronUp,
    Search,
    Copy,
    Terminal,
    Layers,
    RefreshCw
  } from 'lucide-svelte';
  import LogGroup from '../LogGroup.svelte';

  interface Props {
    executionId: string;
    executionStatus?: ExecutionStatus;
    phases: PhaseInfo[];
    logs?: LogEntry[];
    wsService?: LogWebSocketService | null;
    isLoading?: boolean;
    executionStartedAt?: string;
    onRerun?: () => void;
  }

  let {
    executionId,
    executionStatus: initialExecutionStatus,
    phases: _phases,
    logs = [],
    wsService,
    isLoading = false,
    executionStartedAt,
    onRerun
  }: Props = $props();

  // Track the current execution status
  let executionStatus = $state<ExecutionStatus | null>(initialExecutionStatus || null);

  // Compute initial state based on status
  const computeInitialStates = (status: ExecutionStatus | undefined) => {
    // Normalize status to uppercase for comparison
    const normalizedStatus = status?.toUpperCase();
    const isCompleted =
      normalizedStatus === 'SUCCESS' ||
      normalizedStatus === 'FAILED' ||
      normalizedStatus === 'SUCCEEDED' ||
      normalizedStatus === 'COMPLETED';
    const isRunning = normalizedStatus === 'RUNNING' || normalizedStatus === 'PENDING';

    return {
      autoScroll: isRunning && !isCompleted,
      showGrouped: isCompleted || !isRunning,
      isLiveMode: isRunning && !isCompleted
    };
  };

  // Set initial view states
  const initial = computeInitialStates(initialExecutionStatus);
  let autoScroll = $state(initial.autoScroll);
  let showGrouped = $state(initial.showGrouped);
  let allExpanded = $state(false);
  let isLiveMode = $state(initial.isLiveMode);
  let logContainer = $state<HTMLDivElement>(); // terminal view container
  let scrollArea = $state<HTMLDivElement>(); // shared scrollable content area (grouped/terminal wrapper)
  let scrollTargetIndex = $state<number | null>(null); // target group to expand/scroll
  let searchQuery = $state('');
  let selectedLevel = $state<'all' | 'error' | 'warning' | 'info'>('all');

  // Stable global line numbering (arrival order) - use Map instead of WeakMap for better stability
  let lineNumberMap: Map<string, number> = new Map();
  let _lineSeqCounter = $state(0); // Kept for line numbering logic

  // Debug log count
  $effect(() => {
    console.log('LogsTab - logs length:', logs?.length || 0);
  });

  // Track if WebSocket has taken control
  let wsControlled = $state(false);
  // Track last processed status to prevent loops
  let lastProcessedStatus = $state<string | undefined>(undefined);

  const STATUS_PRIORITY: Record<string, number> = {
    PENDING: 0,
    RUNNING: 1,
    SUCCESS: 2,
    SUCCEEDED: 2,
    COMPLETED: 2,
    FAILED: 2,
    CANCELLED: 2
  };

  function getStatusPriority(status?: string | null): number {
    if (!status) return -1;
    return STATUS_PRIORITY[status] ?? -1;
  }

  // Update execution status when prop changes (only if WebSocket hasn't taken control)
  $effect(() => {
    // Skip if WebSocket is controlling the status
    if (wsControlled) {
      return;
    }

    // Normalize the status for comparison
    const normalizedInitial = initialExecutionStatus?.toUpperCase();

    // Skip if this is the same status we just processed
    if (normalizedInitial === lastProcessedStatus) {
      return;
    }

    console.log(
      'LogsTab - prop update - initialExecutionStatus:',
      initialExecutionStatus,
      'current executionStatus:',
      $state.snapshot(executionStatus),
      'wsControlled:',
      wsControlled
    );

    // normalizedInitial is already declared above
    const normalizedCurrent = executionStatus?.toUpperCase();

    // Only update if prop actually changed AND WebSocket isn't controlling
    if (normalizedInitial !== normalizedCurrent) {
      const previousStatus = executionStatus;
      untrack(() => {
        executionStatus = initialExecutionStatus || null;
        lastProcessedStatus = normalizedInitial;
      });

      // Normalize statuses for checking
      const normalizedPrevious = previousStatus?.toUpperCase();
      const normalizedNew = executionStatus?.toUpperCase();

      // Determine if we should update the view
      // Check if the execution was already completed
      // This is currently unused but may be needed for future state management
      const _wasCompleted =
        normalizedPrevious === 'SUCCESS' ||
        normalizedPrevious === 'FAILED' ||
        normalizedPrevious === 'SUCCEEDED' ||
        normalizedPrevious === 'COMPLETED';
      const isNowCompleted =
        normalizedNew === 'SUCCESS' ||
        normalizedNew === 'FAILED' ||
        normalizedNew === 'SUCCEEDED' ||
        normalizedNew === 'COMPLETED';
      const isNowRunning = normalizedNew === 'RUNNING' || normalizedNew === 'PENDING';

      // Update view based on new status
      if (isNowCompleted) {
        console.log('LogsTab - Status is completed:', $state.snapshot(executionStatus));
        untrack(() => {
          isLiveMode = false;
          showGrouped = true;
          autoScroll = false;
        });
      } else if (isNowRunning) {
        console.log('LogsTab - Status is running:', $state.snapshot(executionStatus));
        untrack(() => {
          isLiveMode = true;
          showGrouped = false;
          autoScroll = true;
        });
      }
    }
  });

  // Subscribe to execution status from WebSocket service
  $effect(() => {
    if (!wsService) return;

    const unsub = wsService.status.subscribe((v) => {
      // Normalize the incoming status
      const normalizedV = v?.toUpperCase();
      const normalizedCurrent = executionStatus?.toUpperCase();

      // Skip if status hasn't actually changed or if we just processed this
      if (normalizedV === normalizedCurrent || normalizedV === lastProcessedStatus) {
        return;
      }

      // Prevent backwards transitions (e.g. RUNNING -> PENDING)
      const currentPriority = getStatusPriority(normalizedCurrent);
      const nextPriority = getStatusPriority(normalizedV);
      if (nextPriority < currentPriority) {
        console.warn(
          'WebSocket status update ignored due to lower priority:',
          v,
          'current:',
          $state.snapshot(executionStatus)
        );
        return;
      }

      console.log(
        'LogsTab - WebSocket status update:',
        v,
        'current:',
        $state.snapshot(executionStatus)
      );

      const previousStatus = executionStatus;

      // Normalize previous status for comparison
      const normalizedPrevious = previousStatus?.toUpperCase();

      // Never allow status to go backwards from completed to running
      const wasCompleted =
        normalizedPrevious === 'SUCCESS' ||
        normalizedPrevious === 'FAILED' ||
        normalizedPrevious === 'SUCCEEDED' ||
        normalizedPrevious === 'COMPLETED';
      const isNowRunning = normalizedV === 'RUNNING' || normalizedV === 'PENDING';
      const isNowCompleted =
        normalizedV === 'SUCCESS' ||
        normalizedV === 'FAILED' ||
        normalizedV === 'SUCCEEDED' ||
        normalizedV === 'COMPLETED';

      if (wasCompleted && isNowRunning) {
        console.warn(
          'WebSocket trying to change status from',
          previousStatus,
          'to',
          v,
          '- ignoring'
        );
        return; // Ignore backwards transition
      }

      // Mark that WebSocket has taken control
      untrack(() => {
        wsControlled = true;
        executionStatus = v;
        lastProcessedStatus = normalizedV;
      });

      // Update views based on new status
      if (isNowRunning) {
        // Enable live mode for running executions
        untrack(() => {
          isLiveMode = true;
          showGrouped = false;
          autoScroll = true;
        });
      } else if (isNowCompleted) {
        // When execution completes, switch to grouped view
        untrack(() => {
          isLiveMode = false;
          showGrouped = true;
          autoScroll = false;
        });
        // Release WebSocket control when completed
        untrack(() => {
          wsControlled = false;
        });
      }
    });

    return () => {
      untrack(() => {
        wsControlled = false;
      });
      unsub();
    };
  });

  // Reset line numbering when execution changes
  $effect(() => {
    // Using executionId as reset trigger
    void executionId;
    console.log('LogsTab - Execution changed, resetting line numbering');
    lineNumberMap = new Map();
    _lineSeqCounter = 0;
  });

  // Check if execution is stuck or failed
  function shouldShowRerun(): boolean {
    // Normalize status for comparison
    const normalizedStatus = executionStatus?.toUpperCase();

    // Always show for failed executions
    if (normalizedStatus === 'FAILED') return true;

    // Show for RUNNING/PENDING with no logs
    if ((normalizedStatus === 'RUNNING' || normalizedStatus === 'PENDING') && logs.length === 0) {
      // Check if it's been running for more than 5 minutes
      if (executionStartedAt) {
        const startTime = new Date(executionStartedAt).getTime();
        const minutesSinceStart = (Date.now() - startTime) / (1000 * 60);
        console.log(
          'Execution has been running for',
          minutesSinceStart.toFixed(1),
          'minutes with no logs'
        );
        return minutesSinceStart > 5; // Show Re-run after 5 minutes with no logs
      }
      return true; // No logs and no start time means probably stuck
    }

    return false;
  }

  function handleRerun() {
    if (onRerun) {
      onRerun();
    } else {
      console.warn('Re-run handler not provided');
    }
  }

  // Assign sequence numbers as logs arrive (keep existing numbers)
  $effect(() => {
    if (!Array.isArray(logs)) return;
    let counter = 0;
    for (const l of logs) {
      // Create a unique key for each log entry
      const key = `${l.timestamp}-${l.message}`;
      if (!lineNumberMap.has(key)) {
        lineNumberMap.set(key, ++counter);
      } else {
        counter = lineNumberMap.get(key)!;
      }
    }
    _lineSeqCounter = counter;
  });

  function getGlobalLineNumber(l: LogEntry): number {
    // Create the same key format to look up the line number
    const key = `${l.timestamp}-${l.message}`;
    const num = lineNumberMap.get(key);
    // Debug logging removed as it's too verbose
    return num || 0;
  }

  // Phase normalization helpers
  const PHASE_MAP: Record<string, string> = {
    PREPARING: 'DOWNLOAD_SOURCE',
    DOWNLOADING: 'DOWNLOAD_SOURCE',
    DOWNLOAD_SOURCE: 'DOWNLOAD_SOURCE',
    INSTALL: 'INSTALL',
    PRE_BUILD: 'PRE_BUILD',
    BUILDING: 'BUILD',
    BUILD: 'BUILD',
    POST_BUILD: 'POST_BUILD',
    UPLOAD: 'UPLOAD_ARTIFACTS',
    UPLOAD_ARTIFACTS: 'UPLOAD_ARTIFACTS',
    FINALIZING: 'FINALIZING',
    OTHER: 'OTHER'
  };
  const PHASE_ORDER = [
    'DOWNLOAD_SOURCE',
    'INSTALL',
    'PRE_BUILD',
    'BUILD',
    'POST_BUILD',
    'UPLOAD_ARTIFACTS',
    'FINALIZING',
    'OTHER'
  ];
  function normalizePhaseName(name?: string): string {
    if (!name) return 'OTHER';
    const key = String(name).toUpperCase();
    return PHASE_MAP[key] || key || 'OTHER';
  }

  // Map to store normalized data without creating new objects
  const normalizedDataMap = new WeakMap<LogEntry, { phase: string; step: string }>();

  // Normalize logs: sort + backfill missing phase/step; reset on markers
  const normalizedLogs = $derived.by(() => {
    const sorted = [...logs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    let currentPhase: string | undefined = undefined;
    let currentStep: string | undefined = undefined;

    // Process logs to determine normalized phase and step
    sorted.forEach((l) => {
      const msg = l.message || '';
      const phaseEnter = msg.match(/Entering phase\s+([A-Z_]+)/i);
      const phaseComplete = msg.match(/Phase complete:?\s*([A-Z_]+)/i);
      if (phaseEnter?.[1]) currentPhase = normalizePhaseName(phaseEnter[1]);
      if (phaseComplete?.[1]) currentPhase = normalizePhaseName(phaseComplete[1]);

      if (l.phase) currentPhase = normalizePhaseName(l.phase);
      const finalPhase = normalizePhaseName(l.phase || currentPhase || 'OTHER');

      if (/Running command/i.test(msg)) currentStep = 'Command';
      else if (/Downloading|Installing/i.test(msg)) currentStep = 'Setup';
      if (l.step) currentStep = l.step;
      const finalStep = l.step || currentStep || 'General';

      // Store normalized data in WeakMap
      normalizedDataMap.set(l, { phase: finalPhase, step: finalStep });
    });

    return sorted;
  });

  // Helper to get normalized phase/step
  function getNormalizedData(log: LogEntry): { phase: string; step: string } {
    return normalizedDataMap.get(log) || { phase: 'OTHER', step: 'General' };
  }

  // Filter logs based on search and level
  const filteredLogs = $derived.by(() => {
    let filtered = normalizedLogs;

    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter((log) => log.level === selectedLevel);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((log) => {
        const msg = (log.message || '').toLowerCase();
        const { phase, step } = getNormalizedData(log);
        return (
          msg.includes(query) ||
          phase.toLowerCase().includes(query) ||
          step.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  });

  // Group logs by phase
  const logsByPhase = $derived.by(() => {
    const groups = new Map<string, LogEntry[]>();

    // Initialize with canonical phases
    const knownPhases = [
      'DOWNLOAD_SOURCE',
      'INSTALL',
      'PRE_BUILD',
      'BUILD',
      'POST_BUILD',
      'UPLOAD_ARTIFACTS',
      'FINALIZING',
      'OTHER'
    ];

    knownPhases.forEach((phase) => {
      groups.set(phase, []);
    });

    // Group filtered logs using normalized phase from WeakMap
    filteredLogs.forEach((log) => {
      const { phase } = getNormalizedData(log);
      if (!groups.has(phase)) {
        groups.set(phase, []);
      }
      groups.get(phase)!.push(log);
    });

    // Filter out empty phases and sort with canonical order then time
    return Array.from(groups.entries())
      .filter(([_, logs]) => logs.length > 0)
      .sort((a, b) => {
        const order = typeof PHASE_ORDER !== 'undefined' ? PHASE_ORDER : knownPhases;
        const idxA = order.indexOf(a[0]);
        const idxB = order.indexOf(b[0]);
        if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;
        const tA = new Date(a[1][0]?.timestamp || 0).getTime();
        const tB = new Date(b[1][0]?.timestamp || 0).getTime();
        return tA - tB;
      });
  });

  // Get phase status with context of subsequent phases
  function getPhaseStatusAt(
    index: number,
    phase: string,
    phaseLogs: LogEntry[]
  ): 'pending' | 'running' | 'success' | 'failed' {
    if (phaseLogs.length === 0) return 'pending';

    const hasError = phaseLogs.some((l) => l.level === 'error');
    if (hasError) return 'failed';

    // If overall execution succeeded, consider phases successful by definition
    if (executionStatus === 'SUCCESS') return 'success';

    // Treat OTHER as non-blocking: if there are real phases present, don't let OTHER hold "running"
    if (phase === 'OTHER') {
      const completed = phaseLogs.some((l) =>
        /Phase complete|Succeeded|Execution complete|Finished/i.test(l.message)
      );
      if (completed) return 'success';
      const hasRealPhases = logsByPhase.some(
        ([p, logs]) => p !== 'OTHER' && logs && logs.length > 0
      );
      return hasRealPhases ? 'success' : 'running';
    }

    // Explicit completion markers inside this phase
    const completed = phaseLogs.some((l) => /Phase complete|Succeeded/i.test(l.message));
    if (completed) return 'success';

    // Implicit completion: if any later phase has logs, this one must be done
    for (let i = index + 1; i < logsByPhase.length; i++) {
      const [, laterLogs] = logsByPhase[i];
      if (laterLogs && laterLogs.length > 0) return 'success';
    }

    // Otherwise treat as running
    return 'running';
  }

  function downloadLogs() {
    const logText = filteredLogs
      .map((log) => {
        const { phase } = getNormalizedData(log);
        return `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level.toUpperCase()}] ${phase ? `[${phase}]` : ''} ${log.message}`;
      })
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
      .map((log) => {
        const { phase } = getNormalizedData(log);
        return `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level.toUpperCase()}] ${phase ? `[${phase}]` : ''} ${log.message}`;
      })
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

  // Auto-scroll with smooth animation and smart pause
  let previousLogCount = $state(0);
  let isUserScrolling = $state(false);
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  let newLogIndicator = $state(false);
  let lastNewLogTime = $state(0);

  $effect(() => {
    // Check if new logs were added
    if (logs.length > previousLogCount) {
      const _newLogsCount = logs.length - previousLogCount; // Currently unused, kept for future use
      previousLogCount = logs.length;
      lastNewLogTime = Date.now();

      // Show new log indicator briefly
      newLogIndicator = true;
      setTimeout(() => (newLogIndicator = false), 2000);

      // Only auto-scroll if user hasn't manually scrolled
      if (autoScroll && !isUserScrolling) {
        // For grouped view, scroll the main container
        if (showGrouped && scrollArea) {
          requestAnimationFrame(() => {
            if (scrollArea) {
              scrollArea.scrollTo({
                top: scrollArea.scrollHeight,
                behavior: 'smooth'
              });
            }
          });
        }
        // For terminal view, scroll the log container
        else if (!showGrouped && logContainer) {
          requestAnimationFrame(() => {
            if (logContainer) {
              logContainer.scrollTo({
                top: logContainer.scrollHeight,
                behavior: 'smooth'
              });
            }
          });
        }
      }
    }
  });

  // Detect user scrolling
  function handleScroll(event: Event) {
    const target = event.target as HTMLElement;
    if (!target) return;

    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;

    // If user scrolled up, pause auto-scroll
    if (!isNearBottom) {
      isUserScrolling = true;
      autoScroll = false;
    }

    // Clear existing timeout
    if (scrollTimeout) clearTimeout(scrollTimeout);

    // Resume auto-scroll if user scrolls to bottom
    if (isNearBottom && isUserScrolling) {
      scrollTimeout = setTimeout(() => {
        isUserScrolling = false;
        autoScroll = true;
      }, 500);
    }
  }

  const levelColors = {
    info: 'text-gray-300',
    warning: 'text-yellow-400',
    error: 'text-red-400'
  };

  // Get recent logs for live streaming view (last 50 logs)
  const recentLogs = $derived.by(() => {
    const sorted = [...logs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    return sorted.slice(-50); // Show last 50 logs in live mode
  });

  // Detect phase transitions in logs
  function isPhaseTransition(log: LogEntry, prevLog?: LogEntry | null): boolean {
    if (!prevLog) return false;
    const currPhase = getNormalizedData(log).phase;
    const prevPhase = getNormalizedData(prevLog).phase;
    return currPhase !== prevPhase && currPhase !== 'OTHER';
  }

  // Clean and format log message (remove timestamps, ANSI codes, etc.)
  function cleanLogMessage(message: string): string {
    // Handle undefined or null messages
    if (!message) return '';

    let cleanMessage = String(message); // Ensure it's a string

    // Remove ANSI codes
    // eslint-disable-next-line no-control-regex
    cleanMessage = cleanMessage.replace(/\u001b\[[0-9;]*m/g, '');

    // Remove timestamp patterns
    cleanMessage = cleanMessage
      // Remove full timestamps like 2025/09/23 18:28:48.340117
      .replace(/\d{4}[/-]\d{1,2}[/-]\d{1,2}\s+\d{1,2}:\d{2}:\d{2}(\.\d+)?/g, '')
      // Remove ISO format timestamps
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g, '')
      // Remove time-only patterns at the start
      .replace(/^\d{1,2}:\d{2}:\d{2}(\.\d+)?\s*/g, '')
      // Remove bracketed timestamps
      .replace(/\[\d{4}[/-]\d{1,2}[/-]\d{1,2}\s+\d{1,2}:\d{2}:\d{2}(\.\d+)?\]/g, '')
      .trim();

    return cleanMessage;
  }

  // Highlight search query in terminal view
  function highlightSearchQuery(text: string): string {
    // Handle undefined or null text
    if (!text) return '';

    // First clean the message
    const cleanedText = cleanLogMessage(text);

    if (!searchQuery || !searchQuery.trim()) return cleanedText;

    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return cleanedText.replace(
      regex,
      '<mark class="bg-yellow-900/60 text-yellow-100 px-0.5 rounded">$1</mark>'
    );
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
        if (!scrollArea) return;
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
          {#if executionStatus === 'RUNNING' || executionStatus === 'PENDING'}
            <button
              onclick={() => {
                // Only enable live mode during active execution
                if (executionStatus === 'RUNNING' || executionStatus === 'PENDING') {
                  isLiveMode = true;
                  showGrouped = false;
                }
              }}
              class="flex cursor-pointer items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors {isLiveMode
                ? 'bg-red-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'}"
            >
              <span class="relative flex h-2 w-2">
                <span
                  class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"
                ></span>
                <span class="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
              </span>
              Live
            </button>
          {/if}
          <button
            onclick={() => {
              showGrouped = true;
              isLiveMode = false;
            }}
            class="flex cursor-pointer items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors {showGrouped &&
            !isLiveMode
              ? 'bg-gray-800 text-white'
              : 'text-gray-600 hover:bg-gray-100'}"
          >
            <Layers class="h-3.5 w-3.5" />
            Grouped
          </button>
          <button
            onclick={() => {
              showGrouped = false;
              isLiveMode = false;
            }}
            class="flex cursor-pointer items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors {!showGrouped &&
            !isLiveMode
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
            class="cursor-pointer rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          {#if autoScroll && newLogIndicator}
            <span class="animate-pulse text-blue-500">Following logs...</span>
          {:else}
            Auto-scroll
          {/if}
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
  <div class="min-h-0 flex-1 overflow-y-auto" bind:this={scrollArea} onscroll={handleScroll}>
    {#if isLoading}
      <div class="flex flex-col items-center justify-center p-8">
        <div class="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <Loader2 class="mx-auto mb-4 h-8 w-8 animate-spin text-gray-400" />
          <p class="text-gray-500">Loading logs...</p>
        </div>
      </div>
    {:else if isLiveMode && (executionStatus === 'RUNNING' || executionStatus === 'PENDING')}
      {@const activePhases = [
        ...new Set(recentLogs.slice(-10).map((l) => getNormalizedData(l).phase))
      ].filter((p) => p !== 'OTHER')}
      {@const _ = console.log(
        'Live Stream Debug - isLiveMode:',
        $state.snapshot(isLiveMode),
        'executionStatus:',
        $state.snapshot(executionStatus)
      )}
      <!-- Phase-aware Live Streaming View (Only available during execution) -->
      <div class="px-4 pb-4">
        <!-- Live Streaming Indicator -->
        <div
          class="sticky top-0 z-20 mb-4 rounded-lg border border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="relative flex h-3 w-3">
                <span
                  class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"
                ></span>
                <span class="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
              </span>
              <span class="text-sm font-medium text-gray-700">Live Streaming</span>

              <!-- Active Phases Indicator -->
              {#if activePhases.length > 0}
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500">Active:</span>
                  {#each activePhases as phase}
                    <span
                      class="animate-pulse rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                    >
                      {phase.replace(/_/g, ' ')}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
            <button
              onclick={() => (isLiveMode = false)}
              class="cursor-pointer text-xs text-gray-500 underline hover:text-gray-700"
            >
              Switch to grouped view
            </button>
          </div>
        </div>

        <!-- Live Logs Stream -->
        {#if recentLogs.length > 0}
          <div class="rounded-lg border border-gray-800 bg-gray-900 font-mono text-sm shadow-lg">
            <div class="space-y-0.5 p-4">
              {#each recentLogs as log, i (`${log.timestamp}-${log.message}-${i}`)}
                {@const prevLog = i > 0 ? recentLogs[i - 1] : null}
                {@const showTransition = isPhaseTransition(log, prevLog)}
                {@const { phase } = getNormalizedData(log)}
                {@const isNewLog =
                  Date.now() - lastNewLogTime < 2000 && i === recentLogs.length - 1}

                {#if showTransition && phase !== 'OTHER'}
                  <!-- Phase Transition Separator (hide for OTHER) -->
                  <div class="my-3 flex items-center gap-3">
                    <div
                      class="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"
                    ></div>
                    <span
                      class="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold tracking-wider text-blue-400 uppercase"
                    >
                      {phase.replace(/_/g, ' ')} Started
                    </span>
                    <div
                      class="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"
                    ></div>
                  </div>
                {/if}

                <div
                  class="group -mx-2 flex rounded px-2 py-0.5 transition-colors hover:bg-gray-800/30 {isNewLog
                    ? 'new-log-live'
                    : ''}"
                >
                  <span class="mr-4 w-6 text-right text-xs text-gray-600 tabular-nums select-none"
                    >{getGlobalLineNumber(log)}</span
                  >
                  <!-- Phase Badge for better context (hide OTHER) -->
                  {#if phase !== 'OTHER'}
                    <span
                      class="mr-3 min-w-[100px] rounded bg-gray-800 px-1.5 py-0.5 text-center text-xs font-medium text-gray-400"
                    >
                      {phase.replace(/_/g, ' ')}
                    </span>
                  {/if}
                  <pre
                    class="flex-1 overflow-hidden whitespace-pre-wrap text-white">{@html /* eslint-disable-line svelte/no-at-html-tags */ highlightSearchQuery(
                      log.message || ''
                    )}</pre>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <!-- Waiting for logs in Live mode -->
          <div
            class="rounded-lg border border-gray-800 bg-gray-900 p-8 font-mono text-sm shadow-lg"
          >
            <div class="flex flex-col items-center justify-center">
              <Loader2 class="mb-4 h-8 w-8 animate-spin text-gray-500" />
              <p class="text-sm text-gray-400">Waiting for logs...</p>
              <p class="mt-2 text-xs text-gray-500">Logs will appear here as they are generated</p>
            </div>
          </div>
        {/if}

        <!-- Auto-scroll indicator -->
        {#if autoScroll && recentLogs.length > 0}
          <div class="mt-3 flex items-center justify-center">
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
              Auto-scrolling enabled
            </span>
          </div>
        {/if}
      </div>
    {:else if logs.length === 0}
      {@const showRerun = shouldShowRerun()}
      {@const _ = console.log(
        'Show Re-run button?',
        showRerun,
        'Status:',
        $state.snapshot(executionStatus),
        'Logs:',
        logs.length,
        'StartedAt:',
        executionStartedAt
      )}
      <div class="flex flex-col items-center justify-center p-8">
        <div class="max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <Terminal class="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p class="mb-2 font-medium text-gray-500">No logs available</p>
          {#if executionStatus === 'RUNNING' || executionStatus === 'PENDING'}
            <p class="mb-3 text-sm text-gray-400">
              This execution appears to be stuck or interrupted.
            </p>
            <div
              class="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-gray-500"
            >
              <p class="mb-1 font-medium">Possible reasons:</p>
              <ul class="list-inside list-disc space-y-1">
                <li>The build process was interrupted</li>
                <li>Logs were not saved to the database</li>
                <li>The execution is still initializing</li>
              </ul>
              <p class="mt-2">Try refreshing the page or check the build system status.</p>
            </div>
          {:else if executionStatus === 'FAILED'}
            <p class="mb-4 text-sm text-gray-400">This execution failed without generating logs.</p>
          {:else}
            <p class="text-sm text-gray-400">Logs will appear here as the execution progresses</p>
          {/if}

          {#if showRerun}
            <div class="mt-4 flex justify-center gap-3">
              <button
                onclick={handleRerun}
                class="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                <RefreshCw class="h-4 w-4" />
                Re-run Execution
              </button>
              <button
                onclick={() => window.location.reload()}
                class="flex cursor-pointer items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300"
              >
                <RefreshCw class="h-4 w-4" />
                Refresh Page
              </button>
            </div>
          {/if}
        </div>
      </div>
    {:else if showGrouped}
      <!-- Grouped View with Floating Cards -->
      <div class="px-4 pb-4">
        {#each logsByPhase as [phase, phaseLogs], index}
          <LogGroup
            {phase}
            logs={phaseLogs}
            status={getPhaseStatusAt(index, phase, phaseLogs)}
            startTime={phaseLogs[0]?.timestamp}
            endTime={phaseLogs[phaseLogs.length - 1]?.timestamp}
            initialExpanded={allExpanded ||
              getPhaseStatusAt(index, phase, phaseLogs) === 'running' ||
              getPhaseStatusAt(index, phase, phaseLogs) === 'failed'}
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
        <div
          bind:this={logContainer}
          class="max-h-[calc(100vh-16rem)] overflow-y-auto p-4"
          onscroll={handleScroll}
        >
          {#each logsByPhase as [phase, phaseLogs]}
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
                {#each phaseLogs as log, i (`${log.timestamp}-${log.message}-${i}`)}
                  {@const isNewLog =
                    Date.now() - lastNewLogTime < 2000 && i === phaseLogs.length - 1}
                  <div
                    class="group flex py-0.5 hover:bg-gray-800/50 {isNewLog ? 'new-log-line' : ''}"
                  >
                    <span class="mr-4 w-8 text-right text-gray-500 tabular-nums select-none"
                      >{getGlobalLineNumber(log) || i + 1}</span
                    >
                    <span
                      class="flex-1 break-all whitespace-pre-wrap {levelColors[log.level] ||
                        'text-gray-300'}"
                    >
                      {@html /* eslint-disable-line svelte/no-at-html-tags */ highlightSearchQuery(
                        log.message
                      )}
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

<style>
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fadeHighlight {
    0% {
      background-color: rgba(59, 130, 246, 0.2);
      border-left: 3px solid rgb(59, 130, 246);
    }
    100% {
      background-color: transparent;
      border-left: 3px solid transparent;
    }
  }

  :global(.new-log-line) {
    animation:
      slideIn 0.3s ease-out,
      fadeHighlight 2s ease-out;
    padding-left: 3px;
  }

  @keyframes slideLive {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulseLive {
    0%,
    100% {
      background-color: rgba(59, 130, 246, 0.1);
    }
    50% {
      background-color: rgba(59, 130, 246, 0.2);
    }
  }

  :global(.new-log-live) {
    animation:
      slideLive 0.4s ease-out,
      pulseLive 1s ease-in-out;
  }
</style>
