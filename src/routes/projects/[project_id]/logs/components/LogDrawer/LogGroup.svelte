<script lang="ts">
  import { ChevronDown, ChevronRight, CheckCircle, XCircle, Loader2, AlertCircle, Clock, FileText } from 'lucide-svelte';
  import type { LogEntry } from '$lib/types/log.types';
  
  interface Props {
    phase: string;
    logs: LogEntry[];
    status?: 'pending' | 'running' | 'success' | 'failed';
    startTime?: string;
    endTime?: string;
    initialExpanded?: boolean;
    phaseIndex?: number;
    totalPhases?: number;
  }

  let { 
    phase, 
    logs = [], 
    status = 'pending',
    startTime,
    endTime,
    initialExpanded = false,
    phaseIndex = 0,
    totalPhases = 0
  }: Props = $props();

  let isExpanded = $state(initialExpanded);
  
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

  // Calculate duration
  const duration = $derived.by(() => {
    if (!startTime) return '';
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const durationMs = end - start;
    
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  });

  // Status icon and color with enhanced styling
  const statusConfig = $derived.by(() => {
    switch (status) {
      case 'success':
        return { 
          icon: CheckCircle, 
          iconClass: 'text-green-500',
          bgClass: 'bg-gradient-to-r from-green-50 to-transparent hover:from-green-100',
          borderClass: 'border-l-4 border-green-500',
          textClass: 'text-green-700'
        };
      case 'failed':
        return { 
          icon: XCircle, 
          iconClass: 'text-red-500',
          bgClass: 'bg-gradient-to-r from-red-50 to-transparent hover:from-red-100',
          borderClass: 'border-l-4 border-red-500',
          textClass: 'text-red-700'
        };
      case 'running':
        return { 
          icon: Loader2, 
          iconClass: 'text-blue-500 animate-spin',
          bgClass: 'bg-gradient-to-r from-blue-50 to-transparent hover:from-blue-100 animate-pulse',
          borderClass: 'border-l-4 border-blue-500',
          textClass: 'text-blue-700'
        };
      default:
        return { 
          icon: Clock, 
          iconClass: 'text-gray-400',
          bgClass: 'bg-gradient-to-r from-gray-50 to-transparent hover:from-gray-100',
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

  // Auto-expand if running or failed
  $effect(() => {
    if (status === 'running' || status === 'failed') {
      isExpanded = true;
    }
  });
  
  // Parse ANSI colors and highlight keywords
  function formatLogMessage(message: string): string {
    // Remove ANSI codes for now but highlight keywords
    let formatted = message
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI codes
      .replace(/(\[Container\])/g, '<span class="text-blue-400">$1</span>')
      .replace(/(ERROR|FAILED|Failed|error)/gi, '<span class="text-red-400 font-bold">$1</span>')
      .replace(/(WARNING|WARN|Warning)/gi, '<span class="text-yellow-400 font-bold">$1</span>')
      .replace(/(SUCCESS|SUCCEEDED|Succeeded|success)/gi, '<span class="text-green-400 font-bold">$1</span>')
      .replace(/(Phase complete:)/g, '<span class="text-green-400">$1</span>')
      .replace(/(Entering phase)/g, '<span class="text-blue-400">$1</span>')
      .replace(/(Running command)/g, '<span class="text-purple-400">$1</span>');
    
    return formatted;
  }
  
  // Get log level color
  function getLogLevelClass(level: string): string {
    switch (level) {
      case 'error': return 'text-red-400 bg-red-950/20';
      case 'warning': return 'text-yellow-400 bg-yellow-950/20';
      default: return 'text-gray-300';
    }
  }
</script>

<div id="phase-{phaseIndex}" class="border-b border-gray-200 {statusConfig.borderClass} transition-all duration-300">
  <!-- Phase Header -->
  <button
    onclick={toggleExpanded}
    class="w-full px-4 py-3 flex items-center justify-between transition-all duration-200 {statusConfig.bgClass}"
  >
    <div class="flex items-center gap-3">
      {#if isExpanded}
        <ChevronDown class="h-4 w-4 text-gray-500 transition-transform" />
      {:else}
        <ChevronRight class="h-4 w-4 text-gray-500 transition-transform" />
      {/if}
      
      <svelte:component this={statusConfig.icon} class="h-5 w-5 {statusConfig.iconClass}" />
      
      <div class="flex items-center gap-2">
        {#if totalPhases > 0}
          <span class="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600 font-mono">
            {phaseIndex + 1}/{totalPhases}
          </span>
        {/if}
        <span class="font-semibold {statusConfig.textClass}">{formatPhaseName(phase)}</span>
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
      {#if duration}
        <span class="flex items-center gap-1 text-sm text-gray-600">
          <Clock class="h-3 w-3" />
          {duration}
        </span>
      {/if}
    </div>
  </button>

  <!-- Phase Content -->
  {#if isExpanded}
    <div class="bg-gray-50">
      {#each logsByStep as [stepName, stepLogs]}
        <div class="border-t border-gray-200">
          {#if stepName !== 'General'}
            <div class="px-6 py-2 bg-gray-100">
              <span class="text-sm font-medium text-gray-700">{stepName}</span>
            </div>
          {/if}
          
          <div class="bg-gray-900 overflow-x-auto">
            {#each stepLogs as log, index}
              <div class="px-6 py-1 hover:bg-gray-800/50 transition-colors {getLogLevelClass(log.level)} {index === 0 ? 'pt-2' : ''} {index === stepLogs.length - 1 ? 'pb-2' : ''}">
                <div class="flex items-start gap-3 font-mono text-xs">
                  <span class="text-gray-500 select-none shrink-0 w-20">
                    {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                  <div class="flex-1 whitespace-pre-wrap break-all">
                    {@html formatLogMessage(log.message)}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>