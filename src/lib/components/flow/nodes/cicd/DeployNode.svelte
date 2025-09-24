<script lang="ts">
  import { Rocket, Plus, X } from 'lucide-svelte';
  import BaseNode from '../BaseNode.svelte';
  import { CICD_GROUP_COLORS, CICDBlockGroup } from '$lib/types/flow-node.types';
  import type { DeployNodeData } from '$lib/types/flow-node.types';
  import { getContext } from 'svelte';

  interface Props {
    id: string;
    data: DeployNodeData;
  }

  const { id, data }: Props = $props();
  const groupColor = CICD_GROUP_COLORS[CICDBlockGroup.DEPLOY];

  const updateNodeData = getContext<
    ((nodeId: string, newData: DeployNodeData) => void) | undefined
  >('updateNodeData');

  let isEditing = $state(false);
  let commands = $state<string[]>(data?.commands || []);
  let workingDirectory = $state(data?.workingDirectory || '');
  let newCommand = $state('');

  function saveNodeData() {
    if (updateNodeData) {
      updateNodeData(id, {
        ...data,
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
  {id}
  {data}
  colorClass={groupColor.colorClass}
  icon={Rocket}
  minWidth={280}
  showInput={true}
  useCICDOutputs={true}
>
  <div class="space-y-2">
    <div
      class="flex items-center justify-between rounded border {groupColor.borderClass} {groupColor.bgClass} p-3"
    >
      <div>
        <div class="mb-1 text-sm font-medium {groupColor.textClass}">Deploy</div>
        <div class="text-xs text-gray-600">Deploy your application</div>
      </div>
      <button
        onclick={toggleEdit}
        class="text-xs text-blue-600 hover:text-blue-700 focus:outline-none"
      >
        {isEditing ? 'Done' : 'Edit'}
      </button>
    </div>

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
            <div class="font-medium text-gray-700">Commands</div>
            <div class="mt-1 space-y-1">
              {#each commands as command (command)}
                <div class="rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
                  {command}
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="py-2 text-center text-gray-500">No deploy commands configured</div>
        {/if}
      </div>
    {/if}

    {#if isEditing}
      <div class="space-y-3 rounded border bg-gray-50 p-3">
        <div>
          <label for="deploy-workdir" class="mb-1 block text-sm font-medium text-gray-700"
            >Working Directory</label
          >
          <input
            id="deploy-workdir"
            type="text"
            bind:value={workingDirectory}
            onchange={saveNodeData}
            placeholder="./dist"
            class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <div class="mb-1 block text-sm font-medium text-gray-700">Deploy Commands</div>

          {#if commands.length > 0}
            <div class="mb-2 space-y-1">
              {#each commands as command, index (index)}
                <div class="flex items-center gap-2">
                  <div class="flex-1 rounded border bg-white px-2 py-1 font-mono text-xs">
                    {command}
                  </div>
                  <button
                    onclick={() => removeCommand(index)}
                    class="text-red-600 hover:text-red-700"
                    title="Remove command"
                  >
                    <X class="h-3 w-3" />
                  </button>
                </div>
              {/each}
            </div>
          {/if}

          <div class="flex gap-2">
            <input
              type="text"
              bind:value={newCommand}
              onkeydown={handleKeyPress}
              placeholder="rsync -av ./dist/ user@server:/var/www/"
              class="flex-1 rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              onclick={addCommand}
              class="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
              title="Add command"
            >
              <Plus class="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</BaseNode>
