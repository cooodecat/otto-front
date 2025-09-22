<script lang="ts">
	import { X } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import type { ExecutionMetadata, PhaseInfo } from '$lib/types/log.types';
	import PhaseTimeline from './PhaseTimeline.svelte';
	import DrawerHeader from './DrawerHeader.svelte';
	import DrawerTabs from './DrawerTabs.svelte';
	import LogsTab from './tabs/LogsTab.svelte';
	import PipelineTab from './tabs/PipelineTab.svelte';
	import ArtifactsTab from './tabs/ArtifactsTab.svelte';
	
	interface Props {
		executionId: string;
		onClose: () => void;
	}
	
	let { executionId, onClose }: Props = $props();
	
	let activeTab = $state<'logs' | 'pipeline' | 'artifacts'>('logs');
	
	// Mock execution data - will be fetched from API
	const execution: ExecutionMetadata = {
		executionId,
		buildNumber: 124,
		executionType: 'DEPLOY',
		status: 'RUNNING',
		startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
		duration: 0,
		branch: 'main',
		commitId: 'abc123d',
		commitMessage: 'feat: add new feature',
		author: 'John Doe',
		pipelineId: 'pipeline-1',
		pipelineName: 'CI/CD Production',
		triggeredBy: 'webhook',
		logStats: {
			totalLines: 1234,
			errorCount: 0,
			warningCount: 3
		}
	};
	
	// Mock phase data
	const phases: PhaseInfo[] = [
		{
			id: '1',
			name: 'PREPARING',
			status: 'completed',
			startTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
			endTime: new Date(Date.now() - 4 * 60 * 1000 - 58 * 1000).toISOString(),
			duration: 2
		},
		{
			id: '2',
			name: 'BUILDING',
			status: 'completed',
			startTime: new Date(Date.now() - 4 * 60 * 1000 - 58 * 1000).toISOString(),
			endTime: new Date(Date.now() - 4 * 60 * 1000 - 13 * 1000).toISOString(),
			duration: 45
		},
		{
			id: '3',
			name: 'TESTING',
			status: 'completed',
			startTime: new Date(Date.now() - 4 * 60 * 1000 - 13 * 1000).toISOString(),
			endTime: new Date(Date.now() - 3 * 60 * 1000 - 43 * 1000).toISOString(),
			duration: 30
		},
		{
			id: '4',
			name: 'FINALIZING',
			status: 'running',
			startTime: new Date(Date.now() - 3 * 60 * 1000 - 43 * 1000).toISOString(),
			progress: 75,
			subSteps: [
				{ name: 'Uploading to S3', completed: true },
				{ name: 'Updating DNS', completed: true },
				{ name: 'Health check', completed: false }
			]
		}
	];
	
	function handlePhaseClick(phaseId: string) {
		activeTab = 'logs';
		// TODO: Scroll to phase logs
	}
	
	// Keyboard shortcut for tabs
	$effect(() => {
		function handleKeydown(e: KeyboardEvent) {
			if (e.key === '1') activeTab = 'logs';
			else if (e.key === '2') activeTab = 'pipeline';
			else if (e.key === '3') activeTab = 'artifacts';
		}
		
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<!-- Backdrop -->
<div
	class="fixed inset-0 bg-black/30 z-40"
	transition:fade={{ duration: 200 }}
	onclick={onClose}
/>

<!-- Drawer -->
<div
	class="fixed right-0 top-0 h-full w-[80%] max-w-6xl bg-white shadow-2xl z-50 flex"
	transition:fly={{ x: '100%', duration: 300 }}
>
	<!-- Left Panel - Phase Timeline (30%) -->
	<div class="w-[30%] bg-gray-50 border-r border-gray-200 flex flex-col">
		<div class="p-4 border-b border-gray-200">
			<h3 class="font-semibold text-gray-900">Execution Phases</h3>
		</div>
		<div class="flex-1 overflow-y-auto">
			<PhaseTimeline {phases} onPhaseClick={handlePhaseClick} />
		</div>
	</div>
	
	<!-- Right Panel - Details (70%) -->
	<div class="flex-1 flex flex-col">
		<!-- Close Button -->
		<button
			onclick={onClose}
			class="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors z-10"
		>
			<X class="w-5 h-5 text-gray-500" />
		</button>
		
		<!-- Header -->
		<DrawerHeader {execution} />
		
		<!-- Tabs -->
		<DrawerTabs bind:activeTab />
		
		<!-- Tab Content -->
		<div class="flex-1 overflow-hidden">
			{#if activeTab === 'logs'}
				<LogsTab executionId={execution.executionId} phases={phases} />
			{:else if activeTab === 'pipeline'}
				<PipelineTab {execution} />
			{:else if activeTab === 'artifacts'}
				<ArtifactsTab executionId={execution.executionId} />
			{/if}
		</div>
	</div>
</div>