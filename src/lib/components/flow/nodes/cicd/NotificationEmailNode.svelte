<script lang="ts">
	import { Mail } from 'lucide-svelte';
	import BaseNode from '../BaseNode.svelte';
	import type { NotificationEmailNodeData } from '$lib/types/flow-node.types';
	interface Props {
		id: string;
		data: NotificationEmailNodeData;
	}

	const { data, id }: Props = $props();
</script>

<BaseNode
	{data}
	{id}
	colorClass="bg-purple-500"
	icon={Mail}
	minWidth={240}
	deletable={true}
	useCICDOutputs={true}
>
	<div class="space-y-2">
		<div class="rounded border border-purple-200 bg-purple-50 p-3">
			<div class="mb-2 text-sm font-medium text-purple-700">📧 Email Notify</div>
			<div class="text-xs text-gray-600">Send email notifications</div>
		</div>
	</div>
</BaseNode>
