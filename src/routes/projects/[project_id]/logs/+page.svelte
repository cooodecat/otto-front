<script lang="ts">
	import { page } from '$app/stores';
	import ExecutionList from './components/ExecutionList.svelte';
	import ExecutionFilter from './components/ExecutionFilter.svelte';
	import LogDrawer from './components/LogDrawer/LogDrawer.svelte';
	import { RefreshCw } from 'lucide-svelte';
	
	const projectId = $page.params.project_id;
	
	let selectedExecutionId = $state<string | null>(null);
	let filterType = $state<'ALL' | 'BUILD' | 'DEPLOY'>('ALL');
	let isDrawerOpen = $state(false);
	let isRefreshing = $state(false);
	
	function handleExecutionSelect(executionId: string) {
		selectedExecutionId = executionId;
		isDrawerOpen = true;
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
		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape' && isDrawerOpen) {
				handleDrawerClose();
			}
		}
		
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<div class="flex flex-col h-full">
	<!-- Header -->
	<div class="border-b bg-white px-6 py-4">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-semibold text-gray-900">Execution Logs</h1>
				<p class="mt-1 text-sm text-gray-500">View build and deployment logs for your project</p>
			</div>
			
			<button
				onclick={handleRefresh}
				disabled={isRefreshing}
				class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
			>
				<RefreshCw class="w-4 h-4 {isRefreshing ? 'animate-spin' : ''}" />
				Refresh
			</button>
		</div>
		
		<!-- Filter -->
		<div class="mt-4">
			<ExecutionFilter bind:filterType />
		</div>
	</div>
	
	<!-- Execution List -->
	<div class="flex-1 overflow-y-auto bg-gray-50">
		<ExecutionList 
			{projectId}
			{filterType}
			{selectedExecutionId}
			onSelect={handleExecutionSelect}
		/>
	</div>
</div>

<!-- Log Drawer -->
{#if isDrawerOpen && selectedExecutionId}
	<LogDrawer 
		executionId={selectedExecutionId}
		onClose={handleDrawerClose}
	/>
{/if}

<style>
	:global(body) {
		overflow: hidden;
	}
</style>