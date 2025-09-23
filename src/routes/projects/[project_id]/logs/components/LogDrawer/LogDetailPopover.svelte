<script lang="ts">
  import { X, Clock, AlertCircle, Copy, Maximize2 } from 'lucide-svelte';
  import { fly, fade } from 'svelte/transition';
  import type { LogEntry } from '$lib/types/log.types';
  
  interface Props {
    log: LogEntry;
    onClose: () => void;
    relatedLogs?: LogEntry[];
    onPrev?: () => void;
    onNext?: () => void;
    currentIndex?: number;
    totalCount?: number;
  }
  
  let { log, onClose, relatedLogs = [], onPrev, onNext, currentIndex = 0, totalCount = 0 }: Props = $props();
  
  let copied = $state(false);
  
  async function copyToClipboard() {
    await navigator.clipboard.writeText(log.message);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }
  
  function formatJsonIfPossible(text: string): { isJson: boolean; formatted?: string } {
    try {
      // Check if the message contains JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { isJson: true, formatted: JSON.stringify(parsed, null, 2) };
      }
    } catch (e) {
      // Not JSON
    }
    return { isJson: false };
  }
  
  const jsonCheck = $derived(formatJsonIfPossible(log.message));
  
  function getLevelBadgeClass(level: string): string {
    switch (level) {
      case 'error': return 'bg-red-100 text-red-700 border-red-300';
      case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'info': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  }

  // Keyboard navigation when popover is open
  $effect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onPrev?.();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onNext?.();
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeydown);
      return () => window.removeEventListener('keydown', handleKeydown);
    }
  });
</script>

<!-- Backdrop -->
<button
  class="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm cursor-pointer"
  onclick={onClose}
  transition:fade={{ duration: 150 }}
  aria-label="Close detail view"
></button>

<!-- Popover -->
<div
  class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[90%] max-w-3xl max-h-[80vh] 
         bg-white rounded-xl shadow-2xl overflow-hidden ring-1 ring-gray-200/50 flex flex-col"
  transition:fly={{ y: 20, duration: 200 }}
>
  <!-- Header -->
  <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
    <div class="flex items-center gap-3">
      <h3 class="font-semibold text-gray-900">Log Details</h3>
      <span class="px-2 py-1 text-xs font-medium rounded-full border {getLevelBadgeClass(log.level)}">
        {log.level.toUpperCase()}
      </span>
      {#if totalCount > 0}
        <span class="text-xs text-gray-500">{currentIndex + 1}/{totalCount}</span>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      {#if onPrev}
        <button
          onclick={onPrev}
          class="p-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          title="Previous (Arrow Up)"
        >
          ↑
        </button>
      {/if}
      {#if onNext}
        <button
          onclick={onNext}
          class="p-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          title="Next (Arrow Down)"
        >
          ↓
        </button>
      {/if}
      <button
        onclick={copyToClipboard}
        class="p-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
        title="Copy message"
      >
        {#if copied}
          <span class="text-xs text-green-600 font-medium">Copied!</span>
        {:else}
          <Copy class="h-4 w-4 text-gray-600" />
        {/if}
      </button>
      <button
        onclick={onClose}
        class="p-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
      >
        <X class="h-4 w-4 text-gray-600" />
      </button>
    </div>
  </div>
  
  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-6 space-y-4">
    <!-- Metadata -->
    <div class="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200">
      <div>
        <div class="text-xs text-gray-500 mb-1">Timestamp</div>
        <div class="flex items-center gap-2 text-sm font-mono">
          <Clock class="h-3 w-3 text-gray-400" />
          {new Date(log.timestamp).toLocaleString()}
        </div>
      </div>
      
      {#if log.phase}
        <div>
          <div class="text-xs text-gray-500 mb-1">Phase</div>
          <div class="text-sm font-medium text-gray-900">{log.phase}</div>
        </div>
      {/if}
      
      {#if log.step}
        <div>
          <div class="text-xs text-gray-500 mb-1">Step</div>
          <div class="text-sm font-medium text-gray-900">{log.step}</div>
        </div>
      {/if}
      
      {#if log.duration}
        <div>
          <div class="text-xs text-gray-500 mb-1">Duration</div>
          <div class="text-sm font-mono text-gray-900">{log.duration}ms</div>
        </div>
      {/if}
    </div>
    
    <!-- Message -->
    <div>
      <div class="text-xs text-gray-500 mb-2">Message</div>
      {#if jsonCheck.isJson && jsonCheck.formatted}
        <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono">{jsonCheck.formatted}</pre>
      {:else}
        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap break-all">
          {log.message}
        </div>
      {/if}
    </div>
    
    <!-- Related Logs Context -->
    {#if relatedLogs.length > 0}
      <div>
        <div class="text-xs text-gray-500 mb-2">Context (nearby logs)</div>
        <div class="bg-gray-50 rounded-lg p-3 space-y-1">
          {#each relatedLogs as relatedLog}
            <div class="flex items-start gap-3 text-xs font-mono {relatedLog.timestamp === log.timestamp ? 'bg-blue-100 -mx-3 px-3 py-1 rounded' : ''}">
              <span class="text-gray-500 shrink-0">
                {new Date(relatedLog.timestamp).toLocaleTimeString()}
              </span>
              <span class="flex-1 whitespace-pre-wrap break-all {
                relatedLog.level === 'error' ? 'text-red-600' : 
                relatedLog.level === 'warning' ? 'text-yellow-600' : 
                'text-gray-700'
              }">
                {relatedLog.message}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    <!-- Additional Details -->
    {#if log.metadata}
      <div>
        <div class="text-xs text-gray-500 mb-2">Additional Metadata</div>
        <pre class="bg-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{JSON.stringify(log.metadata, null, 2)}
        </pre>
      </div>
    {/if}
  </div>
</div>
