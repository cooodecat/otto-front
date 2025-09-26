<script lang="ts">
  import { Search, X } from 'lucide-svelte';

  interface Props {
    filterType: 'ALL' | 'BUILD' | 'DEPLOY';
    searchQuery?: string;
    onSearch?: (query: string) => void;
  }

  let { filterType = $bindable(), searchQuery = $bindable(''), onSearch }: Props = $props();

  let searchInput = $state('');
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  const filterOptions = [
    { value: 'ALL', label: 'All' },
    { value: 'BUILD', label: 'Build' },
    { value: 'DEPLOY', label: 'Deploy' }
  ] as const;

  // Initialize search input with prop value
  $effect(() => {
    if (searchQuery !== undefined) {
      searchInput = searchQuery;
    }
  });

  // Debounced search
  function handleSearchInput() {
    if (searchTimeout) clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
      searchQuery = searchInput;
      onSearch?.(searchInput);
    }, 300); // 300ms debounce
  }

  function clearSearch() {
    searchInput = '';
    searchQuery = '';
    onSearch?.('');
  }

  // Handle Enter key for immediate search
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (searchTimeout) clearTimeout(searchTimeout);
      searchQuery = searchInput;
      onSearch?.(searchInput);
    } else if (event.key === 'Escape') {
      clearSearch();
    }
  }
</script>

<div class="flex items-center gap-4">

  <!-- Search Input -->
  <div class="max-w-md flex-1">
    <div class="relative">
      <Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        bind:value={searchInput}
        oninput={handleSearchInput}
        onkeydown={handleKeydown}
        placeholder="Search by Pipeline"
        class="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-10 pl-10 text-sm shadow-sm transition-all duration-200 hover:shadow-md focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
      />
      {#if searchInput}
        <button
          onclick={clearSearch}
          class="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title="Clear search"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      {/if}
    </div>
  </div>
</div>
