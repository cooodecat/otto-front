<script lang="ts">
  import { ChevronDown, ChevronRight, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-svelte';
  import type { LogEntry } from '$lib/types/log.types';
  
  interface Props {
    phase: string;
    logs: LogEntry[];
    status?: 'pending' | 'running' | 'success' | 'failed';
    startTime?: string;
    endTime?: string;
    initialExpanded?: boolean;
  }

  let { 
    phase, 
    logs = [], 
    status = 'pending',
    startTime,
    endTime,
    initialExpanded = false 
  }: Props = $props();

  let isExpanded = $state(initialExpanded);
  
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

  // Status icon and color
  const statusConfig = $derived.by(() => {
    switch (status) {
      case 'success':
        return { icon: CheckCircle, class: 'text-green-600', bgClass: 'bg-green-50' };
      case 'failed':
        return { icon: XCircle, class: 'text-red-600', bgClass: 'bg-red-50' };
      case 'running':
        return { icon: Loader2, class: 'text-blue-600 animate-spin', bgClass: 'bg-blue-50' };
      default:
        return { icon: AlertCircle, class: 'text-gray-400', bgClass: 'bg-gray-50' };
    }
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
</script>

<div class="border-b border-gray-200">
  <!-- Phase Header -->
  <button
    onclick={toggleExpanded}
    class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors {statusConfig.bgClass}"
  >
    <div class="flex items-center gap-3">
      {#if isExpanded}
        <ChevronDown class="h-4 w-4 text-gray-500" />
      {:else}
        <ChevronRight class="h-4 w-4 text-gray-500" />
      {/if}
      
      <svelte:component this={statusConfig.icon} class="h-5 w-5 {statusConfig.class}" />
      
      <span class="font-medium text-gray-900">{phase}</span>
      
      {#if logs.length > 0}
        <span class="text-sm text-gray-500">({logs.length} logs)</span>
      {/if}
    </div>
    
    {#if duration}
      <span class="text-sm text-gray-500">{duration}</span>
    {/if}
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
          
          <div class="px-6 py-2 bg-gray-900 overflow-x-auto">
            <pre class="text-xs text-gray-300 font-mono">
{#each stepLogs as log}
<span class={log.level === 'error' ? 'text-red-400' : log.level === 'warning' ? 'text-yellow-400' : ''}>
{new Date(log.timestamp).toLocaleTimeString()} {log.message}
</span>
{/each}
            </pre>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>