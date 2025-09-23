<script lang="ts">
  import type { ExecutionMetadata, ExecutionGroup } from '$lib/types/log.types';
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

    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      items
    }));
  });

  // Keyboard navigation
  let focusedIndex = $state(0);
  const allExecutions = $derived(executionGroups.flatMap((g) => g.items));

  $effect(() => {
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

<div class="px-6 py-4">
  {#if loading}
    <div class="flex justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
    </div>
  {:else if error}
    <div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <p class="text-sm text-yellow-800">
        ⚠️ Using mock data: {error}
      </p>
    </div>
  {:else if executionGroups.length === 0}
    <div class="py-12 text-center">
      <p class="text-gray-500">No pipeline executions found</p>
    </div>
  {:else}
    {#each executionGroups as group}
      <div class="mb-6">
        <h3 class="mb-3 text-sm font-medium text-gray-500">{group.date}</h3>
        <div class="space-y-2">
          {#each group.items as execution, index}
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
