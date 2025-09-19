<script lang="ts">
	import { TestTube } from 'lucide-svelte';
	import BaseNode from '../BaseNode.svelte';
	import type { TestCustomNodeData } from '$lib/types/flow-node.types';
	interface Props {
		id: string;
		data: TestCustomNodeData;
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
			<div class="mb-2 text-sm font-medium text-blue-700">🧪 Custom Test</div>
			<div class="text-xs text-gray-600">Run custom test commands</div>
		</div>
	</div>
</BaseNode>
