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

<div class="h-screen flex flex-col overflow-hidden">
  <!-- Header -->
  <div class="flex-shrink-0 border-b bg-white px-6 py-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900">Pipeline Logs</h1>
        <p class="mt-1 text-sm text-gray-500">View build and deployment logs for your pipelines</p>
      </div>

      <button
        onclick={handleRefresh}
        disabled={isRefreshing}
        class="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw class="h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
        Refresh
      </button>
    </div>

    <!-- Filter -->
    <div class="mt-4">
      <ExecutionFilter bind:filterType />
    </div>
  </div>

  <!-- Execution List -->
  <div class="flex-1 bg-gray-50 {isDrawerOpen ? 'overflow-hidden' : 'overflow-y-auto'}">
    <ExecutionList
      {projectId}
      {filterType}
      {selectedExecutionId}
      onSelect={handleExecutionSelect}
    />
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
