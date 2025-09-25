<script lang="ts">
  import type { ExecutionMetadata } from '$lib/types/log.types';
  import ExecutionItem from './ExecutionItem.svelte';
  import { logApiService } from '$lib/services/log-api.service';
  import { onMount } from 'svelte';

  interface Props {
    projectId: string;
    filterType: 'ALL' | 'BUILD' | 'DEPLOY';
    selectedExecutionId: string | null;
    onSelect: (executionId: string) => void;
  }

  let { projectId, filterType, selectedExecutionId, onSelect }: Props = $props();

  let executions = $state<ExecutionMetadata[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Load executions from API
  async function loadExecutions() {
    loading = true;
    error = null;
    try {
      const response = await logApiService.getExecutions({
        projectId,
        type: filterType === 'ALL' ? undefined : filterType,
        page: 1,
        pageSize: 50
      });
      // API returns ExecutionMetadata[] directly
      executions = response;
    } catch (err) {
      console.error('Failed to load executions:', err);
      error = err instanceof Error ? err.message : 'Failed to load executions';
      // Fallback to mock data for testing
      executions = getMockExecutions();
    } finally {
      loading = false;
    }
  }

  // Watch for filter changes
  $effect(() => {
    loadExecutions();
  });

  onMount(() => {
    loadExecutions();
  });

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

  // Group executions by date
  const executionGroups = $derived.by(() => {
    const filtered = executions;

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

  $effect(() => {
    if (typeof window === 'undefined') return;
    function handleKeydown(e: KeyboardEvent) {
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

<div class="px-8 py-6">
  {#if loading}
    <div class="flex justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <div class="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
        <p class="text-sm text-gray-500">Loading executions...</p>
      </div>
    </div>
  {:else if error}
    <div class="rounded-xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 p-5 shadow-sm">
      <p class="text-sm font-medium text-yellow-800">
        ⚠️ Using mock data: {error}
      </p>
    </div>
  {:else if executionGroups.length === 0}
    <div class="flex flex-col items-center justify-center py-20">
      <div class="rounded-full bg-gray-100 p-4 mb-4">
        <svg class="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p class="text-lg font-medium text-gray-700 mb-1">No executions yet</p>
      <p class="text-sm text-gray-500">Pipeline executions will appear here</p>
    </div>
  {:else}
    {#each executionGroups as group}
      <div class="mb-8">
        <h3 class="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
          <span class="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></span>
          <span>{group.date}</span>
          <span class="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></span>
        </h3>
        <div class="space-y-3">
          {#each group.items as execution}
            <ExecutionItem
              {execution}
              isSelected={selectedExecutionId === execution.executionId}
              isFocused={allExecutions[focusedIndex]?.executionId === execution.executionId}
              {onSelect}
            />
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>
