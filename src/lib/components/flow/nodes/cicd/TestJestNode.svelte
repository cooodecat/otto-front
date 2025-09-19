<script lang="ts">
	import BaseNode from '../BaseNode.svelte';

	interface Props {
		id: string;
		data: any;
	}

	const { id, data }: Props = $props();

	const testCommand = $derived(data?.testCommand || 'npm test');
	const coverage = $derived(data?.coverage || false);
</script>

<BaseNode
	{id}
	{data}
	colorClass="bg-purple-500"
	icon="🧪"
	showInput={true}
	useCICDOutputs={true}
>
	<div class="space-y-2">
		<div class="text-sm">
			<label class="mb-1 block text-xs font-medium text-gray-700">Test Command</label>
			<div class="rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
				{testCommand}
			</div>
		</div>

		<div class="flex items-center gap-2 text-sm">
			<input type="checkbox" checked={coverage} class="h-3 w-3" disabled />
			<span class="text-xs text-gray-700">Coverage Report</span>
		</div>

		<div class="flex gap-2 text-xs">
			<span class="rounded bg-green-100 px-2 py-1 text-green-700">Pass</span>
			<span class="rounded bg-red-100 px-2 py-1 text-red-700">Fail</span>
		</div>
	</div>
</BaseNode>
