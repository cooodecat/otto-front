<script lang="ts">
  import { TestTube, Plus, X } from 'lucide-svelte';
  import BaseNode from '../BaseNode.svelte';
  import { CICD_GROUP_COLORS, CICDBlockGroup } from '$lib/types/flow-node.types';
  import type { TestCustomNodeData } from '$lib/types/flow-node.types';
  import { getContext } from 'svelte';

  interface Props {
    id: string;
    data: TestCustomNodeData;
  }

  const { data, id }: Props = $props();
  const groupColor = CICD_GROUP_COLORS[CICDBlockGroup.TEST]; // 테스트 그룹 색상 사용

  // 노드 데이터 업데이트 핸들러 가져오기
  const updateNodeData = getContext<
    ((nodeId: string, newData: TestCustomNodeData) => void) | undefined
  >('updateNodeData');

  let isEditing = $state(false);
  let testCommands = $state<string[]>(data?.testCommands || []);
  let workingDirectory = $state(data?.workingDirectory || '');
  let newCommand = $state('');

  // 데이터 저장 헬퍼 함수
  function saveNodeData() {
    if (updateNodeData) {
      updateNodeData(id, {
        testCommands,
        workingDirectory
      });
    }
  }

  function toggleEdit() {
    isEditing = !isEditing;
  }

  function addCommand() {
    if (newCommand.trim()) {
      testCommands = [...testCommands, newCommand.trim()];
      newCommand = '';
      // 저장
      saveNodeData();
    }
  }

  function removeCommand(index: number) {
    testCommands = testCommands.filter((_, i) => i !== index);
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
  icon={TestTube}
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
        <div class="mb-1 text-sm font-medium {groupColor.textClass}">Custom Test</div>
        <div class="text-xs text-gray-600">Run custom test commands</div>
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

        {#if testCommands.length > 0}
          <div>
            <div class="font-medium text-gray-700">Test Commands ({testCommands.length})</div>
            <div class="mt-1 max-h-20 space-y-1 overflow-y-auto">
              {#each testCommands as command (command)}
                <div class="rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
                  {command}
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="text-gray-500">No test commands configured</div>
        {/if}
      </div>
    {/if}

    <!-- 편집 모드 -->
    {#if isEditing}
      <div class="space-y-3 rounded border bg-gray-50 p-3">
        <!-- Working Directory -->
        <div>
          <label for="custom-test-workdir" class="mb-1 block text-sm font-medium text-gray-700"
            >Working Directory (optional)</label
          >
          <input
            id="custom-test-workdir"
            type="text"
            bind:value={workingDirectory}
            onchange={saveNodeData}
            placeholder="e.g., ./tests"
            class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <!-- Test Commands -->
        <div>
          <div class="mb-1 block text-sm font-medium text-gray-700">Test Commands</div>

          <!-- Add new command -->
          <div class="mb-2 flex gap-2">
            <input
              type="text"
              bind:value={newCommand}
              aria-label="New test command"
              onkeypress={handleKeyPress}
              placeholder="Enter test command (e.g., npm test)"
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
          {#if testCommands.length > 0}
            <div class="max-h-32 space-y-1 overflow-y-auto">
              {#each testCommands as command, index (index)}
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
