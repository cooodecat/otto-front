<script lang="ts">
	import { TestTube } from 'lucide-svelte';
	import BaseNode from '../BaseNode.svelte';
	import type { TestVitestNodeData } from '$lib/types/flow-node.types';
	interface Props {
		id: string;
		data: TestVitestNodeData;
	}

	const { data, id }: Props = $props();
</script>

<BaseNode
	{data}
	{id}
	colorClass="bg-blue-500"
	icon={TestTube}
	minWidth={240}
	deletable={true}
	useCICDOutputs={true}
>
	<div class="space-y-2">
		<div class="rounded border border-blue-200 bg-blue-50 p-3">
			<div class="mb-2 text-sm font-medium text-blue-700">⚡ Vitest Tests</div>
			<div class="text-xs text-gray-600">Run Vitest unit tests</div>
		</div>
	</div>
</BaseNode>
