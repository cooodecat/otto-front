<script lang="ts">
  import { Play } from 'lucide-svelte';
  import BaseNode from './BaseNode.svelte';
  import type { PipelineStartNodeData } from '$lib/types/flow-node.types';

  interface Props {
    id: string;
    data: PipelineStartNodeData;
  }

  const { id, data }: Props = $props();
</script>

<BaseNode
  {id}
  {data}
  colorClass="bg-purple-500"
  icon={Play}
  showInput={false}
  showOutput={true}
  deletable={false}
>
  <div class="text-sm text-gray-700">
    <p>파이프라인의 시작점입니다</p>
    <p class="mt-1 text-xs text-gray-500">이 노드에서 워크플로우가 시작됩니다</p>
  </div>
</BaseNode>
