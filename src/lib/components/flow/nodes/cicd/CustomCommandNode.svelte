<script lang="ts">
  import { Terminal, Plus, X } from 'lucide-svelte';
  import BaseNode from '../BaseNode.svelte';
  import { CICD_GROUP_COLORS, CICDBlockGroup } from '$lib/types/flow-node.types';
  import type { CustomCommandNodeData } from '$lib/types/flow-node.types';
  import { getContext } from 'svelte';

  interface Props {
    id: string;
    data: CustomCommandNodeData;
  }

  const { data, id }: Props = $props();
  const groupColor = CICD_GROUP_COLORS[CICDBlockGroup.UTILITY];

  // 노드 데이터 업데이트 핸들러 가져오기
  const updateNodeData = getContext<((nodeId: string, newData: any) => void) | undefined>(
    'updateNodeData'
  );

  let isEditing = $state(false);
  let commands = $state<string[]>(data?.commands || []);
  let workingDirectory = $state(data?.workingDirectory || '');
  let newCommand = $state('');

  // 데이터 저장 헬퍼 함수
  function saveNodeData() {
    if (updateNodeData) {
      updateNodeData(id, {
        commands,
        workingDirectory
      });
    }
  }

  function toggleEdit() {
    isEditing = !isEditing;
  }

  function addCommand() {
    if (newCommand.trim()) {
      commands = [...commands, newCommand.trim()];
      newCommand = '';
      saveNodeData();
    }
  }

  function removeCommand(index: number) {
    commands = commands.filter((_, i) => i !== index);
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
  icon={Terminal}
  minWidth={280}
  showInput={true}
  useCICDOutputs={true}
>
  <div class="space-y-2">
    <!-- 헤더 및 토글 버튼 -->
    <div
      class="flex items-center justify-between rounded border {groupColor.borderClass} {groupColor.bgClass} p-3"
    >
      <div>
        <div class="mb-1 text-sm font-medium {groupColor.textClass}">Custom Command</div>
        <div class="text-xs text-gray-600">Run custom shell commands</div>
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
        {#if workingDirectory}
          <div>
            <div class="font-medium text-gray-700">Working Directory</div>
            <div class="mt-1 rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
              {workingDirectory}
            </div>
          </div>
        {/if}

        {#if commands.length > 0}
          <div>
            <div class="font-medium text-gray-700">Commands ({commands.length})</div>
            <div class="mt-1 max-h-20 space-y-1 overflow-y-auto">
              {#each commands as command}
                <div class="rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
                  {command}
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="text-gray-500">No commands configured</div>
        {/if}
      </div>
    {/if}

    <!-- 편집 모드 -->
    {#if isEditing}
      <div class="space-y-3 rounded border bg-gray-50 p-3">
        <!-- Working Directory -->
        <div>
          <label for="working-dir-{id}" class="mb-1 block text-sm font-medium text-gray-700"
            >Working Directory (optional)</label
          >
          <input
            id="working-dir-{id}"
            type="text"
            bind:value={workingDirectory}
            onchange={saveNodeData}
            placeholder="e.g., ./scripts"
            class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <!-- Commands -->
        <div>
          <label for="command-input-{id}" class="mb-1 block text-sm font-medium text-gray-700"
            >Commands</label
          >

          <!-- Add new command -->
          <div class="mb-2 flex gap-2">
            <input
              id="command-input-{id}"
              type="text"
              bind:value={newCommand}
              onkeypress={handleKeyPress}
              placeholder="Enter command (e.g., echo 'Hello World')"
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
          {#if commands.length > 0}
            <div class="max-h-32 space-y-1 overflow-y-auto">
              {#each commands as command, index}
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
