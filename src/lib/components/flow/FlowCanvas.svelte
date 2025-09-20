<script lang="ts">
  import { SvelteFlow, Background, Controls, MiniMap, useSvelteFlow } from '@xyflow/svelte';
  import { CICDBlockType } from '$lib/types/flow-node.types';

  interface Props {
    nodes: any[];
    edges: any[];
    nodeTypes: any;
    edgeTypes: any;
    onConnect: (connection: any) => void;
    handleFlowInit: () => void;
    onDragOver: (event: DragEvent) => void;
    handleAddNode: (blockType: CICDBlockType, position: { x: number; y: number }) => void;
    onNodeDragStop?: (event: any) => void;
    onEdgesChange?: (changes: any[]) => void;
  }

  const {
    nodes,
    edges,
    nodeTypes,
    edgeTypes,
    onConnect,
    handleFlowInit,
    onDragOver,
    handleAddNode,
    onNodeDragStop,
    onEdgesChange
  }: Props = $props();

  const { screenToFlowPosition, fitView } = useSvelteFlow();

  let initialFit = $state(true);

  function onDrop(event: DragEvent) {
    event.preventDefault();

    const blockType =
      event.dataTransfer?.getData('application/reactflow') ||
      event.dataTransfer?.getData('text/plain');

    if (!blockType) return;

    // SvelteFlow의 screenToFlowPosition 사용하여 정확한 위치 계산
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY
    });

    // 새 노드 추가 전에 기존 선택 해제를 위해 부모 컴포넌트에서 처리하도록 함

    console.log('🎯 Accurate drop position:', position);
    handleAddNode(blockType as CICDBlockType, position);
  }

  // 초기 로드 시에만 fitView 적용
  $effect(() => {
    if (nodes.length > 0 && initialFit) {
      setTimeout(() => {
        fitView();
        initialFit = false;
      }, 100);
    }
  });
</script>

<div class="h-full w-full" ondragover={onDragOver} ondrop={onDrop}>
  <SvelteFlow
    {nodes}
    {edges}
    {nodeTypes}
    {edgeTypes}
    onconnect={onConnect}
    onnodedragstop={onNodeDragStop}
    onedgeschange={onEdgesChange}
    oninit={handleFlowInit}
    fitView={false}
    class="bg-gray-50"
    selectNodesOnDrag={false}
    multiSelectionKeyCode={null}
    panOnScroll={true}
    panOnScrollSpeed={0.5}
    zoomOnScroll={true}
    zoomOnPinch={true}
    zoomOnDoubleClick={false}
    preventScrolling={false}
    nodesDraggable={true}
    nodesConnectable={true}
    elementsSelectable={true}
    snapToGrid={false}
    snapGrid={[15, 15]}
    deleteKeyCode={null}
  >
    <Background gap={16} />
    <Controls />
    <MiniMap />
  </SvelteFlow>
</div>
