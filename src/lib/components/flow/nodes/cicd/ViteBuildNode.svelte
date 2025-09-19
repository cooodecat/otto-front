<script lang="ts">
	import { Zap } from 'lucide-svelte';
	import BaseNode from '../BaseNode.svelte';
	import type { BuildViteNodeData } from '$lib/types/flow-node.types';
	interface Props {
		id: string;
		data: BuildViteNodeData;
	}

	const { data, id }: Props = $props();

	let mode = $state(data.mode || 'production');
	let basePath = $state(data.basePath || '');
	let outDir = $state(data.outputDir || '');

	const updatedData = $derived({
		...data,
		mode,
		basePath,
		outputDir: outDir
	});
</script>

<BaseNode
	data={updatedData}
	{id}
	colorClass="bg-emerald-500"
	icon={Zap}
	minWidth={280}
	deletable={true}
	useCICDOutputs={true}
>
	<div class="space-y-3 text-sm">
		<div class="grid grid-cols-2 items-center gap-2">
			<div class="text-gray-500">Mode</div>
			<select bind:value={mode} class="rounded border border-gray-300 px-2 py-1">
				<option value="development">development</option>
				<option value="production">production</option>
			</select>
		</div>
		<div class="grid grid-cols-2 items-center gap-2">
			<div class="text-gray-500">Base</div>
			<input
				bind:value={basePath}
				class="rounded border border-gray-300 px-2 py-1"
				placeholder="/"
			/>
		</div>
		<div class="grid grid-cols-2 items-center gap-2">
			<div class="text-gray-500">OutDir</div>
			<input
				bind:value={outDir}
				class="rounded border border-gray-300 px-2 py-1"
				placeholder="dist"
			/>
		</div>
	</div>
</BaseNode>
