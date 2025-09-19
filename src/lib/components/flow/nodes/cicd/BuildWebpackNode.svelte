<script lang="ts">
	import BaseNode from '../BaseNode.svelte';
	import type { BuildWebpackNodeData } from '$lib/types/flow-node.types';

	interface Props {
		id: string;
		data: BuildWebpackNodeData;
	}

	const { id, data }: Props = $props();

	const mode = $derived(data.mode || 'production');
	const configFile = $derived(data.configFile || 'webpack.config.js');
	const outputPath = $derived(data.outputPath || 'dist');
</script>

<BaseNode
	{id}
	{data}
	colorClass="bg-emerald-500"
	icon="📦"
	showInput={true}
	useCICDOutputs={true}
>
	<div class="space-y-2">
		<div class="text-sm">
			<div class="mb-1 block text-xs font-medium text-gray-700">Mode</div>
			<div class="rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
				{mode}
			</div>
		</div>

		<div class="text-sm">
			<div class="mb-1 block text-xs font-medium text-gray-700">Config File</div>
			<div class="rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
				{configFile}
			</div>
		</div>

		<div class="text-sm">
			<div class="mb-1 block text-xs font-medium text-gray-700">Output Path</div>
			<div class="rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
				{outputPath}
			</div>
		</div>

		<div class="flex gap-2 text-xs">
			<span class="rounded bg-green-100 px-2 py-1 text-green-700">Success</span>
			<span class="rounded bg-red-100 px-2 py-1 text-red-700">Failed</span>
		</div>
	</div>
</BaseNode>
