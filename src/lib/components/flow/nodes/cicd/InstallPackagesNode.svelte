<script lang="ts">
  import { Package } from 'lucide-svelte';
  import BaseNode from '../BaseNode.svelte';
  import { CICD_GROUP_COLORS, CICDBlockGroup } from '$lib/types/flow-node.types';
  import type { InstallPackagesNodeData } from '$lib/types/flow-node.types';
  import { getContext } from 'svelte';

  interface Props {
    id: string;
    data: InstallPackagesNodeData;
  }

  const { id, data }: Props = $props();
  const groupColor = CICD_GROUP_COLORS[CICDBlockGroup.BUILD];

  // 노드 데이터 업데이트 핸들러 가져오기
  const updateNodeData = getContext<((nodeId: string, newData: any) => void) | undefined>(
    'updateNodeData'
  );

  let isEditing = $state(false);
  let packageManager = $state(data?.packageManager || 'npm');
  let cleanInstall = $state(data?.cleanInstall || false);
  let productionOnly = $state(data?.productionOnly || false);

  // 데이터 저장 헬퍼 함수
  function saveNodeData() {
    if (updateNodeData) {
      updateNodeData(id, {
        packageManager,
        cleanInstall,
        productionOnly
      });
    }
  }

  const installCommand = $derived.by(() => {
    let cmd = '';
    switch (packageManager) {
      case 'npm':
        cmd = cleanInstall ? 'npm ci' : 'npm install';
        if (productionOnly) cmd += ' --production';
        break;
      case 'yarn':
        cmd = 'yarn install';
        if (productionOnly) cmd += ' --production';
        if (cleanInstall) cmd += ' --frozen-lockfile';
        break;
      case 'pnpm':
        cmd = cleanInstall ? 'pnpm install --frozen-lockfile' : 'pnpm install';
        if (productionOnly) cmd += ' --prod';
        break;
      case 'bun':
        cmd = 'bun install';
        if (productionOnly) cmd += ' --production';
        break;
    }
    return cmd;
  });

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
    <div
      class="flex items-center justify-between rounded border {groupColor.borderClass} {groupColor.bgClass} p-3"
    >
      <div>
        <div class="mb-1 text-sm font-medium {groupColor.textClass}">Install Packages</div>
        <div class="text-xs text-gray-600">Install project dependencies using package manager</div>
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
          <div class="font-medium text-gray-700">Package Manager</div>
          <div class="mt-1 rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
            {packageManager}
          </div>
        </div>

        <div>
          <div class="font-medium text-gray-700">Install Command</div>
          <div class="mt-1 rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
            {installCommand}
          </div>
        </div>

        <div class="flex gap-2">
          {#if cleanInstall}
            <span class="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">Clean Install</span>
          {/if}
          {#if productionOnly}
            <span class="rounded bg-orange-100 px-2 py-1 text-xs text-orange-700"
              >Production Only</span
            >
          {/if}
        </div>
      </div>
    {/if}

    <!-- 편집 모드 -->
    {#if isEditing}
      <div class="space-y-3 rounded border bg-gray-50 p-3">
        <!-- Package Manager 선택 -->
        <div>
          <label for="install-package-manager" class="mb-1 block text-sm font-medium text-gray-700"
            >Package Manager</label
          >
          <select
            id="install-package-manager"
            bind:value={packageManager}
            onchange={saveNodeData}
            class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="npm">npm</option>
            <option value="yarn">yarn</option>
            <option value="pnpm">pnpm</option>
            <option value="bun">bun</option>
          </select>
        </div>

        <!-- 옵션들 -->
        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              bind:checked={cleanInstall}
              onchange={saveNodeData}
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Clean Install (use lockfile)</span>
          </label>

          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              bind:checked={productionOnly}
              onchange={saveNodeData}
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Production Only (skip devDependencies)</span>
          </label>
        </div>

        <!-- 미리보기 -->
        <div>
          <label for="install-command-preview" class="mb-1 block text-sm font-medium text-gray-700"
            >Command Preview</label
          >
          <div
            id="install-command-preview"
            class="rounded border bg-white px-3 py-2 font-mono text-sm text-gray-800"
          >
            {installCommand}
          </div>
        </div>
      </div>
    {/if}
  </div>
</BaseNode>
