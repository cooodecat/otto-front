<script lang="ts">
	import { Package } from 'lucide-svelte';
	import BaseNode from '../BaseNode.svelte';
	import { CICD_GROUP_COLORS, CICDBlockGroup } from '$lib/types/flow-node.types';
	import type { BuildWebpackNodeData } from '$lib/types/flow-node.types';
	import { getContext } from 'svelte';

	interface Props {
		id: string;
		data: BuildWebpackNodeData;
	}

	const { id, data }: Props = $props();
	const groupColor = CICD_GROUP_COLORS[CICDBlockGroup.BUILD];

	// 노드 데이터 업데이트 핸들러 가져오기
	const updateNodeData = getContext<((nodeId: string, newData: any) => void) | undefined>('updateNodeData');

	let isEditing = $state(false);
	let mode = $state(data.mode || 'production');
	let configFile = $state(data.configFile || 'webpack.config.js');
	let outputPath = $state(data.outputPath || 'dist');

	// 데이터 저장 헬퍼 함수
	function saveNodeData() {
		if (updateNodeData) {
			updateNodeData(id, {
				mode,
				configFile,
				outputPath
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
	icon={Package}
	minWidth={260}
	showInput={true}
	useCICDOutputs={true}
>
	<div class="space-y-2">
		<!-- 헤더 및 토글 버튼 -->
		<div class="flex items-center justify-between rounded border {groupColor.borderClass} {groupColor.bgClass} p-3">
			<div>
				<div class="mb-1 text-sm font-medium {groupColor.textClass}">⚙️ Webpack Build</div>
				<div class="text-xs text-gray-600">Build project using Webpack bundler</div>
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
					<div class="font-medium text-gray-700">Mode</div>
					<div class="mt-1 rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
						{mode}
					</div>
				</div>

				<div>
					<div class="font-medium text-gray-700">Config File</div>
					<div class="mt-1 rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
						{configFile}
					</div>
				</div>

				<div>
					<div class="font-medium text-gray-700">Output Path</div>
					<div class="mt-1 rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
						{outputPath}
					</div>
				</div>
			</div>
		{/if}

		<!-- 편집 모드 -->
		{#if isEditing}
			<div class="space-y-3 rounded border bg-gray-50 p-3">
				<!-- Mode 선택 -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">Build Mode</label>
					<select
						bind:value={mode}
						onchange={saveNodeData}
						class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="development">Development</option>
						<option value="production">Production</option>
					</select>
				</div>

				<!-- Config File -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">Config File</label>
					<input
						type="text"
						bind:value={configFile}
						onchange={saveNodeData}
						placeholder="webpack.config.js"
						class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<!-- Output Path -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">Output Path</label>
					<input
						type="text"
						bind:value={outputPath}
						onchange={saveNodeData}
						placeholder="dist"
						class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
			</div>
		{/if}
	</div>
</BaseNode>
