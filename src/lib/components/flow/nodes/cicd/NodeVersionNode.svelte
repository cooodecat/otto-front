<script lang="ts">
	import { Package } from 'lucide-svelte';
	import BaseNode from '../BaseNode.svelte';
	import type { NodeVersionNodeData } from '$lib/types/flow-node.types';
	interface Props {
		id: string;
		data: NodeVersionNodeData;
	}

	const { data, id }: Props = $props();

	let version = $state(data.version || '18');
	let pkgManager = $state(data.packageManager || 'pnpm');

	const updatedData = $derived({
		...data,
		version,
		packageManager: pkgManager
	});
</script>

<BaseNode
	data={updatedData}
	{id}
	colorClass="bg-orange-500"
	icon={Package}
	minWidth={320}
	deletable={true}
	useCICDOutputs={true}
>
	<div class="space-y-3">
		<div class="rounded border border-orange-200 bg-orange-50 p-3">
			<div class="grid grid-cols-2 items-center gap-3">
				<div>
					<label class="mb-1 block text-xs text-gray-600"> Version </label>
					<input
						type="text"
						bind:value={version}
						class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
						placeholder="e.g. 18"
					/>
				</div>
				<div>
					<label class="mb-1 block text-xs text-gray-600"> Package Manager </label>
					<select
						bind:value={pkgManager}
						class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
					>
						<option value="npm">npm</option>
						<option value="yarn">yarn</option>
						<option value="pnpm">pnpm</option>
					</select>
				</div>
			</div>
		</div>
	</div>
</BaseNode>
