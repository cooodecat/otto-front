<script lang="ts">
  import type { ExecutionMetadata } from '$lib/types/log.types';
  import ExecutionItem from './ExecutionItem.svelte';
  import { logApiService } from '$lib/services/log-api.service';
  import { LogWebSocketService } from '$lib/services/log-websocket.service';
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    projectId: string;
    filterType: 'ALL' | 'BUILD' | 'DEPLOY';
    searchQuery?: string;
    selectedExecutionId: string | null;
    isDrawerOpen?: boolean;
    onSelect: (executionId: string) => void;
  }

  let {
    projectId,
    filterType,
    searchQuery = '',
    selectedExecutionId,
    isDrawerOpen = false,
    onSelect
  }: Props = $props();

  let executions = $state<ExecutionMetadata[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let wsService: LogWebSocketService | null = null;
  let statusUnsubscribe: (() => void) | null = null;
  let pollingInterval: ReturnType<typeof setInterval> | null = null;
  let isManualRefresh = $state(false);
  let _lastUpdateTime = $state<Date | null>(null);
  let newExecutionIds = $state<Set<string>>(new Set());
  let isInitialLoad = $state(true);

  // Load executions from API
  async function loadExecutions(silent = false) {
    // Only show loading state for initial load or manual refresh
    if (!silent) {
      loading = true;
    }
    error = null;
    try {
      const response = await logApiService.getExecutions({
        projectId,
        type: filterType === 'ALL' ? undefined : filterType,
        page: 1,
        pageSize: 50
      });

      // Fetch pipeline names for executions that don't have them
      await fetchMissingPipelineNames(response);

      // For silent updates, only update if there are actual changes
      if (silent) {
        // Check if the data has actually changed
        const hasChanges = JSON.stringify(response) !== JSON.stringify(executions);
        if (hasChanges) {
          // Only highlight new executions if not initial load
          if (!isInitialLoad && executions.length > 0) {
            // Find new executions that weren't in the previous list
            const previousIds = new Set(executions.map((e) => e.executionId));
            const newIds = response
              .filter((e) => !previousIds.has(e.executionId))
              .map((e) => e.executionId);

            // Mark new executions for highlighting
            if (newIds.length > 0) {
              newExecutionIds = new Set([...newExecutionIds, ...newIds]);
              // Clear highlighting after 3 seconds
              setTimeout(() => {
                newExecutionIds = new Set(
                  [...newExecutionIds].filter((id) => !newIds.includes(id))
                );
              }, 3000);
            }
          }

          executions = response;
        }
      } else {
        // For non-silent updates, always update
        // Only highlight new executions if not initial load and is manual refresh
        if (!isInitialLoad && isManualRefresh && executions.length > 0) {
          const previousIds = new Set(executions.map((e) => e.executionId));
          const newIds = response
            .filter((e) => !previousIds.has(e.executionId))
            .map((e) => e.executionId);

          if (newIds.length > 0) {
            newExecutionIds = new Set([...newExecutionIds, ...newIds]);
            setTimeout(() => {
              newExecutionIds = new Set([...newExecutionIds].filter((id) => !newIds.includes(id)));
            }, 3000);
          }
        }

        executions = response;

        // After first load, mark as no longer initial
        if (isInitialLoad) {
          isInitialLoad = false;
        }
      }

      _lastUpdateTime = new Date();
    } catch (err) {
      console.error('Failed to load executions:', err);
      error = err instanceof Error ? err.message : 'Failed to load executions';
      // Fallback to mock data for testing
      if (!silent) {
        executions = getMockExecutions();
      }
      _lastUpdateTime = new Date();
    } finally {
      if (!silent) {
        loading = false;
      }
    }
  }

  // Fetch pipeline names for executions that are missing them
  async function fetchMissingPipelineNames(execs: ExecutionMetadata[]) {
    const { makeFetch } = await import('$lib/utils/make-fetch');
    const api = (await import('$lib/sdk')).default;

    // Create a map to cache pipeline names
    const pipelineNameCache = new Map<string, string>();

    // Process executions in parallel
    const promises = execs.map(async (exec) => {
      if (
        exec.pipelineId &&
        (!exec.pipelineName || exec.pipelineName === 'Unknown Pipeline' || exec.pipelineName === '')
      ) {
        // Check cache first
        if (pipelineNameCache.has(exec.pipelineId)) {
          exec.pipelineName = pipelineNameCache.get(exec.pipelineId)!;
          return;
        }

        try {
          const pipelineInfo = await api.functional.pipelines.getPipelineById(
            makeFetch(),
            exec.pipelineId
          );

          if (pipelineInfo?.pipelineName) {
            exec.pipelineName = pipelineInfo.pipelineName;
            // Cache the pipeline name
            pipelineNameCache.set(exec.pipelineId, pipelineInfo.pipelineName);
          }
        } catch (err) {
          console.error(`Failed to fetch pipeline info for ${exec.pipelineId}:`, err);
        }
      }
    });

    await Promise.all(promises);
  }

  // Public refresh method for manual updates
  export function refresh() {
    isManualRefresh = true;
    loadExecutions(false).then(() => {
      // Show success feedback after manual refresh
      setTimeout(() => {
        isManualRefresh = false;
      }, 1000);
    });
  }

  // Watch for filter changes only
  let previousFilterType = $state(filterType);
  $effect(() => {
    if (filterType !== previousFilterType) {
      previousFilterType = filterType;
      loadExecutions();
    }
  });

  onMount(() => {
    loadExecutions();
    setupWebSocket();
    setupPolling();
  });

  onDestroy(() => {
    cleanupWebSocket();
    cleanupPolling();
  });

  async function setupWebSocket() {
    try {
      // Initialize WebSocket service for status updates
      wsService = new LogWebSocketService();

      // Get auth token from cookies
      const cookies = document.cookie.split(';').map((c) => c.trim());
      const tokenCookie = cookies.find((c) => c.startsWith('access_token='));
      const token = tokenCookie ? tokenCookie.split('=')[1] : '';

      await wsService.connect(token);

      // Subscribe to status updates
      statusUnsubscribe = wsService.status.subscribe((newStatus) => {
        // Update execution status in the list
        executions = executions.map((exec) => {
          if (exec.executionId === selectedExecutionId) {
            return { ...exec, status: newStatus };
          }
          return exec;
        });
      });
    } catch (err) {
      console.error('Failed to setup WebSocket:', err);
    }
  }

  function cleanupWebSocket() {
    if (statusUnsubscribe) {
      statusUnsubscribe();
      statusUnsubscribe = null;
    }
    if (wsService) {
      wsService.disconnect();
      wsService = null;
    }
  }

  function setupPolling() {
    // POLLING DISABLED - Use manual refresh instead
    // pollingInterval = setInterval(() => {
    //   loadExecutions(true);
    // }, 10000);
  }

  function cleanupPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  // Mock data fallback for testing when API is not available
  function getMockExecutions(): ExecutionMetadata[] {
    return [
      {
        executionId: '1',
        buildNumber: 125,
        executionType: 'BUILD',
        status: 'SUCCESS',
        startedAt: new Date().toISOString(),
        duration: 125,
        branch: 'main',
        commitId: 'abc123d',
        commitMessage: 'feat: add login functionality',
        author: 'John Doe',
        pipelineId: 'pipeline-1',
        pipelineName: 'CI/CD Production',
        triggeredBy: 'webhook',
        logStats: {
          totalLines: 1542,
          errorCount: 0,
          warningCount: 3
        }
      },
      {
        executionId: '2',
        buildNumber: 124,
        executionType: 'DEPLOY',
        status: 'FAILED',
        startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
        duration: 120,
        branch: 'main',
        commitId: 'def456g',
        commitMessage: 'fix: resolve deployment issue',
        author: 'Jane Smith',
        pipelineId: 'pipeline-1',
        pipelineName: 'CI/CD Production',
        triggeredBy: 'manual',
        logStats: {
          totalLines: 2341,
          errorCount: 5,
          warningCount: 12
        }
      },
      {
        executionId: '3',
        buildNumber: 123,
        executionType: 'BUILD',
        status: 'RUNNING',
        startedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        duration: 0,
        branch: 'develop',
        commitId: 'ghi789h',
        commitMessage: 'chore: update dependencies',
        author: 'Bob Wilson',
        pipelineId: 'pipeline-2',
        pipelineName: 'Development Pipeline',
        triggeredBy: 'webhook',
        logStats: {
          totalLines: 543,
          errorCount: 0,
          warningCount: 1
        }
      }
    ];
  }

  // Filter executions by search query
  const filteredExecutions = $derived.by(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      return executions;
    }

    const query = searchQuery.toLowerCase().trim();

    return executions.filter((exec) => {
      // Search in multiple fields
      return (
        exec.commitMessage?.toLowerCase().includes(query) ||
        exec.commitId?.toLowerCase().includes(query) ||
        exec.branch?.toLowerCase().includes(query) ||
        exec.author?.toLowerCase().includes(query) ||
        exec.pipelineName?.toLowerCase().includes(query) ||
        exec.executionId?.toLowerCase().includes(query) ||
        exec.buildNumber?.toString().includes(query) ||
        exec.status?.toLowerCase().includes(query)
      );
    });
  });

  // Group executions by date
  const executionGroups = $derived.by(() => {
    const filtered = filteredExecutions;

    // Group by date
    const groups: Map<string, ExecutionMetadata[]> = new Map();

    filtered.forEach((execution) => {
      const date = new Date(execution.startedAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(execution);
    });

    // Sort groups with "Today" first, then "Yesterday", then by date (newest first)
    const sortedGroups = Array.from(groups.entries()).sort(([dateA], [dateB]) => {
      if (dateA === 'Today') return -1;
      if (dateB === 'Today') return 1;
      if (dateA === 'Yesterday') return -1;
      if (dateB === 'Yesterday') return 1;

      // For other dates, parse and compare
      const parsedA = new Date(dateA);
      const parsedB = new Date(dateB);
      return parsedB.getTime() - parsedA.getTime(); // Newer dates first
    });

    return sortedGroups.map(([date, items]) => ({
      date,
      items: items.sort((a, b) => {
        // Sort items within each group by startedAt (newest first)
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      })
    }));
  });

  // Keyboard navigation
  let focusedIndex = $state(0);
  const allExecutions = $derived(executionGroups.flatMap((g) => g.items));

  // Export method to get all executions for navigation
  export function getAllExecutions() {
    return executionGroups.flatMap((g) => g.items);
  }

  $effect(() => {
    if (typeof window === 'undefined') return;

    function handleKeydown(e: KeyboardEvent) {
      // Check if the event target is an input or textarea element
      const target = e.target as HTMLElement;
      const isInputElement =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.contentEditable === 'true';

      // Skip keyboard navigation if typing in an input field or if LogDrawer is open
      if (isInputElement || isDrawerOpen) {
        return;
      }

      // Only handle navigation keys when not in an input
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusedIndex = Math.max(0, focusedIndex - 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusedIndex = Math.min(allExecutions.length - 1, focusedIndex + 1);
      } else if (e.key === 'Enter' && allExecutions[focusedIndex]) {
        e.preventDefault();
        onSelect(allExecutions[focusedIndex].executionId);
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="relative px-8 py-6">
  {#if isManualRefresh}
    <div class="absolute inset-0 z-10 flex animate-pulse items-center justify-center bg-white/80">
      <div class="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white shadow-lg">
        <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
            fill="none"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span class="font-medium">Refreshing...</span>
      </div>
    </div>
  {/if}

  {#if loading && !isManualRefresh}
    <div class="flex justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <div
          class="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
        ></div>
        <p class="text-sm text-gray-500">Loading executions...</p>
      </div>
    </div>
  {:else if error}
    <div
      class="rounded-xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 p-5 shadow-sm"
    >
      <p class="text-sm font-medium text-yellow-800">
        ⚠️ Using mock data: {error}
      </p>
    </div>
  {:else if executionGroups.length === 0}
    <div class="flex flex-col items-center justify-center py-20">
      {#if searchQuery}
        <!-- No search results -->
        <div class="mb-4 rounded-full bg-yellow-100 p-4">
          <svg
            class="h-12 w-12 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <p class="mb-1 text-lg font-medium text-gray-700">No results found</p>
        <p class="text-sm text-gray-500">
          No executions match "{searchQuery}"
        </p>
        <p class="mt-2 text-xs text-gray-400">
          Try searching by commit message, branch, author, or pipeline name
        </p>
      {:else}
        <!-- No executions at all -->
        <div class="mb-4 rounded-full bg-gray-100 p-4">
          <svg
            class="h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p class="mb-1 text-lg font-medium text-gray-700">No executions yet</p>
        <p class="text-sm text-gray-500">Pipeline executions will appear here</p>
      {/if}
    </div>
  {:else}
    {#each executionGroups as group}
      <div class="mb-8">
        <h3
          class="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-500 uppercase"
        >
          <span class="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"
          ></span>
          <span>{group.date}</span>
          <span class="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"
          ></span>
        </h3>
        <div class="space-y-3">
          {#each group.items as execution}
            <ExecutionItem
              {execution}
              isSelected={selectedExecutionId === execution.executionId}
              isFocused={allExecutions[focusedIndex]?.executionId === execution.executionId}
              isNew={newExecutionIds.has(execution.executionId)}
              {onSelect}
            />
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>
