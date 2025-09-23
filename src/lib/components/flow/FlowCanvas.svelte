<script lang="ts">
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    useSvelteFlow,
    type Node,
    type Edge,
    type NodeTypes,
    type EdgeTypes,
    type Connection,
    type NodeTargetEventWithPointer
  } from '@xyflow/svelte';
  import { CICDBlockType } from '$lib/types/flow-node.types';

  interface Props {
    nodes: Node[];
    edges: Edge[];
    nodeTypes: NodeTypes;
    edgeTypes: EdgeTypes;
    onConnect: (connection: Connection) => void;
    handleFlowInit: () => void;
    onDragOver: (event: DragEvent) => void;
    handleAddNode: (blockType: CICDBlockType, position: { x: number; y: number }) => void;
    onNodeDragStop?: NodeTargetEventWithPointer<MouseEvent | TouchEvent>;
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
    onNodeDragStop
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

<div
  class="h-full w-full"
  role="application"
  aria-label="Flow diagram editor"
  ondragover={onDragOver}
  ondrop={onDrop}
>
  <SvelteFlow
    {nodes}
    {edges}
    {nodeTypes}
    {edgeTypes}
    onconnect={onConnect}
    onnodedragstop={onNodeDragStop}
    oninit={handleFlowInit}
    fitView={false}
    class="bg-gray-50"
    selectNodesOnDrag={false}
    panOnScroll={true}
    panOnScrollSpeed={0.5}
    zoomOnScroll={true}
    zoomOnPinch={true}
    zoomOnDoubleClick={false}
    preventScrolling={false}
    nodesDraggable={true}
    nodesConnectable={true}
    elementsSelectable={true}
  >
    <Background gap={16} />
    <Controls />
    <MiniMap />
  </SvelteFlow>
</div>
