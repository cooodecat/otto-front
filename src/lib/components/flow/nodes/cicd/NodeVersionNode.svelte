<script lang="ts">
  import { Package } from 'lucide-svelte';
  import BaseNode from '../BaseNode.svelte';
  import { CICD_GROUP_COLORS, CICDBlockGroup } from '$lib/types/flow-node.types';
  import type { NodeVersionNodeData } from '$lib/types/flow-node.types';
  import { getContext } from 'svelte';
  interface Props {
    id: string;
    data: NodeVersionNodeData;
  }

  const { data, id }: Props = $props();
  const groupColor = CICD_GROUP_COLORS[CICDBlockGroup.PREBUILD];

  // 노드 데이터 업데이트 핸들러 가져오기
  const updateNodeData = getContext<((nodeId: string, newData: any) => void) | undefined>(
    'updateNodeData'
  );

  let version = $state(data.version || '18');
  let pkgManager = $state(data.packageManager || 'npm'); // 기본값을 npm으로 변경

  // 데이터 저장 헬퍼 함수
  function saveNodeData() {
    if (updateNodeData) {
      updateNodeData(id, {
        version,
        packageManager: pkgManager
      });
    }
  }

  const updatedData = $derived({
    ...data,
    version,
    packageManager: pkgManager
  });
</script>

<BaseNode
  data={updatedData}
  {id}
  colorClass={groupColor.colorClass}
  icon={Package}
  minWidth={320}
  deletable={true}
  showOutput={true}
>
  <div class="space-y-3">
    <div class="rounded border {groupColor.borderClass} {groupColor.bgClass} p-3">
      <div class="grid grid-cols-2 items-center gap-3">
        <div>
          <label class="mb-1 block text-xs text-gray-600"> Version </label>
          <input
            type="text"
            bind:value={version}
            onchange={saveNodeData}
            oninput={saveNodeData}
            class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="e.g. 18"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-gray-600"> Package Manager </label>
          <select
            bind:value={pkgManager}
            onchange={saveNodeData}
            class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="npm">npm</option>
            <option value="yarn">yarn</option>
            <option value="pnpm">pnpm</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</BaseNode>
