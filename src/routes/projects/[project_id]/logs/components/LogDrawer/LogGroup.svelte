<script lang="ts">
  import { ChevronDown, ChevronRight, CheckCircle, XCircle, Circle, Loader2, AlertCircle, Clock, FileText, Activity, Maximize2 } from 'lucide-svelte';
  import type { LogEntry } from '$lib/types/log.types';
  import LogDetailPopover from './LogDetailPopover.svelte';
  
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
    getLineNumber?: (log: LogEntry) => number;
    lastNewLogTime?: number;
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
    getLineNumber,
    lastNewLogTime = 0
  }: Props = $props();

  let isExpanded = $state(initialExpanded);
  let selectedLog = $state<LogEntry | null>(null);
  let selectedIndex = $state<number | null>(null);
  let showProgressBar = $state(false);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let prevStatus = $state<'pending' | 'running' | 'success' | 'failed' | null>(null);
  
  // Format phase name for display
  const formatPhaseName = (phase: string): string => {
    const phaseMap: Record<string, string> = {
      'DOWNLOAD_SOURCE': 'Downloading Source',
      'INSTALL': 'Installing Dependencies',
      'PRE_BUILD': 'Pre-build Setup',
      'BUILD': 'Building Application',
      'POST_BUILD': 'Post-build Tasks',
      'UPLOAD_ARTIFACTS': 'Uploading Artifacts',
      'FINALIZING': 'Finalizing',
      'OTHER': 'Other Tasks'
    };
    return phaseMap[phase] || phase;
  };
  
  // Group logs by step
  const logsByStep = $derived.by(() => {
    const groups = new Map<string, LogEntry[]>();
    
    logs.forEach(log => {
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

  // Filter function to remove redundant echo commands
  function shouldShowLog(log: LogEntry): boolean {
    let msg = log.message.trim();
    
    // Remove timestamps first
    msg = msg.replace(/^\[?\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\s+\d{1,2}:\d{2}:\d{2}(\.\d+)?Z?\]?\s*/g, '');
    msg = msg.replace(/^\d{1,2}:\d{2}:\d{2}(\.\d+)?\s*/g, '');
    
    // Check if message contains Running command with echo
    if (msg.includes('Running command echo')) {
      return false;
    }
    
    // Filter out echo commands (all variations)
    if (msg.startsWith('echo ') || 
        msg.startsWith('$ echo ') ||
        msg.match(/^echo\s+["']/) ||
        msg.match(/^\$\s*echo\s/)) {
      return false;
    }
    
    // Filter out commands with variable substitution ($1, $REPOSITORY_URI, etc.)
    if (msg.includes('$1') || msg.includes('$REPOSITORY_URI') || msg.includes('$IMAGE_TAG')) {
      // But keep the actual executed commands (without $)
      if (msg.startsWith('docker push $') || msg.includes('push $')) {
        return false;
      }
    }
    
    return true;
  }

  // Flatten logs in display order for keyboard navigation (with filtering)
  const flatLogs = $derived.by(() => {
    const arr: LogEntry[] = [];
    logsByStep.forEach(([_, stepLogs]) => {
      stepLogs.filter(shouldShowLog).forEach((l) => arr.push(l));
    });
    return arr;
  });

  const keyForLog = (l: LogEntry) => `${l.timestamp}|${l.message}`;
  const indexMap = $derived.by(() => {
    const m = new Map<string, number>();
    flatLogs.forEach((l, i) => m.set(keyForLog(l), i));
    return m;
  });

  function lineNo(log: LogEntry): number {
    if (getLineNumber) return getLineNumber(log);
    const idx = indexMap.get(keyForLog(log));
    return typeof idx === 'number' ? idx + 1 : 0;
  }

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
    const progress = status === 'success' ? 100 : 
                    status === 'failed' ? 100 :
                    status === 'running' ? Math.min(95, (seconds / estimatedDuration) * 100) :
                    0;
    
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
      else if (status === 'success') showProgressBar = false; // already completed, no replay
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
    const errorCount = logs.filter(l => l.level === 'error').length;
    const warningCount = logs.filter(l => l.level === 'warning').length;
    return { errorCount, warningCount };
  });

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }
  
  function handleLogClick(log: LogEntry, index: number) {
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
    const index = allLogs.findIndex(l => l.timestamp === log.timestamp);
    if (index === -1) return [];
    
    const start = Math.max(0, index - 3);
    const end = Math.min(allLogs.length, index + 4);
    return allLogs.slice(start, end);
  }

  // Auto-expand if running or failed
  $effect(() => {
    if (status === 'running' || status === 'failed') {
      isExpanded = true;
    }
  });

  // Expand when externally requested (do not auto-collapse)
  $effect(() => {
    if (forceExpand) {
      isExpanded = true;
    }
  });
  
  // React to initialExpanded changes (for Expand/Collapse all)
  $effect(() => {
    isExpanded = initialExpanded;
  });
  
  // Parse ANSI colors and highlight keywords
  function formatLogMessage(message: string): string {
    // First, strip any existing HTML tags to prevent double formatting
    let cleanMessage = message.replace(/<[^>]*>/g, '');
    
    // Remove ANSI codes
    cleanMessage = cleanMessage.replace(/\x1b\[[0-9;]*m/g, '');
    
    // Remove timestamp patterns (both at start and anywhere in message)
    cleanMessage = cleanMessage
      // Remove full timestamps like 2025/09/23 18:28:48.340117
      .replace(/\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\s+\d{1,2}:\d{2}:\d{2}(\.\d+)?/g, '')
      // Remove ISO format timestamps
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g, '')
      // Remove time-only patterns at the start
      .replace(/^\d{1,2}:\d{2}:\d{2}(\.\d+)?\s*/g, '')
      // Remove bracketed timestamps
      .replace(/\[\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\s+\d{1,2}:\d{2}:\d{2}(\.\d+)?\]/g, '')
      .trim();
    
    // Handle multi-line log entries and clean up redundancy
    // If this is a "Running command" line, show it as a shell command
    if (cleanMessage.includes('[Container] Running command')) {
      cleanMessage = cleanMessage.replace('[Container] Running command ', '$ ');
    }
    
    // Remove "$ " prefix from commands that show variable substitution
    // e.g., "$ docker push $1:latest" becomes "docker push 123.dkr.ecr.region.amazonaws.com/repo:latest"
    if (cleanMessage.startsWith('$ ') && cleanMessage.includes('$')) {
      // Don't show this line as it's the template, not the actual command
      cleanMessage = cleanMessage.substring(2);
    }
    
    // Escape HTML special characters
    let formatted = cleanMessage
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
      
    // Highlight search query if present
    if (searchQuery && searchQuery.trim()) {
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      formatted = formatted.replace(regex, '<mark class="bg-yellow-900/60 text-yellow-100 px-0.5 rounded">$1</mark>');
    }
    
    // Syntax highlighting for code patterns
    formatted = formatted
      // URLs (do this first to avoid conflicts)
      .replace(/(https?:\/\/[^\s]+)/g, '<span class="text-blue-400 underline">$1</span>')
      // File paths and directories (avoid matching class names like text-cyan-400)
      .replace(/(\/?[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)/g, '<span class="text-cyan-400">$1</span>')
      // JSON-like structures
      .replace(/(\{[^}]+\})/g, '<span class="text-purple-400 font-mono">$1</span>')
      // Commands (npm, yarn, pnpm, etc.)
      .replace(/\b(npm|yarn|pnpm|node|git|docker|kubectl)\s+([a-z\-]+)/gi, 
        '<span class="text-green-400">$1</span> <span class="text-blue-400">$2</span>')
      // Environment variables
      .replace(/\$([A-Z_]+)/g, '<span class="text-purple-400">$$1</span>')
      // Quoted strings (now match escaped quotes)
      .replace(/&quot;([^&]+)&quot;/g, '<span class="text-yellow-300">&quot;$1&quot;</span>')
      .replace(/&#039;([^&]+)&#039;/g, '<span class="text-yellow-300">&#039;$1&#039;</span>')
      // IP addresses with ports
      .replace(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{2,5})\b/g, 
        '<span class="text-cyan-400">$1</span>:<span class="text-orange-400">$2</span>')
      // IP addresses (without ports)
      .replace(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g, '<span class="text-cyan-400">$1</span>');
    
    // Apply keyword highlighting after syntax highlighting
    formatted = formatted
      .replace(/(\[Container\])/g, '<span class="text-blue-400">$1</span>')
      .replace(/(ERROR|FAILED|Failed|error)/gi, '<span class="text-red-400 font-bold bg-red-900/30 px-1 rounded">$1</span>')
      .replace(/(WARNING|WARN|Warning)/gi, '<span class="text-yellow-400 font-bold bg-yellow-900/30 px-1 rounded">$1</span>')
      .replace(/(SUCCESS|SUCCEEDED|Succeeded|success|completed?|done|finished)/gi, '<span class="text-green-400 font-bold">$1</span>')
      .replace(/(Phase complete:)/g, '<span class="text-green-400">$1</span>')
      .replace(/(Entering phase)/g, '<span class="text-blue-400">$1</span>')
      .replace(/(Running command|Executing|Starting|Building|Installing|Downloading)/gi, '<span class="text-purple-400">$1</span>')
      // Timing information (only highlight when followed by time units)
      .replace(/(\d+(?:\.\d+)?)\s*(ms|s|sec|seconds?|minutes?|hours?)\b/gi, 
        '<span class="text-orange-300">$1 $2</span>')
      // Percentages (only when actually followed by %)
      .replace(/(\d+(?:\.\d+)?%)/g, '<span class="text-cyan-300">$1</span>')
      // File sizes (MB, KB, GB, etc.)
      .replace(/(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB|kB|Mb|Gb|bytes?)\b/gi,
        '<span class="text-orange-300">$1 $2</span>');
    
    return formatted;
  }
  
  // Get log level color
  function getLogLevelClass(level: string): string {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-300';
    }
  }
</script>

<div id="phase-{phaseIndex}" class="mb-3 rounded-lg bg-white shadow-sm border border-gray-200 transition-all duration-300 hover:shadow-md relative">
  <!-- Phase Header -->
  <button
    onclick={toggleExpanded}
    class="sticky top-0 z-10 w-full px-4 py-3 flex items-center justify-between transition-all duration-200 bg-white/95 backdrop-blur cursor-pointer {statusConfig.bgClass} {statusConfig.borderClass}"
  >
    <div class="flex items-center gap-3 flex-1">
      {#if isExpanded}
        <ChevronDown class="h-4 w-4 text-gray-500 transition-transform" />
      {:else}
        <ChevronRight class="h-4 w-4 text-gray-500 transition-transform" />
      {/if}
      
      {#if status === 'running'}
        <Loader2 class="h-5 w-5 {statusConfig.iconClass}" />
      {:else if status === 'success'}
        <CheckCircle class="h-5 w-5 {statusConfig.iconClass}" />
      {:else if status === 'failed'}
        <XCircle class="h-5 w-5 {statusConfig.iconClass}" />
      {:else}
        <Circle class="h-5 w-5 {statusConfig.iconClass}" />
      {/if}
      
      <div class="flex items-center gap-2 flex-1">
        {#if totalPhases > 0}
          <span class="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600 font-mono">
            {phaseIndex + 1}/{totalPhases}
          </span>
        {/if}
        <span class="font-semibold {statusConfig.textClass}">{formatPhaseName(phase)}</span>
        
        {#if status === 'running' || status === 'success' || status === 'failed'}
          <div class="flex-1 max-w-xs ml-4">
            <!-- Progress track; keep height to avoid layout shift -->
            <div class="relative h-2 bg-gray-200 rounded-full overflow-hidden transition-opacity duration-300 {showProgressBar ? 'opacity-100' : 'opacity-0'}">
              <div
                class="absolute inset-y-0 left-0 transition-[width] duration-500 ease-out rounded-full {status === 'running' ? 'bg-blue-500 animate-pulse' : status === 'success' ? 'bg-green-500' : 'bg-red-500'}"
                style="width: {durationInfo.progress}%"
              ></div>
            </div>
            {#if status === 'running'}
              <div class="text-xs text-gray-500 mt-1">
                {Math.round(durationInfo.progress)}% • Est. {Math.max(0, estimatedDuration - durationInfo.elapsedSeconds)}s remaining
              </div>
            {/if}
          </div>
        {/if}
      </div>
      
      <div class="flex items-center gap-2">
        {#if logs.length > 0}
          <span class="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100">
            <FileText class="h-3 w-3" />
            {logs.length}
          </span>
        {/if}
        
        {#if logStats.errorCount > 0}
          <span class="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
            <XCircle class="h-3 w-3" />
            {logStats.errorCount}
          </span>
        {/if}
        
        {#if logStats.warningCount > 0}
          <span class="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
            <AlertCircle class="h-3 w-3" />
            {logStats.warningCount}
          </span>
        {/if}
      </div>
    </div>
    
    <div class="flex items-center gap-2">
      {#if durationInfo.duration}
        <span class="flex items-center gap-1 text-sm text-gray-600">
          <Clock class="h-3 w-3" />
          {durationInfo.duration}
        </span>
      {/if}
      {#if status === 'running'}
        <Activity class="h-4 w-4 text-blue-500 animate-pulse" />
      {/if}
    </div>
  </button>

  <!-- Phase Content -->
  {#if isExpanded}
    <div class="border-t border-gray-200">
      {#each logsByStep as [stepName, stepLogs]}
        <div class="border-t border-gray-200">
          {#if stepName !== 'General'}
            <div class="px-6 py-2 bg-gray-900/70 border-b border-gray-800 text-gray-300">
              <span class="text-sm font-medium">{stepName}</span>
            </div>
          {/if}
          
          <div class="bg-gray-900 overflow-x-auto divide-y divide-gray-800">
            {#each stepLogs.filter(shouldShowLog) as log, logIndex}
              {@const isNewLog = Date.now() - lastNewLogTime < 2000 && logIndex === stepLogs.filter(shouldShowLog).length - 1}
              <button
                onclick={() => handleLogClick(log, logIndex)}
                class="w-full text-left px-6 py-0.5 hover:bg-gray-800/50 transition-colors cursor-pointer group {getLogLevelClass(log.level)} {logIndex === 0 ? 'pt-2' : ''} {logIndex === stepLogs.length - 1 ? 'pb-2' : ''} font-mono tabular-nums text-[13px] leading-5 {isNewLog ? 'new-log-line-grouped' : ''}"
              >
                <div class="group flex items-start">
                  <span class="mr-3 text-gray-500 select-none shrink-0 w-20 tabular-nums">
                    {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                  <span class="mr-4 text-gray-600 select-none shrink-0 w-8 text-right">{lineNo(log)}</span>
                  <div class="flex-1 whitespace-pre-wrap break-all text-gray-300">
                    {@html formatLogMessage(log.message)}
                  </div>
                  <div class="opacity-0 group-hover:opacity-100 transition-opacity">
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
    onClose={() => selectedLog = null}
    relatedLogs={getRelatedLogs(selectedLog, flatLogs)}
    onPrev={() => navigate(-1)}
    onNext={() => navigate(1)}
    currentIndex={selectedIndex ?? 0}
    totalCount={flatLogs.length}
  />
{/if}

<style>
  @keyframes slideInGrouped {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes fadeHighlightGrouped {
    0% {
      background-color: rgba(59, 130, 246, 0.1);
    }
    100% {
      background-color: transparent;
    }
  }
  
  :global(.new-log-line-grouped) {
    animation: slideInGrouped 0.3s ease-out, fadeHighlightGrouped 2s ease-out;
  }
</style>
