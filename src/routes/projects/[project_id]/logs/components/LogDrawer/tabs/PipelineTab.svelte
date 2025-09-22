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
			<h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
				<span>📋</span>
				{execution.pipelineName}
			</h3>
			
			<div class="bg-gray-50 rounded-lg p-4">
				<h4 class="font-medium text-gray-700 mb-3">Executed Steps:</h4>
				<div class="space-y-2">
					{#each pipelineSteps as step}
						<div class="flex items-center justify-between py-2 px-3 bg-white rounded border border-gray-200">
							<div class="flex items-center gap-3">
								{#if step.status === 'completed'}
									<CheckCircle class="w-4 h-4 text-green-500" />
								{:else}
									<Clock class="w-4 h-4 text-blue-500 animate-spin" />
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
			<h4 class="font-medium text-gray-700 mb-2">Configuration:</h4>
			<div class="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
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
		<div class="flex gap-3 pt-4 border-t">
			<button class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
				<Edit3 class="w-4 h-4" />
				Edit Pipeline
			</button>
			<button class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
				<RefreshCw class="w-4 h-4" />
				Re-run
			</button>
		</div>
	</div>
</div>