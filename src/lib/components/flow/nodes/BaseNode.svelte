<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { Trash2, Settings } from 'lucide-svelte';
  import { getContext } from 'svelte';
  import type { AnyCICDNodeData } from '$lib/types/flow-node.types';

  interface OutputHandle {
    id: string;
    position: Position;
    style?: Record<string, string>;
  }

  interface Props {
    id: string;
    data: AnyCICDNodeData;
    colorClass?: string;
    icon?: typeof Settings | string;
    minWidth?: number;
    deletable?: boolean;
    showInput?: boolean;
    showOutput?: boolean;
    outputHandles?: OutputHandle[];
    useCICDOutputs?: boolean;
    cicdOutputConfig?: {
      showSuccess?: boolean;
      showFailed?: boolean;
      successColor?: string;
      failedColor?: string;
    };
    children?: import('svelte').Snippet;
  }

  const {
    id,
    data,
    colorClass = 'bg-blue-500',
    icon = Settings,
    minWidth = 200,
    deletable = true,
    showInput = true,
    showOutput = false,
    outputHandles = [],
    useCICDOutputs = false,
    cicdOutputConfig = {
      showSuccess: true,
      showFailed: true,
      successColor: '#10b981',
      failedColor: '#ef4444'
    },
    children
  }: Props = $props();

  const label = $derived(data?.label || 'Unknown Node');
  const description = $derived(data?.description || '');

  // 부모에서 전달된 삭제 핸들러 가져오기
  const deleteNodeHandler = getContext<((nodeId: string) => void) | undefined>('deleteNodeHandler');

  function handleDelete(event: MouseEvent) {
    event.stopPropagation();
    if (deleteNodeHandler) {
      deleteNodeHandler(id);
    } else {
      console.log('Delete node (no handler):', id);
    }
  }
</script>

<div class="relative" style="min-width: {minWidth}px">
  <!-- Input Handle -->
  {#if showInput}
    <Handle
      type="target"
      position={Position.Top}
      style="background: #555; width: 12px; height: 12px;"
    />
  {/if}

  <!-- Node Body -->
  <div class="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
    <!-- Header -->
    <div
      class="drag-handle flex items-center justify-between px-3 py-2 {colorClass} cursor-grab text-white"
    >
      <div class="flex items-center gap-2">
        {#if typeof icon === 'string'}
          <span class="text-lg">{icon}</span>
        {:else if icon}
          {@const Icon = icon}
          <Icon class="h-4 w-4 text-white" />
        {/if}
        <span class="text-sm font-medium">{label}</span>
      </div>

      {#if deletable}
        <button
          onclick={handleDelete}
          class="rounded p-1 transition-colors hover:bg-white/20"
          title="Delete node"
        >
          <Trash2 class="h-3 w-3" />
        </button>
      {/if}
    </div>

    <!-- Content -->
    <div class="bg-white p-3">
      {#if description}
        <p class="mb-2 text-xs text-gray-600">{description}</p>
      {/if}

      <!-- Render custom content -->
      {#if children}
        {@render children()}
      {/if}
    </div>
  </div>

  <!-- Output Handles -->
  {#if showOutput}
    <Handle
      type="source"
      position={Position.Bottom}
      id="default"
      style="background: #555; width: 12px; height: 12px;"
    />
  {/if}

  <!-- Custom Output Handles -->
  {#each outputHandles as handle (handle.id)}
    <Handle
      type="source"
      position={handle.position}
      id={handle.id}
      style={Object.entries(handle.style || {})
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ')}
    />
  {/each}

  <!-- CI/CD Success/Failed Outputs -->
  {#if useCICDOutputs}
    {#if cicdOutputConfig.showSuccess}
      <Handle
        type="source"
        position={Position.Bottom}
        id="success-output"
        style="background: {cicdOutputConfig.successColor}; width: 12px; height: 12px; left: 25%;"
      />
    {/if}

    {#if cicdOutputConfig.showFailed}
      <Handle
        type="source"
        position={Position.Bottom}
        id="failed-output"
        style="background: {cicdOutputConfig.failedColor}; width: 12px; height: 12px; left: 75%;"
      />
    {/if}

    <!-- Success/Failed 라벨 제거 - 간선 색상으로 충분함 -->
  {/if}
</div>
