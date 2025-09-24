<script lang="ts">
  import type { ExecutionMetadata } from '$lib/types/log.types';
  import { Edit3, RefreshCw, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import api from '$lib/sdk';
  import { makeFetch } from '$lib/utils/make-fetch';

  interface Props {
    execution: ExecutionMetadata;
    onNewExecution?: (executionId: string) => void;
  }

  interface PipelineStep {
    name: string;
    command?: string;
    duration?: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
  }

  let { execution, onNewExecution }: Props = $props();
  let isRerunning = $state(false);
  let rerunError = $state<string | null>(null);

  const projectId = $page.params.project_id!;

  // Parse pipeline steps from execution metadata
  const pipelineSteps = $derived.by(() => {
    const metadata = execution.metadata as Record<string, unknown>;

    // Check if steps are provided in metadata
    if (metadata?.steps && Array.isArray(metadata.steps)) {
      return metadata.steps as PipelineStep[];
    }

    // Fallback: generate steps based on execution type and commands
    const steps: PipelineStep[] = [];

    // Parse from build/deploy commands if available
    if (metadata?.buildCommand && typeof metadata.buildCommand === 'string') {
      steps.push(...parseCommandToSteps(metadata.buildCommand));
    }

    if (metadata?.deployCommand && typeof metadata.deployCommand === 'string') {
      steps.push(...parseCommandToSteps(metadata.deployCommand));
    }

    // If no commands found, use basic structure based on execution type
    if (steps.length === 0) {
      if (execution.executionType === 'BUILD') {
        steps.push(
          {
            name: 'Install Dependencies',
            command: 'npm install',
            status: 'completed',
            duration: 15
          },
          {
            name: 'Build Application',
            command: 'npm run build',
            status: 'completed',
            duration: 45
          },
          { name: 'Run Tests', command: 'npm test', status: 'completed', duration: 30 }
        );
      } else if (execution.executionType === 'DEPLOY') {
        steps.push(
          {
            name: 'Package Application',
            command: 'npm run package',
            status: 'completed',
            duration: 10
          },
          { name: 'Upload to S3', command: 'aws s3 sync', status: 'completed', duration: 25 },
          {
            name: 'Update CloudFront',
            command: 'aws cloudfront create-invalidation',
            status: 'running',
            duration: 5
          }
        );
      } else {
        steps.push(
          {
            name: 'Install Dependencies',
            command: 'npm install',
            status: 'completed',
            duration: 15
          },
          {
            name: 'Build Application',
            command: 'npm run build',
            status: 'completed',
            duration: 45
          },
          { name: 'Run Tests', command: 'npm test', status: 'completed', duration: 30 },
          { name: 'Deploy', command: 'npm run deploy', status: 'running', duration: 25 }
        );
      }
    }

    // Update status based on execution status
    if (execution.status === 'RUNNING' && steps.length > 0) {
      // Find first non-completed step and mark as running
      const runningIndex = steps.findIndex((s) => s.status !== 'completed');
      if (runningIndex >= 0) {
        steps[runningIndex].status = 'running';
      }
    } else if (execution.status === 'FAILED' && steps.length > 0) {
      // Mark last step as failed
      const lastStep = steps[steps.length - 1];
      if (lastStep) lastStep.status = 'failed';
    } else if (execution.status === 'SUCCESS') {
      // Mark all steps as completed
      steps.forEach((s) => (s.status = 'completed'));
    }

    return steps;
  });

  // Parse command string into steps
  function parseCommandToSteps(command: string): PipelineStep[] {
    const steps: PipelineStep[] = [];
    const commands = command
      .split(/&&|;/)
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd);

    for (const cmd of commands) {
      let name = 'Run Command';

      // Determine friendly names for common commands
      if (
        cmd.includes('npm install') ||
        cmd.includes('yarn install') ||
        cmd.includes('pnpm install')
      ) {
        name = 'Install Dependencies';
      } else if (cmd.includes('npm run build') || cmd.includes('yarn build')) {
        name = 'Build Application';
      } else if (cmd.includes('npm test') || cmd.includes('yarn test')) {
        name = 'Run Tests';
      } else if (cmd.includes('npm run deploy') || cmd.includes('deploy')) {
        name = 'Deploy Application';
      } else if (cmd.includes('lint')) {
        name = 'Run Linter';
      } else if (cmd.includes('typecheck')) {
        name = 'Type Check';
      } else if (cmd.includes('docker build')) {
        name = 'Build Docker Image';
      } else if (cmd.includes('docker push')) {
        name = 'Push Docker Image';
      } else if (cmd.startsWith('aws') || cmd.includes('s3')) {
        name = 'AWS Operation';
      }

      steps.push({
        name,
        command: cmd,
        status: 'completed',
        duration: Math.floor(Math.random() * 30) + 10
      });
    }

    return steps;
  }

  // Get pipeline configuration from metadata
  const pipelineConfig = $derived.by(() => {
    const metadata = execution.metadata as Record<string, unknown>;
    return {
      environment: metadata?.environment || 'production',
      nodeVersion: metadata?.nodeVersion || '18.x',
      buildNumber: execution.buildNumber,
      triggeredBy: execution.triggeredBy
    };
  });

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }

  // Handle re-run
  async function handleRerun() {
    if (isRerunning) return;

    isRerunning = true;
    rerunError = null;

    try {
      const connection = makeFetch();
      const response = await api.functional.pipelines.execute.executePipeline(
        connection,
        execution.pipelineId
      );

      // Notify parent component about new execution
      console.log('Re-run response:', response);

      // Use buildId from the response
      const newExecutionId = response.buildId;
      if (onNewExecution && newExecutionId) {
        console.log('Notifying parent about new execution:', newExecutionId);
        onNewExecution(newExecutionId);
      }
    } catch (error) {
      console.error('Failed to re-run pipeline:', error);
      rerunError = 'Failed to re-run pipeline. Please try again.';
    } finally {
      isRerunning = false;
    }
  }

  // Handle edit navigation
  function handleEdit() {
    goto(`/projects/${projectId}/pipelines/${execution.pipelineId}`);
  }
