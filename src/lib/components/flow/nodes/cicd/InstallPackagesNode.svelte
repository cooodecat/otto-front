<script lang="ts">
	import BaseNode from '../BaseNode.svelte';

	interface Props {
		id: string;
		data: any;
	}

	const { id, data }: Props = $props();

	const packageManager = $derived(data?.packageManager || 'npm');
	const installCommand = $derived(data?.installCommand || 'npm install');
</script>

<BaseNode
	{id}
	{data}
	colorClass="bg-emerald-500"
	icon="📥"
	showInput={true}
	useCICDOutputs={true}
>
	<div class="space-y-2">
		<div class="text-sm">
			<label class="mb-1 block text-xs font-medium text-gray-700">Package Manager</label>
			<div class="rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
				{packageManager}
			</div>
		</div>

		<div class="text-sm">
			<label class="mb-1 block text-xs font-medium text-gray-700">Install Command</label>
			<div class="rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
				{installCommand}
			</div>
		</div>

		<div class="flex gap-2 text-xs">
			<span class="rounded bg-green-100 px-2 py-1 text-green-700">Success</span>
			<span class="rounded bg-red-100 px-2 py-1 text-red-700">Failed</span>
		</div>
	</div>
</BaseNode>
