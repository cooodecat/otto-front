<script lang="ts">
	import { TestTube } from 'lucide-svelte';
	import BaseNode from '../BaseNode.svelte';
	import { CICD_GROUP_COLORS, CICDBlockGroup } from '$lib/types/flow-node.types';
	import type { TestJestNodeData } from '$lib/types/flow-node.types';
	import { getContext } from 'svelte';

	interface Props {
		id: string;
		data: TestJestNodeData;
	}

	const { id, data }: Props = $props();
	const groupColor = CICD_GROUP_COLORS[CICDBlockGroup.TEST];

	// 노드 데이터 업데이트 핸들러 가져오기
	const updateNodeData = getContext<((nodeId: string, newData: any) => void) | undefined>('updateNodeData');

	let isEditing = $state(false);
	let configFile = $state(data?.configFile || 'jest.config.js');
	let coverage = $state(data?.coverage || false);
	let watchMode = $state(data?.watchMode || false);

	// 데이터 저장 헬퍼 함수
	function saveNodeData() {
		if (updateNodeData) {
			updateNodeData(id, {
				configFile,
				coverage,
				watchMode
			});
		}
	}

	function toggleEdit() {
		isEditing = !isEditing;
	}
</script>

<BaseNode
	{id}
	{data}
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
				<div class="mb-1 text-sm font-medium {groupColor.textClass}">🧪 Jest Test</div>
				<div class="text-xs text-gray-600">Run tests using Jest framework</div>
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
					<div class="font-medium text-gray-700">Config File</div>
					<div class="mt-1 rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
						{configFile}
					</div>
				</div>

				<div class="flex gap-2">
					{#if coverage}
						<span class="rounded bg-blue-100 px-2 py-1 text-blue-700 text-xs">Coverage</span>
					{/if}
					{#if watchMode}
						<span class="rounded bg-green-100 px-2 py-1 text-green-700 text-xs">Watch Mode</span>
					{/if}
				</div>
			</div>
		{/if}

		<!-- 편집 모드 -->
		{#if isEditing}
			<div class="space-y-3 rounded border bg-gray-50 p-3">
				<!-- Config File -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">Config File</label>
					<input
						type="text"
						bind:value={configFile}
						onchange={saveNodeData}
						placeholder="jest.config.js"
						class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<!-- 옵션들 -->
				<div class="space-y-2">
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							bind:checked={coverage}
							onchange={saveNodeData}
							class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<span>Generate Coverage Report</span>
					</label>

					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							bind:checked={watchMode}
							onchange={saveNodeData}
							class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<span>Watch Mode</span>
					</label>
				</div>
			</div>
		{/if}
	</div>
</BaseNode>
