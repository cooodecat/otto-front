<script lang="ts">
	import { TestTube } from 'lucide-svelte';
	import BaseNode from '../BaseNode.svelte';
	import { CICD_GROUP_COLORS, CICDBlockGroup } from '$lib/types/flow-node.types';
	import type { TestPlaywrightNodeData } from '$lib/types/flow-node.types';
	interface Props {
		id: string;
		data: TestPlaywrightNodeData;
	}

	const { data, id }: Props = $props();
	const groupColor = CICD_GROUP_COLORS[CICDBlockGroup.TEST];
</script>

<BaseNode
	{data}
	{id}
	colorClass={groupColor.colorClass}
	icon={TestTube}
	minWidth={240}
	deletable={true}
	useCICDOutputs={true}
>
	<div class="space-y-2">
		<div class="rounded border {groupColor.borderClass} {groupColor.bgClass} p-3">
			<div class="mb-2 text-sm font-medium {groupColor.textClass}">🎭 Playwright Tests</div>
			<div class="text-xs text-gray-600">Run E2E tests with Playwright</div>
		</div>
	</div>
</BaseNode>
