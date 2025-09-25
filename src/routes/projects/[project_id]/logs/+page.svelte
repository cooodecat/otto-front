<script lang="ts">
  import { page } from '$app/stores';
  import ExecutionList from './components/ExecutionList.svelte';
  import ExecutionFilter from './components/ExecutionFilter.svelte';
  import LogDrawer from './components/LogDrawer/LogDrawer.svelte';
  import { RefreshCw } from 'lucide-svelte';

  const projectId = $page.params.project_id!;

  let selectedExecutionId = $state<string | null>(null);
  let filterType = $state<'ALL' | 'BUILD' | 'DEPLOY'>('ALL');
  let isDrawerOpen = $state(false);
  let isRefreshing = $state(false);

  function handleExecutionSelect(executionId: string) {
    selectedExecutionId = executionId;
    isDrawerOpen = true;
  }

  function handleExecutionChange(newExecutionId: string) {
    // Update the selected execution ID when re-run happens
    selectedExecutionId = newExecutionId;
  }

  function handleDrawerClose() {
    isDrawerOpen = false;
    selectedExecutionId = null;
  }

  async function handleRefresh() {
    isRefreshing = true;
    // TODO: Refresh execution list
    setTimeout(() => {
      isRefreshing = false;
    }, 1000);
  }

  // Keyboard navigation
  $effect(() => {
    if (typeof window === 'undefined') return;
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isDrawerOpen) {
        handleDrawerClose();
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
  <div class="mx-auto max-w-7xl p-6">
    <!-- Header Card -->
    <div class="mb-6 overflow-hidden rounded-2xl bg-white shadow-lg">
      <div class="border-b border-gray-100 bg-gradient-to-r from-white to-gray-50 px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Pipeline Logs
            </h1>
            <p class="mt-2 text-sm text-gray-600">
              Monitor and analyze your build and deployment executions
            </p>
          </div>

          <button
            onclick={handleRefresh}
            disabled={isRefreshing}
            class="flex cursor-pointer items-center gap-2.5 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-md hover:shadow-lg hover:bg-gray-50 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            <RefreshCw class="h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
            Refresh
          </button>
        </div>
      </div>

      <!-- Filter Section -->
      <div class="px-8 py-4 bg-gray-50/50">
        <ExecutionFilter bind:filterType />
      </div>
    </div>

    <!-- Execution List Card -->
    <div class="overflow-hidden rounded-2xl bg-white shadow-lg {isDrawerOpen ? 'h-[calc(100vh-280px)]' : 'min-h-[calc(100vh-280px)]'}">
      <div class="h-full {isDrawerOpen ? 'overflow-hidden' : 'overflow-y-auto'}">
        <ExecutionList
          {projectId}
          {filterType}
          {selectedExecutionId}
          onSelect={handleExecutionSelect}
        />
      </div>
    </div>
  </div>
</div>

<!-- Log Drawer -->
{#if isDrawerOpen && selectedExecutionId}
  <LogDrawer
    executionId={selectedExecutionId}
    {projectId}
    onClose={handleDrawerClose}
    onExecutionChange={handleExecutionChange}
  />
{/if}
