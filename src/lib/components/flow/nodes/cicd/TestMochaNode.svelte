<script lang="ts">
	import { TestTube } from 'lucide-svelte';
	import BaseNode from '../BaseNode.svelte';
	import { CICD_GROUP_COLORS, CICDBlockGroup } from '$lib/types/flow-node.types';
	import type { TestMochaNodeData } from '$lib/types/flow-node.types';
	import { getContext } from 'svelte';

	interface Props {
		id: string;
		data: TestMochaNodeData;
	}

	const { data, id }: Props = $props();
	const groupColor = CICD_GROUP_COLORS[CICDBlockGroup.TEST];

	// 노드 데이터 업데이트 핸들러 가져오기
	const updateNodeData = getContext<((nodeId: string, newData: any) => void) | undefined>('updateNodeData');

	let isEditing = $state(false);
	let testDir = $state(data?.testDir || 'test');
	let reporter = $state(data?.reporter || 'spec');
	let timeout = $state(data?.timeout || 2000);
	let recursive = $state(data?.recursive || true);

	// 데이터 저장 헬퍼 함수
	function saveNodeData() {
		if (updateNodeData) {
			updateNodeData(id, {
				testDir,
				reporter,
				timeout,
				recursive
			});
		}
	}

	function toggleEdit() {
		isEditing = !isEditing;
	}
</script>

<BaseNode
	{data}
	{id}
	colorClass={groupColor.colorClass}
	icon={TestTube}
	minWidth={260}
	showInput={true}
	useCICDOutputs={true}
>
	<div class="space-y-2">
		<!-- 헤더 및 토글 버튼 -->
		<div class="flex items-center justify-between rounded border {groupColor.borderClass} {groupColor.bgClass} p-3">
			<div>
				<div class="mb-1 text-sm font-medium {groupColor.textClass}">🧪 Mocha Test</div>
				<div class="text-xs text-gray-600">Run tests using Mocha framework</div>
			</div>
			<button
				onclick={toggleEdit}
				class="text-xs text-blue-600 hover:text-blue-700 focus:outline-none"
			>
				{isEditing ? 'Done' : 'Edit'}
			</button>
		</div>

		<!-- 표시 모드 -->
		{#if !isEditing}
			<div class="space-y-2 text-xs">
				<div>
					<div class="font-medium text-gray-700">Test Directory</div>
					<div class="mt-1 rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
						{testDir}
					</div>
				</div>

				<div>
					<div class="font-medium text-gray-700">Reporter</div>
					<div class="mt-1 rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
						{reporter}
					</div>
				</div>

				<div class="flex gap-2">
					<div>
						<span class="font-medium text-gray-700">Timeout: </span>
						<span class="text-gray-600">{timeout}ms</span>
					</div>
					{#if recursive}
						<span class="rounded bg-green-100 px-2 py-1 text-green-700 text-xs">Recursive</span>
					{/if}
				</div>
			</div>
		{/if}

		<!-- 편집 모드 -->
		{#if isEditing}
			<div class="space-y-3 rounded border bg-gray-50 p-3">
				<!-- Test Directory -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">Test Directory</label>
					<input
						type="text"
						bind:value={testDir}
						onchange={saveNodeData}
						placeholder="test"
						class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<!-- Reporter -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">Reporter</label>
					<select
						bind:value={reporter}
						onchange={saveNodeData}
						class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="spec">spec</option>
						<option value="dot">dot</option>
						<option value="nyan">nyan</option>
						<option value="tap">tap</option>
						<option value="json">json</option>
						<option value="html">html</option>
						<option value="xunit">xunit</option>
					</select>
				</div>

				<!-- Timeout -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">Timeout (ms)</label>
					<input
						type="number"
						bind:value={timeout}
						onchange={saveNodeData}
						placeholder="2000"
						class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<!-- Recursive Option -->
				<label class="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						bind:checked={recursive}
						onchange={saveNodeData}
						class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>
					<span>Run tests recursively</span>
				</label>
			</div>
		{/if}
	</div>
</BaseNode>
