<script lang="ts">
  import { Rocket } from 'lucide-svelte';
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
  let port = $state(data?.deployOption?.port || 3000);
  let command = $state(data?.deployOption?.command || 'npm start');

  function saveNodeData() {
    if (updateNodeData) {
      updateNodeData(id, {
        ...data,
        deployOption: { port, command }
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
        <!-- Deploy Options -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <div class="font-medium text-gray-700">Port</div>
            <div class="mt-1 rounded border bg-blue-50 px-2 py-1 font-mono text-xs text-blue-800">
              {port}
            </div>
          </div>
          <div>
            <div class="font-medium text-gray-700">Start Command</div>
            <div class="mt-1 rounded border bg-green-50 px-2 py-1 font-mono text-xs text-green-800">
              {command}
            </div>
          </div>
        </div>
      </div>
    {/if}

    {#if isEditing}
      <div class="space-y-3 rounded border bg-gray-50 p-3">
        <!-- Deploy Options -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="deploy-port" class="mb-1 block text-sm font-medium text-gray-700"
              >Port</label
            >
            <input
              id="deploy-port"
              type="number"
              min="1"
              max="65535"
              bind:value={port}
              onchange={saveNodeData}
              placeholder="3000"
              class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label for="deploy-command" class="mb-1 block text-sm font-medium text-gray-700"
              >Start Command</label
            >
            <input
              id="deploy-command"
              type="text"
              bind:value={command}
              onchange={saveNodeData}
              placeholder="npm start"
              class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    {/if}
  </div>
</BaseNode>
