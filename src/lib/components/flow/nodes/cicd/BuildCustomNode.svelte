<script lang="ts">
  import { Settings, Plus, X } from 'lucide-svelte';
  import BaseNode from '../BaseNode.svelte';
  import { CICD_GROUP_COLORS, CICDBlockGroup } from '$lib/types/flow-node.types';
  import type { BuildCustomNodeData } from '$lib/types/flow-node.types';
  import { getContext } from 'svelte';
  interface Props {
    id: string;
    data: BuildCustomNodeData;
  }

  const { data, id }: Props = $props();
  const groupColor = CICD_GROUP_COLORS[CICDBlockGroup.BUILD];

  // 노드 데이터 업데이트 핸들러 가져오기
  const updateNodeData = getContext<((nodeId: string, newData: any) => void) | undefined>(
    'updateNodeData'
  );

  let isEditing = $state(false);
  let packageManager = $state(data.packageManager || 'npm');
  let scriptName = $state(data.scriptName || '');
  let customCommands = $state(data.customCommands || []);
  let workingDirectory = $state(data.workingDirectory || '');
  let newCommand = $state('');

  // 데이터 저장 헬퍼 함수
  function saveNodeData() {
    if (updateNodeData) {
      updateNodeData(id, {
        packageManager,
        scriptName,
        customCommands,
        workingDirectory
      });
    }
  }

  function toggleEdit() {
    isEditing = !isEditing;
  }

  function addCommand() {
    if (newCommand.trim()) {
      customCommands = [...customCommands, newCommand.trim()];
      newCommand = '';
      // 저장
      saveNodeData();
    }
  }

  function removeCommand(index: number) {
    customCommands = customCommands.filter((_, i) => i !== index);
    // 저장
    saveNodeData();
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      addCommand();
    }
  }
</script>

<BaseNode
  {data}
  {id}
  colorClass={groupColor.colorClass}
  icon={Settings}
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
        <div class="mb-1 text-sm font-medium {groupColor.textClass}">Custom Build</div>
        <div class="text-xs text-gray-600">Run custom build commands</div>
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
          <div class="mt-1 font-mono text-xs text-gray-600">{packageManager}</div>
        </div>

        {#if scriptName}
          <div>
            <div class="font-medium text-gray-700">Script Name</div>
            <div class="mt-1 font-mono text-xs text-gray-600">{scriptName}</div>
          </div>
        {/if}

        {#if workingDirectory}
          <div>
            <div class="font-medium text-gray-700">Working Directory</div>
            <div class="mt-1 font-mono text-xs text-gray-600">{workingDirectory}</div>
          </div>
        {/if}

        {#if customCommands.length > 0}
          <div>
            <div class="font-medium text-gray-700">Custom Commands ({customCommands.length})</div>
            <div class="mt-1 max-h-20 space-y-1 overflow-y-auto">
              {#each customCommands as command}
                <div class="font-mono text-xs text-gray-600">{command}</div>
              {/each}
            </div>
          </div>
        {/if}

        {#if !scriptName && customCommands.length === 0}
          <div class="text-gray-500">No build commands configured</div>
        {/if}
      </div>
    {/if}

    <!-- 편집 모드 -->
    {#if isEditing}
      <div class="space-y-3 rounded border bg-gray-50 p-3">
        <!-- Package Manager -->
        <div>
          <label for="custom-package-manager" class="mb-1 block text-sm font-medium text-gray-700"
            >Package Manager</label
          >
          <select
            id="custom-package-manager"
            bind:value={packageManager}
            onchange={saveNodeData}
            class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="npm">npm</option>
            <option value="yarn">yarn</option>
            <option value="pnpm">pnpm</option>
          </select>
        </div>

        <!-- Script Name -->
        <div>
          <label for="custom-script-name" class="mb-1 block text-sm font-medium text-gray-700"
            >Script Name (optional)</label
          >
          <input
            id="custom-script-name"
            type="text"
            bind:value={scriptName}
            onchange={saveNodeData}
            placeholder="e.g., build, build:prod"
            class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <!-- Working Directory -->
        <div>
          <label for="custom-working-dir" class="mb-1 block text-sm font-medium text-gray-700"
            >Working Directory (optional)</label
          >
          <input
            id="custom-working-dir"
            type="text"
            bind:value={workingDirectory}
            onchange={saveNodeData}
            placeholder="e.g., ./frontend"
            class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <!-- Custom Commands -->
        <div>
          <label for="custom-command-input" class="mb-1 block text-sm font-medium text-gray-700"
            >Custom Commands</label
          >

          <!-- Add new command -->
          <div class="mb-2 flex gap-2">
            <input
              id="custom-command-input"
              type="text"
              bind:value={newCommand}
              onkeypress={handleKeyPress}
              placeholder="Enter command (e.g., npm run build)"
              class="flex-1 rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              onclick={addCommand}
              class="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <Plus class="h-4 w-4" />
            </button>
          </div>

          <!-- Existing commands -->
          {#if customCommands.length > 0}
            <div class="max-h-32 space-y-1 overflow-y-auto">
              {#each customCommands as command, index}
                <div class="flex items-center justify-between rounded bg-white px-2 py-1 text-sm">
                  <span class="font-mono">{command}</span>
                  <button
                    onclick={() => removeCommand(index)}
                    class="text-red-500 hover:text-red-600 focus:outline-none"
                  >
                    <X class="h-3 w-3" />
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</BaseNode>
