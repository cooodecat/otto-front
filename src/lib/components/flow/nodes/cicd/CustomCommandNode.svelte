<script lang="ts">
	import { Terminal } from 'lucide-svelte';
	import BaseNode from '../BaseNode.svelte';
	import type { CustomCommandNodeData } from '$lib/types/flow-node.types';
	interface Props {
		id: string;
		data: CustomCommandNodeData;
	}

	const { data, id }: Props = $props();
</script>

<BaseNode
	{data}
	{id}
	colorClass="bg-gray-500"
	icon={Terminal}
	minWidth={240}
	deletable={true}
	useCICDOutputs={true}
>
	<div class="space-y-2">
		<div class="rounded border border-gray-200 bg-gray-50 p-3">
			<div class="mb-2 text-sm font-medium text-gray-700">💻 Custom Command</div>
			<div class="text-xs text-gray-600">Run custom shell commands</div>
		</div>
	</div>
</BaseNode>
