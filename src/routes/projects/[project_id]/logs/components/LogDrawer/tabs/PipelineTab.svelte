<script lang="ts">
  import type { ExecutionMetadata } from '$lib/types/log.types';
  import { Edit3, RefreshCw, CheckCircle, Clock } from 'lucide-svelte';

  interface Props {
    execution: ExecutionMetadata;
  }

  let { execution }: Props = $props();

  // Mock pipeline steps - will be fetched from API
  const pipelineSteps = [
    { name: 'npm install', duration: 15, status: 'completed' },
    { name: 'npm run build', duration: 45, status: 'completed' },
    { name: 'npm test', duration: 30, status: 'completed' },
    { name: 'deploy to S3', duration: 25, status: 'running' }
  ];

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
</script>

<div class="p-6">
  <div class="space-y-6">
    <!-- Pipeline Info -->
    <div>
      <h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <span>📋</span>
        {execution.pipelineName}
      </h3>

      <div class="rounded-lg bg-gray-50 p-4">
        <h4 class="mb-3 font-medium text-gray-700">Executed Steps:</h4>
        <div class="space-y-2">
          {#each pipelineSteps as step}
            <div
              class="flex items-center justify-between rounded border border-gray-200 bg-white px-3 py-2"
            >
              <div class="flex items-center gap-3">
                {#if step.status === 'completed'}
                  <CheckCircle class="h-4 w-4 text-green-500" />
                {:else}
                  <Clock class="h-4 w-4 animate-spin text-blue-500" />
                {/if}
                <span class="font-medium">{step.name}</span>
              </div>
              <span class="text-sm text-gray-500">({formatDuration(step.duration)})</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Configuration -->
    <div>
      <h4 class="mb-2 font-medium text-gray-700">Configuration:</h4>
      <div class="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-600">Trigger:</span>
          <span class="font-medium">{execution.triggeredBy}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Environment:</span>
          <span class="font-medium">Production</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Node Version:</span>
          <span class="font-medium">18.x</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Build Number:</span>
          <span class="font-medium">#{execution.buildNumber}</span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-3 border-t pt-4">
      <button
        class="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <Edit3 class="h-4 w-4" />
        Edit Pipeline
      </button>
      <button
        class="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        <RefreshCw class="h-4 w-4" />
        Re-run
      </button>
    </div>
  </div>
</div>
