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

  let {
    log,
    onClose,
    relatedLogs = [],
    onPrev,
    onNext,
    currentIndex = 0,
    totalCount = 0
  }: Props = $props();

  let copied = $state(false);

  async function copyToClipboard() {
    await navigator.clipboard.writeText(log.message);
    copied = true;
    setTimeout(() => (copied = false), 2000);
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
      case 'error':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'info':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
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
  class="fixed inset-0 z-[60] cursor-pointer bg-black/20 backdrop-blur-sm"
  onclick={onClose}
  transition:fade={{ duration: 150 }}
  aria-label="Close detail view"
></button>

<!-- Popover -->
<div
  class="fixed top-1/2 left-1/2 z-[61] flex max-h-[80vh] w-[90%] max-w-3xl -translate-x-1/2
         -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-gray-200/50"
  transition:fly={{ y: 20, duration: 200 }}
>
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
    <div class="flex items-center gap-3">
      <h3 class="font-semibold text-gray-900">Log Details</h3>
      <span
        class="rounded-full border px-2 py-1 text-xs font-medium {getLevelBadgeClass(log.level)}"
      >
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
          class="cursor-pointer rounded-lg p-2 transition-colors hover:bg-gray-200"
          title="Previous (Arrow Up)"
        >
          ↑
        </button>
      {/if}
      {#if onNext}
        <button
          onclick={onNext}
          class="cursor-pointer rounded-lg p-2 transition-colors hover:bg-gray-200"
          title="Next (Arrow Down)"
        >
          ↓
        </button>
      {/if}
      <button
        onclick={copyToClipboard}
        class="cursor-pointer rounded-lg p-2 transition-colors hover:bg-gray-200"
        title="Copy message"
      >
        {#if copied}
          <span class="text-xs font-medium text-green-600">Copied!</span>
        {:else}
          <Copy class="h-4 w-4 text-gray-600" />
        {/if}
      </button>
      <button
        onclick={onClose}
        class="cursor-pointer rounded-lg p-2 transition-colors hover:bg-gray-200"
      >
        <X class="h-4 w-4 text-gray-600" />
      </button>
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 space-y-4 overflow-y-auto p-6">
    <!-- Metadata -->
    <div class="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4">
      <div>
        <div class="mb-1 text-xs text-gray-500">Timestamp</div>
        <div class="flex items-center gap-2 font-mono text-sm">
          <Clock class="h-3 w-3 text-gray-400" />
          {new Date(log.timestamp).toLocaleString()}
        </div>
      </div>

      {#if log.phase}
        <div>
          <div class="mb-1 text-xs text-gray-500">Phase</div>
          <div class="text-sm font-medium text-gray-900">{log.phase}</div>
        </div>
      {/if}

      {#if log.step}
        <div>
          <div class="mb-1 text-xs text-gray-500">Step</div>
          <div class="text-sm font-medium text-gray-900">{log.step}</div>
        </div>
      {/if}

      {#if log.duration}
        <div>
          <div class="mb-1 text-xs text-gray-500">Duration</div>
          <div class="font-mono text-sm text-gray-900">{log.duration}ms</div>
        </div>
      {/if}
    </div>

    <!-- Message -->
    <div>
      <div class="mb-2 text-xs text-gray-500">Message</div>
      {#if jsonCheck.isJson && jsonCheck.formatted}
        <pre
          class="overflow-x-auto rounded-lg bg-gray-900 p-4 font-mono text-xs text-gray-100">{jsonCheck.formatted}</pre>
      {:else}
        <div
          class="rounded-lg bg-gray-900 p-4 font-mono text-sm break-all whitespace-pre-wrap text-gray-100"
        >
          {log.message}
        </div>
      {/if}
    </div>

    <!-- Related Logs Context -->
    {#if relatedLogs.length > 0}
      <div>
        <div class="mb-2 text-xs text-gray-500">Context (nearby logs)</div>
        <div class="space-y-1 rounded-lg bg-gray-50 p-3">
          {#each relatedLogs as relatedLog}
            <div
              class="flex items-start gap-3 font-mono text-xs {relatedLog.timestamp ===
              log.timestamp
                ? '-mx-3 rounded bg-blue-100 px-3 py-1'
                : ''}"
            >
              <span class="shrink-0 text-gray-500">
                {new Date(relatedLog.timestamp).toLocaleTimeString()}
              </span>
              <span
                class="flex-1 break-all whitespace-pre-wrap {relatedLog.level === 'error'
                  ? 'text-red-600'
                  : relatedLog.level === 'warning'
                    ? 'text-yellow-600'
                    : 'text-gray-700'}"
              >
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
        <div class="mb-2 text-xs text-gray-500">Additional Metadata</div>
        <pre class="overflow-x-auto rounded-lg bg-gray-100 p-3 font-mono text-xs">
{JSON.stringify(log.metadata, null, 2)}
        </pre>
      </div>
    {/if}
  </div>
</div>
