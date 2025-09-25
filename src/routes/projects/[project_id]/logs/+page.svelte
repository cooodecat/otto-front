<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import api from '$lib/sdk';
  import { makeFetch } from '$lib/utils/make-fetch';
  import ExecutionList from './components/ExecutionList.svelte';
  import ExecutionFilter from './components/ExecutionFilter.svelte';
  import LogDrawer from './components/LogDrawer/LogDrawer.svelte';
  import { RefreshCw, ChevronRight, House } from 'lucide-svelte';
  import type { ExecutionMetadata } from '$lib/types/log.types';

  const projectId = $page.params.project_id!;

  let projectName = $state('Loading...');

  let selectedExecutionId = $state<string | null>(null);
  let filterType = $state<'ALL' | 'BUILD' | 'DEPLOY'>('ALL');
  let searchQuery = $state('');
  let isDrawerOpen = $state(false);
  let isRefreshing = $state(false);
  let executionListRef = $state<{
    refresh?: () => void;
    getAllExecutions?: () => ExecutionMetadata[];
  } | null>(null);
  let savedScrollPosition = $state({ x: 0, y: 0 });

  onMount(async () => {
    await loadProjectInfo();
  });

  async function loadProjectInfo() {
    try {
      const project = await api.functional.projects.getProject(makeFetch({ fetch }), projectId);
      projectName = project.projectName;
    } catch (err) {
      console.error('Error loading project info:', err);
      projectName = 'Project';
    }
  }

  function handleExecutionSelect(executionId: string) {
    console.log('[+page.svelte] handleExecutionSelect called');
    console.log('[+page.svelte] Current scroll position before opening:', window.scrollY);

    // Save scroll position BEFORE opening drawer
    savedScrollPosition = {
      x: window.scrollX,
      y: window.scrollY
    };

    selectedExecutionId = executionId;
    isDrawerOpen = true;

    // Check scroll position after state change
    requestAnimationFrame(() => {
      console.log('[+page.svelte] Scroll position after opening drawer:', window.scrollY);
    });
  }

  // Get all execution IDs for navigation
  function getAllExecutionIds(): string[] {
    if (!executionListRef?.getAllExecutions) return [];
    const allExecutions = executionListRef.getAllExecutions();
    return allExecutions.map((exec: ExecutionMetadata) => exec.executionId);
  }

  // Navigate to previous/next execution
  function navigateExecution(direction: 'prev' | 'next') {
    const allIds = getAllExecutionIds();
    if (!selectedExecutionId || allIds.length === 0) return;

    const currentIndex = allIds.indexOf(selectedExecutionId);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'prev') {
      newIndex = Math.max(0, currentIndex - 1);
    } else {
      newIndex = Math.min(allIds.length - 1, currentIndex + 1);
    }

    if (newIndex !== currentIndex) {
      // Update the selected execution ID to load new data
      selectedExecutionId = allIds[newIndex];
      // Notify about the execution change if needed
      if (handleExecutionChange) {
        handleExecutionChange(allIds[newIndex]);
      }
    }
  }

  function handleExecutionChange(newExecutionId: string, isRerun?: boolean) {
    // Update the selected execution ID when re-run happens
    selectedExecutionId = newExecutionId;

    // If this is from a re-run, refresh the execution list after a delay
    if (isRerun && executionListRef?.refresh) {
      // Wait a bit for the new execution to be created in the backend
      setTimeout(() => {
        if (executionListRef?.refresh) {
          executionListRef.refresh();
        }
      }, 2000);
    }
  }

  function handleRerunSuccess() {
    // Immediately refresh the list when re-run is successful
    if (executionListRef?.refresh) {
      // Small delay to ensure the backend has created the new execution
      setTimeout(() => {
        if (executionListRef?.refresh) {
          executionListRef.refresh();
        }
      }, 1500);
    }
  }

  function handleDrawerClose() {
    console.log('handleDrawerClose called');
    isDrawerOpen = false;
    selectedExecutionId = null;

    // Optionally refresh the list when drawer closes
    // This ensures any status changes during viewing are reflected
    if (executionListRef?.refresh) {
      executionListRef?.refresh();
    }
  }

  async function handleRefresh() {
    if (isRefreshing) return;

    isRefreshing = true;

    // Call the refresh method on ExecutionList component
    if (executionListRef?.refresh) {
      executionListRef.refresh();
    }

    // Reset the refreshing state after animation
    setTimeout(() => {
      isRefreshing = false;
    }, 1500);
  }

  function handleSearch(query: string) {
    // Search will be handled by ExecutionList component via reactive prop
    console.log('Search query:', query);
  }

  // Keyboard navigation
  $effect(() => {
    if (typeof window === 'undefined') return;
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isDrawerOpen) {
        e.preventDefault();
        e.stopPropagation();
        handleDrawerClose();
      }
    }

    // Only add listener when drawer is open
    if (isDrawerOpen) {
      window.addEventListener('keydown', handleKeydown, true);
      return () => window.removeEventListener('keydown', handleKeydown, true);
    }
  });
</script>

<!-- Breadcrumb Navigation -->
<div class="bg-white/90 backdrop-blur">
  <div class="mx-auto max-w-7xl px-6 py-4">
    <nav aria-label="Breadcrumb">
      <ol class="flex items-center space-x-2 text-sm">
        <li>
          <a
            href="/projects"
            class="flex items-center gap-1 text-gray-500 transition-colors hover:text-gray-700"
          >
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
            <h1
              class="bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-3xl font-bold text-transparent"
            >
              로그
            </h1>
            <p class="mt-2 text-sm text-gray-600">
              빌드 및 배포 실행 로그를 모니터링하고 분석합니다
            </p>
          </div>

          <button
            onclick={handleRefresh}
            disabled={isRefreshing}
            class="group relative flex cursor-pointer items-center gap-2.5 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-md transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100"
          >
            <RefreshCw
              class="h-4 w-4 transition-transform duration-500 {isRefreshing
                ? 'animate-spin'
                : 'group-hover:rotate-180'}"
            />
            <span class={isRefreshing ? 'text-blue-600' : ''}>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </span>
            {#if isRefreshing}
              <div class="absolute inset-0 animate-pulse rounded-xl bg-blue-500/10"></div>
            {/if}
          </button>
        </div>
      </div>

      <!-- Filter Section -->
      <div class="bg-gray-50/50 px-8 py-4">
        <ExecutionFilter bind:filterType bind:searchQuery onSearch={handleSearch} />
      </div>
    </div>

    <!-- Execution List Card -->
    <div
      class="overflow-hidden rounded-2xl bg-white shadow-lg {isDrawerOpen
        ? 'h-[calc(100vh-320px)]'
        : 'min-h-[calc(100vh-320px)]'}"
    >
      <div class="h-full {isDrawerOpen ? 'overflow-hidden' : 'overflow-y-auto'}">
        <ExecutionList
          bind:this={executionListRef}
          {projectId}
          {filterType}
          {searchQuery}
          {selectedExecutionId}
          {isDrawerOpen}
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
    initialScrollPosition={savedScrollPosition}
    onClose={handleDrawerClose}
    onExecutionChange={handleExecutionChange}
    onNavigate={navigateExecution}
    onRerunSuccess={handleRerunSuccess}
  />
{/if}
