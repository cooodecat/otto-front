<script lang="ts">
	import { Settings, Plus, X, Eye, EyeOff } from 'lucide-svelte';
	import BaseNode from '../BaseNode.svelte';
	import type { EnvironmentSetupNodeData } from '$lib/types/flow-node.types';
	interface Props {
		id: string;
		data: EnvironmentSetupNodeData;
	}

	const { data, id }: Props = $props();

	let isEditing = $state(false);
	let environmentVariables = $state(data.environmentVariables || {});
	let loadFromFile = $state(data.loadFromFile || '');
	let newKey = $state('');
	let newValue = $state('');
	let hiddenValues = $state<Set<string>>(new Set());
	let editingValues = $state<Set<string>>(new Set());
	let newInputVisible = $state(true);

	function toggleEdit() {
		isEditing = !isEditing;
	}

	function addEnvVar() {
		if (newKey && newValue) {
			environmentVariables[newKey] = newValue;
			environmentVariables = { ...environmentVariables };
			newKey = '';
			newValue = '';
		}
	}

	function removeEnvVar(key: string) {
		delete environmentVariables[key];
		environmentVariables = { ...environmentVariables };
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			addEnvVar();
		}
	}

	function toggleValueVisibility(key: string) {
		if (hiddenValues.has(key)) {
			hiddenValues.delete(key);
		} else {
			hiddenValues.add(key);
		}
		hiddenValues = new Set(hiddenValues);
	}

	function toggleNewInputVisibility() {
		newInputVisible = !newInputVisible;
	}
</script>

<BaseNode
	{data}
	{id}
	colorClass="bg-blue-500"
	icon={Settings}
	minWidth={240}
	deletable={true}
	useCICDOutputs={true}
>
	<div class="space-y-2">
		<!-- 헤더 및 토글 버튼 -->
		<div class="flex items-center justify-between rounded border border-blue-200 bg-blue-50 p-3">
			<div>
				<div class="mb-1 text-sm font-medium text-blue-700">🔧 Environment Setup</div>
				<div class="text-xs text-gray-600">Configure environment variables and system settings</div>
			</div>
			<button
				onclick={toggleEdit}
				class="text-xs text-blue-600 hover:text-blue-700 focus:outline-none"
			>
				{isEditing ? 'Done' : 'Edit'}
			</button>
		</div>

		<!-- 표시 모드 -->
		{#if !isEditing}
			<div class="space-y-2 text-xs">
				{#if Object.keys(environmentVariables).length > 0}
					<div>
						<div class="font-medium text-gray-700">Environment Variables ({Object.keys(environmentVariables).length})</div>
						<div class="mt-1 max-h-20 space-y-1 overflow-y-auto">
							{#each Object.entries(environmentVariables) as [key, value]}
								<div class="flex items-center justify-between text-gray-600">
									<div class="flex items-center gap-2 flex-1 min-w-0">
										<span class="font-mono text-xs">{key}=</span>
										<span class="truncate font-mono text-xs">
											{hiddenValues.has(key) ? '••••••••' : value}
										</span>
									</div>
									<button
										onclick={() => toggleValueVisibility(key)}
										class="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
									>
										{#if hiddenValues.has(key)}
											<EyeOff class="h-3 w-3" />
										{:else}
											<Eye class="h-3 w-3" />
										{/if}
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/if}
				
				{#if loadFromFile}
					<div>
						<div class="font-medium text-gray-700">Load from file</div>
						<div class="mt-1 font-mono text-xs text-gray-600">{loadFromFile}</div>
					</div>
				{/if}

				{#if Object.keys(environmentVariables).length === 0 && !loadFromFile}
					<div class="text-gray-500">No environment variables configured</div>
				{/if}
			</div>
		{/if}

		<!-- 편집 모드 -->
		{#if isEditing}
			<div class="space-y-3 rounded border bg-gray-50 p-3">
				<!-- Load from file -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">Load from file (optional)</label>
					<input
						type="text"
						bind:value={loadFromFile}
						placeholder=".env, config.env, etc."
						class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<!-- Environment Variables -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">Environment Variables</label>
					
					<!-- Add new variable -->
					<div class="mb-2 flex gap-2">
						<input
							type="text"
							bind:value={newKey}
							placeholder="Variable name"
							class="flex-1 rounded border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						<div class="relative flex-1">
							<input
								type={newInputVisible ? 'text' : 'password'}
								bind:value={newValue}
								onkeypress={handleKeyPress}
								placeholder="Value"
								class="w-full rounded border border-gray-300 px-3 py-1 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<button
								type="button"
								onclick={toggleNewInputVisibility}
								class="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
							>
								{#if newInputVisible}
									<EyeOff class="h-4 w-4" />
								{:else}
									<Eye class="h-4 w-4" />
								{/if}
							</button>
						</div>
						<button
							onclick={addEnvVar}
							class="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<Plus class="h-4 w-4" />
						</button>
					</div>

					<!-- Existing variables -->
					{#if Object.keys(environmentVariables).length > 0}
						<div class="max-h-32 space-y-1 overflow-y-auto">
							{#each Object.entries(environmentVariables) as [key, value]}
								<div class="flex items-center justify-between rounded bg-white px-2 py-1 text-sm">
									<span class="font-mono">{key}={value}</span>
									<button
										onclick={() => removeEnvVar(key)}
										class="text-red-500 hover:text-red-600 focus:outline-none"
									>
										<X class="h-3 w-3" />
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<div class="flex gap-2 text-xs">
			<span class="rounded bg-green-100 px-2 py-1 text-green-700">Success</span>
			<span class="rounded bg-red-100 px-2 py-1 text-red-700">Failed</span>
		</div>
	</div>
</BaseNode>
