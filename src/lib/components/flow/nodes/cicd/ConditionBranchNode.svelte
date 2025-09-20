<script lang="ts">
	import { GitBranch } from 'lucide-svelte';
	import { Position } from '@xyflow/svelte';
	import BaseNode from '../BaseNode.svelte';
	import type { ConditionBranchNodeData } from '$lib/types/flow-node.types';
	interface Props {
		id: string;
		data: ConditionBranchNodeData;
	}

	const { data, id }: Props = $props();
</script>

<BaseNode
	{data}
	{id}
	colorClass="bg-yellow-500"
	icon={GitBranch}
	minWidth={240}
	deletable={true}
	useCICDOutputs={false}
	outputHandles={[
		{ id: 'true-output', position: Position.Right, style: { top: '40%', backgroundColor: '#10b981' } },
		{ id: 'false-output', position: Position.Right, style: { top: '60%', backgroundColor: '#ef4444' } }
	]}
>
	<div class="space-y-2">
		<div class="rounded border border-yellow-200 bg-yellow-50 p-3">
			<div class="mb-2 text-sm font-medium text-yellow-700">🔀 Condition Branch</div>
			<div class="text-xs text-gray-600">Conditional execution path</div>
		</div>
	</div>
</BaseNode>
