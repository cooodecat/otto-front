<script lang="ts">
	import { Search } from 'lucide-svelte';
	
	interface Props {
		filterType: 'ALL' | 'BUILD' | 'DEPLOY';
	}
	
	let { filterType = $bindable() }: Props = $props();
	
	let searchQuery = $state('');
	
	const filterOptions = [
		{ value: 'ALL', label: 'All' },
		{ value: 'BUILD', label: 'Build' },
		{ value: 'DEPLOY', label: 'Deploy' }
	] as const;
</script>

<div class="flex items-center gap-4">
	<!-- Filter Tabs -->
	<div class="flex rounded-lg border border-gray-200 bg-white p-1">
		{#each filterOptions as option}
			<button
				onclick={() => filterType = option.value}
				class="px-4 py-2 text-sm font-medium rounded-md transition-colors {
					filterType === option.value
						? 'bg-blue-500 text-white'
						: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
				}"
			>
				{option.label}
			</button>
		{/each}
	</div>
	
	<!-- Search Input -->
	<div class="flex-1 max-w-md">
		<div class="relative">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search executions..."
				class="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			/>
		</div>
	</div>
</div>