</script>

<div class="p-6">
  <div class="space-y-6">
    <!-- Pipeline Info -->
    <div>
      <h3 class="mb-3 flex items-center justify-between text-lg font-semibold text-gray-900">
        <span class="flex items-center gap-2">
          <span>📋</span>
          {execution.pipelineName}
        </span>
        <span
          class="rounded-full px-2 py-1 text-sm font-normal {execution.status === 'RUNNING'
            ? 'bg-blue-100 text-blue-700'
            : execution.status === 'PENDING'
              ? 'bg-gray-100 text-gray-700'
              : execution.status === 'SUCCESS'
                ? 'bg-green-100 text-green-700'
                : execution.status === 'FAILED'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'}"
        >
          {execution.status}
        </span>
      </h3>

      <div class="rounded-lg bg-gray-50 p-4">
        <h4 class="mb-3 font-medium text-gray-700">Executed Steps:</h4>
        <div class="space-y-2">
          {#each pipelineSteps as step}
            <div
              class="flex items-center justify-between rounded border border-gray-200 bg-white px-3 py-2 {step.status ===
              'failed'
                ? 'border-red-200 bg-red-50'
                : ''}"
            >
              <div class="flex items-center gap-3">
                {#if step.status === 'completed'}
                  <CheckCircle class="h-4 w-4 text-green-500" />
                {:else if step.status === 'failed'}
                  <AlertCircle class="h-4 w-4 text-red-500" />
                {:else if step.status === 'running'}
                  <Loader2 class="h-4 w-4 animate-spin text-blue-500" />
                {:else}
                  <Clock class="h-4 w-4 text-gray-400" />
                {/if}
                <div>
                  <span class="font-medium">{step.name}</span>
                  {#if step.command}
                    <div class="mt-1 font-mono text-xs text-gray-500">{step.command}</div>
                  {/if}
                </div>
              </div>
              {#if step.duration}
                <span class="text-sm text-gray-500">({formatDuration(step.duration)})</span>
              {/if}
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
          <span class="font-medium">{pipelineConfig.triggeredBy}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Environment:</span>
          <span class="font-medium">{pipelineConfig.environment}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Node Version:</span>
          <span class="font-medium">{pipelineConfig.nodeVersion}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Build Number:</span>
          <span class="font-medium">#{pipelineConfig.buildNumber}</span>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    {#if rerunError}
      <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {rerunError}
      </div>
    {/if}

    <!-- Actions -->
    <div class="flex gap-3 border-t pt-4">
      <button
        onclick={handleEdit}
        class="flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <Edit3 class="h-4 w-4" />
        Edit Pipeline
      </button>
      <button
        onclick={handleRerun}
        disabled={isRerunning || execution.status === 'RUNNING' || execution.status === 'PENDING'}
        class="flex cursor-pointer items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        title={execution.status === 'RUNNING' || execution.status === 'PENDING'
          ? 'Pipeline is currently running'
          : 'Re-run this pipeline'}
      >
        {#if isRerunning}
          <Loader2 class="h-4 w-4 animate-spin" />
          Re-running...
        {:else}
          <RefreshCw class="h-4 w-4" />
          Re-run
        {/if}
      </button>
    </div>
  </div>
</div>
