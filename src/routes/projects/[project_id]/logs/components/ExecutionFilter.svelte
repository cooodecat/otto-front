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
  <div class="flex rounded-xl bg-gray-100 p-1 shadow-inner">
    {#each filterOptions as option (option)}
      <button
        onclick={() => (filterType = option.value)}
        class="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 {filterType ===
        option.value
          ? 'bg-white text-blue-600 shadow-md'
          : 'text-gray-600 hover:text-gray-900'}"
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
        class="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 text-sm shadow-sm transition-all duration-200 hover:shadow-md focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
      />
    </div>
  </div>
</div>
