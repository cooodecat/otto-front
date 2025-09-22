<script lang="ts">
	import type { PhaseInfo } from '$lib/types/log.types';
	import { CheckCircle2, XCircle, Loader2, Circle, Check, Loader } from 'lucide-svelte';
	
	interface Props {
		phases: PhaseInfo[];
		currentPhase?: string;
		onPhaseClick?: (phaseId: string) => void;
	}
	
	let { phases, currentPhase, onPhaseClick }: Props = $props();
	
	function formatDuration(seconds?: number): string {
		if (!seconds) return '';
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
	}
	
	// Calculate elapsed time for running phase
	let elapsedTime = $state(0);
	
	$effect(() => {
		const runningPhase = phases.find(p => p.status === 'running');
		if (runningPhase && runningPhase.startTime) {
			const interval = setInterval(() => {
				const start = new Date(runningPhase.startTime!).getTime();
				const now = Date.now();
				elapsedTime = Math.floor((now - start) / 1000);
			}, 1000);
			
			return () => clearInterval(interval);
		}
	});
</script>

<div class="phase-timeline p-4">
	{#each phases as phase, i}
		<div 
			class="phase-step relative flex items-start pb-8 last:pb-0"
			class:active={phase.status === 'running'}
		>
			<!-- Connector Line -->
			{#if i < phases.length - 1}
				<div 
					class="connector absolute left-6 top-12 w-0.5 h-full -translate-x-1/2"
					class:bg-green-500={phase.status === 'completed'}
					class:bg-blue-500={phase.status === 'running'}
					class:bg-gray-300={phase.status === 'pending' || phase.status === 'failed'}
				/>
			{/if}
			
			<!-- Phase Icon -->
			<button
				onclick={() => onPhaseClick?.(phase.id)}
				class="phase-icon-wrapper flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-white border-2 transition-all hover:scale-110 relative z-10"
				class:border-green-500={phase.status === 'completed'}
				class:border-red-500={phase.status === 'failed'}
				class:border-blue-500={phase.status === 'running'}
				class:border-gray-300={phase.status === 'pending'}
			>
				{#if phase.status === 'completed'}
					<CheckCircle2 class="w-6 h-6 text-green-500" />
				{:else if phase.status === 'failed'}
					<XCircle class="w-6 h-6 text-red-500" />
				{:else if phase.status === 'running'}
					<Loader2 class="w-6 h-6 text-blue-500 animate-spin" />
				{:else}
					<Circle class="w-6 h-6 text-gray-300" />
				{/if}
			</button>
			
			<!-- Phase Info -->
			<div class="phase-info ml-3 flex-1">
				<h4 class="font-medium text-gray-900 capitalize">
					{phase.name.toLowerCase()}
				</h4>
				
				{#if phase.duration}
					<span class="text-sm text-gray-500">
						{formatDuration(phase.duration)}
					</span>
				{:else if phase.status === 'running'}
					<span class="text-sm text-blue-500">
						{formatDuration(elapsedTime)} elapsed
					</span>
				{/if}
				
				<!-- Progress Bar for Running Phase -->
				{#if phase.status === 'running' && phase.progress}
					<div class="mt-2 w-full bg-gray-200 rounded-full h-1.5">
						<div 
							class="bg-blue-500 h-1.5 rounded-full transition-all"
							style="width: {phase.progress}%"
						/>
					</div>
				{/if}
				
				<!-- Sub-steps for Running Phase -->
				{#if phase.status === 'running' && phase.subSteps}
					<div class="sub-steps mt-3 space-y-1">
						{#each phase.subSteps as step}
							<div class="flex items-center gap-2 text-xs text-gray-600">
								{#if step.completed}
									<Check class="w-3 h-3 text-green-500" />
								{:else}
									<Loader class="w-3 h-3 text-blue-500 animate-spin" />
								{/if}
								<span class:line-through={step.completed}>{step.name}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/each}
</div>

<style>
	.phase-step.active {
		animation: pulse 2s infinite;
	}
	
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.9;
		}
	}
	
	.phase-step.active::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background: linear-gradient(90deg, 
			transparent 0%, 
			rgba(59, 130, 246, 0.05) 50%, 
			transparent 100%);
		pointer-events: none;
	}
</style>