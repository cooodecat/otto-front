<script lang="ts">
  import {
    ChevronDown,
    ChevronRight,
    CheckCircle,
    XCircle,
    Loader2,
    AlertCircle,
    FileText,
    Activity,
    Maximize2,
    Clock
  } from 'lucide-svelte';
  import type { LogEntry } from '$lib/types/log.types';
  import LogDetailPopover from './LogDetailPopover.svelte';
  import LogSegment from './LogSegment.svelte';
  import { LogParser } from '$lib/utils/log-parser';

  interface Props {
    phase: string;
    logs: LogEntry[];
    status?: 'pending' | 'running' | 'success' | 'failed';
    startTime?: string;
    endTime?: string;
    initialExpanded?: boolean;
    phaseIndex?: number;
    totalPhases?: number;
    searchQuery?: string;
    estimatedDuration?: number; // in seconds
    forceExpand?: boolean;
    externalExpanded?: boolean;
  }

  let {
    phase,
    logs = [],
    status = 'pending',
    startTime,
    endTime,
    initialExpanded = false,
    phaseIndex = 0,
    totalPhases = 0,
    searchQuery = '',
    estimatedDuration = 60,
    forceExpand = false,
    externalExpanded = false
  }: Props = $props();

  let internalExpanded = $state(initialExpanded);
  let isExpanded = $derived(forceExpand || externalExpanded || internalExpanded);
  let selectedLog = $state<LogEntry | null>(null);
  let selectedIndex = $state<number | null>(null);
  let showProgressBar = $state(false);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let prevStatus = $state<'pending' | 'running' | 'success' | 'failed' | null>(null);

  // Format phase name for display
  const formatPhaseName = (phase: string): string => {
    const phaseMap: Record<string, string> = {
      DOWNLOAD_SOURCE: 'Downloading Source',
      INSTALL: 'Installing Dependencies',
      PRE_BUILD: 'Pre-build Setup',
      BUILD: 'Building Application',
      POST_BUILD: 'Post-build Tasks',
      UPLOAD_ARTIFACTS: 'Uploading Artifacts',
      FINALIZING: 'Finalizing',
      OTHER: 'Other Tasks'
    };
    return phaseMap[phase] || phase;
  };

  // Group logs by step
  const logsByStep = $derived.by(() => {
    const groups = new Map<string, LogEntry[]>();

    logs.forEach((log) => {
      const stepName = log.step || 'General';
      if (!groups.has(stepName)) {
        groups.set(stepName, []);
      }
      groups.get(stepName)!.push(log);
    });

    return Array.from(groups.entries()).sort((a, b) => {
      // Sort by stepOrder if available
      const orderA = a[1][0]?.stepOrder || 999;
      const orderB = b[1][0]?.stepOrder || 999;
      return orderA - orderB;
    });
  });

  // Flatten logs in display order for keyboard navigation
  const flatLogs = $derived.by(() => {
    const arr: LogEntry[] = [];
    logsByStep.forEach(([_, stepLogs]) => {
      stepLogs.forEach((l) => arr.push(l));
    });
    return arr;
  });

  const keyForLog = (l: LogEntry) => `${l.timestamp}|${l.message}`;
  const indexMap = $derived.by(() => {
    const m = new Map<string, number>();
    flatLogs.forEach((l, i) => m.set(keyForLog(l), i));
    return m;
  });

  // Calculate duration and progress
  const durationInfo = $derived.by(() => {
    if (!startTime) return { duration: '', progress: 0, elapsedSeconds: 0 };
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const durationMs = end - start;

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    let duration = '';
    if (hours > 0) {
      duration = `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      duration = `${minutes}m ${seconds % 60}s`;
    } else {
      duration = `${seconds}s`;
    }

    // Calculate progress percentage
    const progress =
      status === 'success'
        ? 100
        : status === 'failed'
          ? 100
          : status === 'running'
            ? Math.min(95, (seconds / estimatedDuration) * 100)
            : 0;

    return { duration, progress, elapsedSeconds: seconds };
  });

  // Progress bar visibility with transition awareness
  // - On first mount: do not replay success fade; show only if running/failed
  // - On transition running->success: show then fade after short delay
  $effect(() => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    if (prevStatus === null) {
      // Initial mount behavior
      if (status === 'running') showProgressBar = true;
      else if (status === 'failed') showProgressBar = true;
      else if (status === 'success')
        showProgressBar = false; // already completed, no replay
      else showProgressBar = false;
      prevStatus = status;
      return;
    }

    if (prevStatus !== status) {
      // Handle meaningful transitions
      if (status === 'running') {
        showProgressBar = true;
      } else if (status === 'success') {
        // Came to success from non-success: show then fade
        showProgressBar = true;
        hideTimer = setTimeout(() => {
          showProgressBar = false;
        }, 400);
      } else if (status === 'failed') {
        showProgressBar = true;
      } else {
        showProgressBar = false;
      }
    }

    prevStatus = status;

    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };
  });

  // Status icon and color with enhanced styling
  const statusConfig = $derived.by(() => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle,
          iconClass: 'text-green-500',
          bgClass: 'bg-gradient-to-r from-green-50/80 to-white hover:from-green-50',
          borderClass: 'border-l-4 border-green-500',
          textClass: 'text-green-700'
        };
      case 'failed':
        return {
          icon: XCircle,
          iconClass: 'text-red-500',
          bgClass: 'bg-gradient-to-r from-red-50/80 to-white hover:from-red-50',
          borderClass: 'border-l-4 border-red-500',
          textClass: 'text-red-700'
        };
      case 'running':
        return {
          icon: Loader2,
          iconClass: 'text-blue-500 animate-spin',
          bgClass: 'bg-gradient-to-r from-blue-50/80 to-white hover:from-blue-50',
          borderClass: 'border-l-4 border-blue-500',
          textClass: 'text-blue-700'
        };
      default:
        return {
          icon: Clock,
          iconClass: 'text-gray-400',
          bgClass: 'bg-gradient-to-r from-gray-50/80 to-white hover:from-gray-50',
          borderClass: 'border-l-4 border-gray-300',
          textClass: 'text-gray-600'
        };
    }
  });

  // Count errors and warnings in logs
  const logStats = $derived.by(() => {
    const errorCount = logs.filter((l) => l.level === 'error').length;
    const warningCount = logs.filter((l) => l.level === 'warning').length;
    return { errorCount, warningCount };
  });

  function toggleExpanded() {
    internalExpanded = !internalExpanded;
  }

  function handleLogClick(log: LogEntry, _index: number) {
    selectedLog = log;
    selectedIndex = indexMap.get(keyForLog(log)) ?? null;
  }

  function navigate(delta: number) {
    if (selectedIndex === null) return;
    const next = Math.min(Math.max(0, selectedIndex + delta), flatLogs.length - 1);
    selectedIndex = next;
    selectedLog = flatLogs[next];
  }

  function getRelatedLogs(log: LogEntry, allLogs: LogEntry[]): LogEntry[] {
    const index = allLogs.findIndex((l) => l.timestamp === log.timestamp);
    if (index === -1) return [];

    const start = Math.max(0, index - 3);
    const end = Math.min(allLogs.length, index + 4);
    return allLogs.slice(start, end);
  }

  // Auto-expand if running or failed
  $effect(() => {
    if (status === 'running' || status === 'failed') {
      internalExpanded = true;
    }
  });

  // Parse log message using the new parser
  function parseLogMessage(message: string) {
    return LogParser.parseMessage(message, searchQuery);
  }

  // Get log level color
  function getLogLevelClass(level: string): string {
    switch (level) {
      case 'error':
        return 'text-red-400 bg-red-950/20';
      case 'warning':
        return 'text-yellow-400 bg-yellow-950/20';
      default:
        return 'text-gray-300';
    }
  }
</script>

<div
  id="phase-{phaseIndex}"
  class="relative mb-3 rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md"
>
  <!-- Phase Header -->
  <button
    onclick={toggleExpanded}
    class="sticky top-0 z-10 flex w-full cursor-pointer items-center justify-between bg-white/95 px-4 py-3 backdrop-blur transition-all duration-200 {statusConfig.bgClass} {statusConfig.borderClass}"
  >
    <div class="flex flex-1 items-center gap-3">
      {#if isExpanded}
        <ChevronDown class="h-4 w-4 text-gray-500 transition-transform" />
      {:else}
        <ChevronRight class="h-4 w-4 text-gray-500 transition-transform" />
      {/if}

      {#if statusConfig.icon}
        {@const StatusIcon = statusConfig.icon}
        <StatusIcon class="h-5 w-5 {statusConfig.iconClass}" />
      {/if}

      <div class="flex flex-1 items-center gap-2">
        {#if totalPhases > 0}
          <span class="rounded-full bg-gray-200 px-2 py-1 font-mono text-xs text-gray-600">
            {phaseIndex + 1}/{totalPhases}
          </span>
        {/if}
        <span class="font-semibold {statusConfig.textClass}">{formatPhaseName(phase)}</span>

        {#if status === 'running' || status === 'success' || status === 'failed'}
          <div class="ml-4 max-w-xs flex-1">
            <!-- Progress track; keep height to avoid layout shift -->
            <div
              class="relative h-2 overflow-hidden rounded-full bg-gray-200 transition-opacity duration-300 {showProgressBar
                ? 'opacity-100'
                : 'opacity-0'}"
            >
              <div
                class="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out {status ===
                'running'
                  ? 'animate-pulse bg-blue-500'
                  : status === 'success'
                    ? 'bg-green-500'
                    : 'bg-red-500'}"
                style="width: {durationInfo.progress}%"
              ></div>
            </div>
            {#if status === 'running'}
              <div class="mt-1 text-xs text-gray-500">
                {Math.round(durationInfo.progress)}% • Est. {Math.max(
                  0,
                  estimatedDuration - durationInfo.elapsedSeconds
                )}s remaining
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        {#if logs.length > 0}
          <span class="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs">
            <FileText class="h-3 w-3" />
            {logs.length}
          </span>
        {/if}

        {#if logStats.errorCount > 0}
          <span
            class="flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs text-red-700"
          >
            <XCircle class="h-3 w-3" />
            {logStats.errorCount}
          </span>
        {/if}

        {#if logStats.warningCount > 0}
          <span
            class="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-700"
          >
            <AlertCircle class="h-3 w-3" />
            {logStats.warningCount}
          </span>
        {/if}
      </div>
    </div>

    <div class="flex items-center gap-2">
      {#if status === 'running'}
        <Activity class="h-4 w-4 animate-pulse text-blue-500" />
      {/if}
    </div>
  </button>

  <!-- Phase Content -->
  {#if isExpanded}
    <div class="border-t border-gray-200">
      {#each logsByStep as [stepName, stepLogs] (stepName)}
        <div class="border-t border-gray-200">
          {#if stepName !== 'General'}
            <div class="border-b border-gray-100 bg-gray-50 px-6 py-2">
              <span class="text-sm font-medium text-gray-600">{stepName}</span>
            </div>
          {/if}

          <div class="overflow-x-auto bg-gray-900/95">
            {#each stepLogs as log, logIndex (log.timestamp + logIndex)}
              <button
                onclick={() => handleLogClick(log, logIndex)}
                class="group w-full cursor-pointer px-6 py-1 text-left transition-colors hover:bg-gray-800/50 {getLogLevelClass(
                  log.level
                )} {logIndex === 0 ? 'pt-2' : ''} {logIndex === stepLogs.length - 1 ? 'pb-2' : ''}"
              >
                <div class="flex items-start gap-3 font-mono text-xs">
                  <span class="w-20 shrink-0 text-gray-500 select-none">
                    {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                  <div class="flex-1 break-all whitespace-pre-wrap">
                    {#each parseLogMessage(log.message).segments as segment}
                      <LogSegment {segment} />
                    {/each}
                  </div>
                  <div class="opacity-0 transition-opacity group-hover:opacity-100">
                    <Maximize2 class="h-3 w-3 text-gray-400" />
                  </div>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Log Detail Popover -->
{#if selectedLog}
  <LogDetailPopover
    log={selectedLog}
    onClose={() => (selectedLog = null)}
    relatedLogs={getRelatedLogs(selectedLog, flatLogs)}
    onPrev={() => navigate(-1)}
    onNext={() => navigate(1)}
    currentIndex={selectedIndex ?? 0}
    totalCount={flatLogs.length}
  />
{/if}
