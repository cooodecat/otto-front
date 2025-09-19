<script lang="ts">
	import { Settings, Plus, X } from 'lucide-svelte';
	import BaseNode from '../BaseNode.svelte';
	import type { BuildCustomNodeData } from '$lib/types/flow-node.types';
	interface Props {
		id: string;
		data: BuildCustomNodeData;
	}

	const { data, id }: Props = $props();

	let isEditing = $state(false);
	let packageManager = $state(data.packageManager || 'npm');
	let scriptName = $state(data.scriptName || '');
	let customCommands = $state(data.customCommands || []);
	let workingDirectory = $state(data.workingDirectory || '');
	let newCommand = $state('');

	function toggleEdit() {
		isEditing = !isEditing;
	}

	function addCommand() {
		if (newCommand.trim()) {
			customCommands = [...customCommands, newCommand.trim()];
			newCommand = '';
		}
	}

	function removeCommand(index: number) {
		customCommands = customCommands.filter((_, i) => i !== index);
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			addCommand();
		}
	}
</script>

<BaseNode
	{data}
	{id}
	colorClass="bg-emerald-500"
	icon={Settings}
	minWidth={240}
	deletable={true}
	useCICDOutputs={true}
>
	<div class="space-y-2">
		<!-- 헤더 및 토글 버튼 -->
		<div class="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50 p-3">
			<div>
				<div class="mb-1 text-sm font-medium text-emerald-700">⚙️ Custom Build</div>
				<div class="text-xs text-gray-600">Run custom build commands</div>
			</div>
			<button
				onclick={toggleEdit}
				class="text-xs text-emerald-600 hover:text-emerald-700 focus:outline-none"
			>
				{isEditing ? 'Done' : 'Edit'}
			</button>
		</div>

		<!-- 표시 모드 -->
		{#if !isEditing}
			<div class="space-y-2 text-xs">
				<div>
					<div class="font-medium text-gray-700">Package Manager</div>
					<div class="mt-1 font-mono text-xs text-gray-600">{packageManager}</div>
				</div>

				{#if scriptName}
					<div>
						<div class="font-medium text-gray-700">Script Name</div>
						<div class="mt-1 font-mono text-xs text-gray-600">{scriptName}</div>
					</div>
				{/if}

				{#if workingDirectory}
					<div>
						<div class="font-medium text-gray-700">Working Directory</div>
						<div class="mt-1 font-mono text-xs text-gray-600">{workingDirectory}</div>
					</div>
				{/if}

				{#if customCommands.length > 0}
					<div>
						<div class="font-medium text-gray-700">Custom Commands ({customCommands.length})</div>
						<div class="mt-1 max-h-20 space-y-1 overflow-y-auto">
							{#each customCommands as command}
								<div class="font-mono text-xs text-gray-600">{command}</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if !scriptName && customCommands.length === 0}
					<div class="text-gray-500">No build commands configured</div>
				{/if}
			</div>
		{/if}

		<!-- 편집 모드 -->
		{#if isEditing}
			<div class="space-y-3 rounded border bg-gray-50 p-3">
				<!-- Package Manager -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">Package Manager</label>
					<select
						bind:value={packageManager}
						class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
					>
						<option value="npm">npm</option>
						<option value="yarn">yarn</option>
						<option value="pnpm">pnpm</option>
					</select>
				</div>

				<!-- Script Name -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">Script Name (optional)</label>
					<input
						type="text"
						bind:value={scriptName}
						placeholder="e.g., build, build:prod"
						class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
					/>
				</div>

				<!-- Working Directory -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">Working Directory (optional)</label>
					<input
						type="text"
						bind:value={workingDirectory}
						placeholder="e.g., ./frontend"
						class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
					/>
				</div>

				<!-- Custom Commands -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">Custom Commands</label>
					
					<!-- Add new command -->
					<div class="mb-2 flex gap-2">
						<input
							type="text"
							bind:value={newCommand}
							onkeypress={handleKeyPress}
							placeholder="Enter command (e.g., npm run build)"
							class="flex-1 rounded border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
						/>
						<button
							onclick={addCommand}
							class="rounded bg-emerald-500 px-3 py-1 text-sm text-white hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
						>
							<Plus class="h-4 w-4" />
						</button>
					</div>

					<!-- Existing commands -->
					{#if customCommands.length > 0}
						<div class="max-h-32 space-y-1 overflow-y-auto">
							{#each customCommands as command, index}
								<div class="flex items-center justify-between rounded bg-white px-2 py-1 text-sm">
									<span class="font-mono">{command}</span>
									<button
										onclick={() => removeCommand(index)}
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
