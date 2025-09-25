<script lang="ts">
  import type { ParsedLogSegment } from '$lib/utils/log-parser';

  interface Props {
    segment: ParsedLogSegment;
  }

  let { segment }: Props = $props();
</script>

{#if segment.className}
  <span class={segment.className}>{segment.content}</span>
{:else if segment.type === 'text'}
  <span>{segment.content}</span>
{:else if segment.type === 'error'}
  <span class="rounded bg-red-900/30 px-1 font-bold text-red-400">{segment.content}</span>
{:else if segment.type === 'warning'}
  <span class="rounded bg-yellow-900/30 px-1 font-bold text-yellow-400">{segment.content}</span>
{:else if segment.type === 'success'}
  <span class="font-bold text-green-400">{segment.content}</span>
{:else if segment.type === 'command'}
  <span class="text-purple-400">{segment.content}</span>
{:else if segment.type === 'path'}
  <span class="text-cyan-400">{segment.content}</span>
{:else if segment.type === 'url'}
  <span class="text-blue-400 underline">{segment.content}</span>
{:else if segment.type === 'number' || segment.type === 'time'}
  <span class="text-orange-300">{segment.content}</span>
{:else if segment.type === 'keyword'}
  <span class="text-blue-400">{segment.content}</span>
{:else}
  <span>{segment.content}</span>
{/if}
