<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import api from '$lib/sdk';
  import { makeFetch } from '$lib/utils/make-fetch';
  import ExecutionList from './components/ExecutionList.svelte';
  import ExecutionFilter from './components/ExecutionFilter.svelte';
  import LogDrawer from './components/LogDrawer/LogDrawer.svelte';
  import { RefreshCw, ChevronRight, House } from 'lucide-svelte';

  const projectId = $page.params.project_id!;
  
  let projectName = $state('Loading...');

  let selectedExecutionId = $state<string | null>(null);
  let filterType = $state<'ALL' | 'BUILD' | 'DEPLOY'>('ALL');
  let isDrawerOpen = $state(false);
  let isRefreshing = $state(false);

  onMount(async () => {
    await loadProjectInfo();
  });

  async function loadProjectInfo() {
    try {
      const project = await api.functional.projects.getProject(
        makeFetch({ fetch }), 
        projectId
      );
      projectName = project.projectName;
    } catch (err) {
      console.error('Error loading project info:', err);
      projectName = 'Project';
    }
  }

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

<!-- Breadcrumb Navigation -->
<div class="bg-white/90 backdrop-blur">
  <div class="mx-auto max-w-7xl px-6 py-4">
    <nav aria-label="Breadcrumb">
      <ol class="flex items-center space-x-2 text-sm">
        <li>
          <a href="/projects" class="flex items-center gap-1 text-gray-500 transition-colors hover:text-gray-700">
            <House class="h-4 w-4" />
            <span>프로젝트</span>
          </a>
        </li>
        <li>
          <ChevronRight class="h-4 w-4 text-gray-400" />
        </li>
        <li>
          <a
            href={`/projects/${projectId}/pipelines`}
            class="text-gray-500 transition-colors hover:text-gray-700"
          >
            {projectName}
          </a>
        </li>
        <li>
          <ChevronRight class="h-4 w-4 text-gray-400" />
        </li>
        <li>
          <span class="font-medium text-gray-900">로그</span>
        </li>
      </ol>
    </nav>
  </div>
</div>

<div class="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
  <div class="mx-auto max-w-6xl px-6 py-8">
    <!-- Header Card -->
    <div class="mb-6 overflow-hidden rounded-2xl bg-white shadow-lg">
      <div class="border-b border-gray-100 bg-gradient-to-r from-white to-gray-50 px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              로그
            </h1>
            <p class="mt-2 text-sm text-gray-600">
              빌드 및 배포 실행 로그를 모니터링하고 분석합니다
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
      <div class="bg-gray-50/50 px-8 py-4">
        <ExecutionFilter bind:filterType />
      </div>
    </div>

    <!-- Execution List Card -->
    <div class="overflow-hidden rounded-2xl bg-white shadow-lg {isDrawerOpen ? 'h-[calc(100vh-320px)]' : 'min-h-[calc(100vh-320px)]'}">
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
