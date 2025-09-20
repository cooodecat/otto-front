<script lang="ts">
  import { Workflow } from 'lucide-svelte';
  import BaseNode from '../BaseNode.svelte';
  import type { ParallelExecutionNodeData } from '$lib/types/flow-node.types';
  interface Props {
    id: string;
    data: ParallelExecutionNodeData;
  }

  const { data, id }: Props = $props();
</script>

<BaseNode
  {data}
  {id}
  colorClass="bg-gray-500"
  icon={Workflow}
  minWidth={240}
  deletable={true}
  useCICDOutputs={true}
>
  <div class="space-y-2">
    <div class="rounded border border-gray-200 bg-gray-50 p-3">
      <div class="mb-2 text-sm font-medium text-gray-700">⚡ Parallel Execution</div>
      <div class="text-xs text-gray-600">Run multiple tasks in parallel</div>
    </div>
  </div>
</BaseNode>
