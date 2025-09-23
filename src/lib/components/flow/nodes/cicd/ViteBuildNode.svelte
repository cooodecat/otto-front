<script lang="ts">
  import { Zap } from 'lucide-svelte';
  import BaseNode from '../BaseNode.svelte';
  import { CICD_GROUP_COLORS, CICDBlockGroup } from '$lib/types/flow-node.types';
  import type { BuildViteNodeData } from '$lib/types/flow-node.types';
  import { getContext } from 'svelte';

  interface Props {
    id: string;
    data: BuildViteNodeData;
  }

  const { data, id }: Props = $props();
  const groupColor = CICD_GROUP_COLORS[CICDBlockGroup.BUILD];

  // 노드 데이터 업데이트 핸들러 가져오기
  const updateNodeData = getContext<
    ((nodeId: string, newData: BuildViteNodeData) => void) | undefined
  >('updateNodeData');

  let isEditing = $state(false);
  let mode = $state(data.mode || 'production');
  let basePath = $state(data.basePath || '');
  let outputDir = $state(data.outputDir || 'dist');

  // 데이터 저장 헬퍼 함수
  function saveNodeData() {
    if (updateNodeData) {
      updateNodeData(id, {
        mode,
        basePath,
        outputDir
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
  icon={Zap}
  minWidth={260}
  showInput={true}
  useCICDOutputs={true}
>
  <div class="space-y-2">
    <!-- 헤더 및 토글 버튼 -->
    <div
      class="flex items-center justify-between rounded border {groupColor.borderClass} {groupColor.bgClass} p-3"
    >
      <div>
        <div class="mb-1 text-sm font-medium {groupColor.textClass}">Vite Build</div>
        <div class="text-xs text-gray-600">Build project using Vite bundler</div>
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
          <div class="font-medium text-gray-700">Base Path</div>
          <div class="mt-1 rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
            {basePath || '/'}
          </div>
        </div>

        <div>
          <div class="font-medium text-gray-700">Output Directory</div>
          <div class="mt-1 rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
            {outputDir}
          </div>
        </div>
      </div>
    {/if}

    <!-- 편집 모드 -->
    {#if isEditing}
      <div class="space-y-3 rounded border bg-gray-50 p-3">
        <!-- Mode 선택 -->
        <div>
          <label for="vite-build-mode" class="mb-1 block text-sm font-medium text-gray-700"
            >Build Mode</label
          >
          <select
            id="vite-build-mode"
            bind:value={mode}
            onchange={saveNodeData}
            class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="development">Development</option>
            <option value="production">Production</option>
          </select>
        </div>

        <!-- Base Path -->
        <div>
          <label for="vite-base-path" class="mb-1 block text-sm font-medium text-gray-700"
            >Base Path</label
          >
          <input
            id="vite-base-path"
            type="text"
            bind:value={basePath}
            onchange={saveNodeData}
            placeholder="/"
            class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <!-- Output Directory -->
        <div>
          <label for="vite-output-dir" class="mb-1 block text-sm font-medium text-gray-700"
            >Output Directory</label
          >
          <input
            id="vite-output-dir"
            type="text"
            bind:value={outputDir}
            onchange={saveNodeData}
            placeholder="dist"
            class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>
    {/if}
  </div>
</BaseNode>
