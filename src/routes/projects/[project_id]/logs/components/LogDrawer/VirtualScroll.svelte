<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  
  interface Props<T> {
    items: T[];
    itemHeight: number;
    height: number;
    children: Snippet<[T, number]>;
  }

  let { items, itemHeight, height, children }: Props<T> = $props();
  
  let scrollTop = $state(0);
  let containerEl: HTMLDivElement;
  
  // Calculate visible range
  const visibleStart = $derived(Math.floor(scrollTop / itemHeight));
  const visibleEnd = $derived(Math.min(
    items.length,
    Math.ceil((scrollTop + height) / itemHeight)
  ));
  
  // Add buffer for smooth scrolling
  const bufferSize = 5;
  const renderStart = $derived(Math.max(0, visibleStart - bufferSize));
  const renderEnd = $derived(Math.min(items.length, visibleEnd + bufferSize));
  
  // Items to render
  const visibleItems = $derived(
    items.slice(renderStart, renderEnd).map((item, i) => ({
      item,
      index: renderStart + i,
      top: (renderStart + i) * itemHeight
    }))
  );
  
  // Total height for scrollbar
  const totalHeight = $derived(items.length * itemHeight);
  
  function handleScroll() {
    if (containerEl) {
      scrollTop = containerEl.scrollTop;
    }
  }
</script>

<div
  bind:this={containerEl}
  onscroll={handleScroll}
  class="relative overflow-y-auto"
  style="height: {height}px"
>
  <div style="height: {totalHeight}px; position: relative;">
    {#each visibleItems as { item, index, top } (index)}
      <div
        style="position: absolute; top: {top}px; left: 0; right: 0; height: {itemHeight}px;"
      >
        {@render children(item, index)}
      </div>
    {/each}
  </div>
</div>