<script lang="ts">
  import { Search } from 'lucide-svelte';

  interface Props {
    filterType: 'ALL' | 'BUILD' | 'DEPLOY';
  }

  let { filterType = $bindable() }: Props = $props();

  let searchQuery = $state('');

  const filterOptions = [
    { value: 'ALL', label: 'All' },
    { value: 'BUILD', label: 'Build' },
    { value: 'DEPLOY', label: 'Deploy' }
  ] as const;
</script>

<div class="flex items-center gap-4">
  <!-- Filter Tabs -->
  <div class="flex rounded-lg border border-gray-200 bg-white p-1">
    {#each filterOptions as option}
      <button
        onclick={() => (filterType = option.value)}
        class="rounded-md px-4 py-2 text-sm font-medium transition-colors {filterType ===
        option.value
          ? 'bg-blue-500 text-white'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
      >
        {option.label}
      </button>
    {/each}
  </div>

  <!-- Search Input -->
  <div class="max-w-md flex-1">
    <div class="relative">
      <Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search pipeline logs..."
        class="w-full rounded-lg border border-gray-200 py-2 pr-4 pl-10 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
    </div>
  </div>
</div>
