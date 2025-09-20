<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import api from '$lib/sdk';
  import { makeFetch } from '$lib/utils/make-fetch';
  import { RotateCcw, Play, Loader2, Save, ArrowLeft } from 'lucide-svelte';
  import { SvelteFlowProvider } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { nodeTypes, createNodeInstance } from '$lib/components/flow/nodeTypes';
  import { edgeTypes } from '$lib/components/flow/edgeTypes';
  import FlowSidebar from '$lib/components/flow/FlowSidebar.svelte';
  import FlowCanvas from '$lib/components/flow/FlowCanvas.svelte';
  import { CICDBlockType } from '$lib/types/flow-node.types';

  const projectId = $page.params.project_id;
  const pipelineId = $page.params.pipeline_id;

  let pipeline = $state<any>(null);
  let loading = $state(true);
  let error = $state('');
  let isSaving = $state(false);
  let isRunning = $state(false);

  // Flow 관련 상태
  let nodes = $state<any[]>([]);
  let edges = $state<any[]>([]);
  let initialized = $state(false);
  let _flowInstance = $state<any>(null);
  let showResetConfirm = $state(false);

  onMount(async () => {
    await loadPipeline();
    if (!initialized) {
      initializeFlow();
      initialized = true;
    }
  });

  // 로컬스토리지 자동 저장 (nodes 변경 감지)
  $effect(() => {
    if (initialized && projectId && pipelineId && nodes.length > 0) {
      console.log('🔄 $effect triggered - Nodes changed:', {
        nodeCount: nodes.length,
        initialized,
        projectId,
        pipelineId,
        nodes: nodes.map((n) => ({ id: n.id, position: n.position }))
      });
      saveToLocalStorage();
    } else {
      console.log('🚫 $effect triggered but conditions not met:', {
        initialized,
        projectId,
        pipelineId,
        nodeCount: nodes.length
      });
    }
  });

  // 로컬스토리지 자동 저장 (edges 변경 감지) - 실제 변경이 있을 때만
  let lastEdgeCount = $state(0);
  $effect(() => {
    if (initialized && projectId && pipelineId && edges.length !== lastEdgeCount) {
      console.log('🔗 Edges actually changed:', lastEdgeCount, '->', edges.length);
      lastEdgeCount = edges.length;
      saveToLocalStorage();
    }
  });

  async function loadPipeline() {
    if (!pipelineId) {
      error = '파이프라인 ID가 없습니다';
      loading = false;
      return;
    }

    try {
      const storageKey = `pipeline-${projectId}-${pipelineId}`;

      // 1. 로컬스토리지에서 확인
      console.log(`💾 Checking localStorage for pipeline (${storageKey})`);
      const savedData = localStorage.getItem(storageKey);

      if (savedData) {
        try {
          const { nodes: savedNodes, edges: savedEdges } = JSON.parse(savedData);
          console.log(`✅ Found pipeline in localStorage:`, {
            nodes: savedNodes.length,
            edges: savedEdges.length
          });

          nodes = savedNodes;
          edges = savedEdges;

          // 서버에서 파이프라인 메타데이터만 로드
          const data = await api.functional.pipelines.getPipelineById(
            makeFetch({ fetch }),
            pipelineId
          );
          pipeline = data;
          loading = false;
          return;
        } catch (parseError) {
          console.error('❌ Failed to parse saved pipeline data:', parseError);
          // 파싱 실패 시 로컬스토리지 삭제하고 서버에서 로드
          localStorage.removeItem(storageKey);
        }
      }

      // 2. 로컬스토리지에 없으면 서버에서 파이프라인 정보 가져오기
      console.log(`🌐 Loading pipeline from server: ${pipelineId}`);

      try {
        const data = await api.functional.pipelines.getPipelineById(
          makeFetch({ fetch }),
          pipelineId
        );
        console.log(`✅ Pipeline loaded from server:`, data);

        pipeline = data;

        // 서버에 저장된 플로우 데이터가 있다면 로드
        if (data.data && data.data.nodes && data.data.edges && data.data.nodes.length > 0) {
          console.log(`📁 Using server pipeline data:`, {
            nodes: data.data.nodes.length,
            edges: data.data.edges.length
          });

          nodes = data.data.nodes;
          edges = data.data.edges;

          // 서버 데이터를 로컬스토리지에 저장
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              nodes: data.data.nodes,
              edges: data.data.edges
            })
          );
          console.log(`💾 Server data saved to localStorage (${storageKey})`);
        } else {
          // 3. 서버에도 플로우 데이터가 없으면 기본 시작 노드 생성
          console.log(`🏁 No pipeline data found, will create default start node`);
          nodes = [];
          edges = [];
        }
      } catch (serverError) {
        console.error('❌ Failed to load pipeline from server:', serverError);

        // 서버 로드 실패 시에도 기본 시작 노드 생성
        console.log(`🏁 Server load failed, will create default start node`);
        nodes = [];
        edges = [];
        error = '서버에서 파이프라인을 불러올 수 없습니다. 새로운 파이프라인을 시작합니다.';
      }
    } catch (err) {
      console.error('❌ Pipeline load error:', err);
      error = '파이프라인을 불러오는데 실패했습니다';
      // 모든 실패 시에도 기본 시작 노드 생성
      nodes = [];
      edges = [];
    }

    loading = false;
  }

  function initializeFlow() {
    // 기본 시작 노드 생성
    if (nodes.length === 0) {
      console.log('🏁 Creating default Pipeline Start node...');
      const startNode = {
        ...createNodeInstance(CICDBlockType.PIPELINE_START, { x: 250, y: 50 }),
        // 시작 노드는 삭제 불가능하도록 설정
        selectable: false,
        deletable: false
      };

      // Pipeline Start 노드는 onFailed 강제로 null
      startNode.data.onFailed = null;

      nodes = [startNode];
      edges = [];
    }
  }

  // 로컬스토리지 저장 함수
  function saveToLocalStorage() {
    if (projectId && pipelineId && (nodes.length > 0 || edges.length > 0)) {
      const storageKey = `pipeline-${projectId}-${pipelineId}`;
      const pipelineData = { nodes, edges };

      console.log(`💾 SAVING TO LOCALSTORAGE (${storageKey}):`, {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        nodePositions: nodes.map((n) => ({ id: n.id, position: n.position })),
        timestamp: new Date().toISOString()
      });

      localStorage.setItem(storageKey, JSON.stringify(pipelineData));

      // 저장 확인
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log(`✅ CONFIRMED SAVED TO LOCALSTORAGE:`, {
          savedNodeCount: parsed.nodes?.length,
          savedEdgeCount: parsed.edges?.length,
          savedNodePositions: parsed.nodes?.map((n: any) => ({ id: n.id, position: n.position }))
        });
      } else {
        console.error('❌ FAILED TO SAVE TO LOCALSTORAGE');
      }
    } else {
      console.log('🚫 SKIPPING LOCALSTORAGE SAVE:', {
        projectId,
        pipelineId,
        nodeCount: nodes.length,
        edgeCount: edges.length
      });
    }
  }

  // 파이프라인 초기화 (시작 노드만 남김)
  function resetPipeline() {
    // 확인 모달 표시
    showResetConfirm = true;
  }

  function confirmReset() {
    showResetConfirm = false;

    console.log('🔄 Resetting pipeline - keeping only one Pipeline Start node');

    // Pipeline Start 노드만 필터링
    const pipelineStartNodes = nodes.filter((node) => node.type === CICDBlockType.PIPELINE_START);

    if (pipelineStartNodes.length === 0) {
      // Pipeline Start 노드가 없으면 새로 생성
      initializeFlow();
    } else if (pipelineStartNodes.length === 1) {
      // Pipeline Start 노드가 하나만 있으면 그것만 남김
      nodes = pipelineStartNodes;
      edges = [];
    } else {
      // Pipeline Start 노드가 여러 개면 첫 번째만 남김
      console.log(
        `⚠️ Found ${pipelineStartNodes.length} Pipeline Start nodes, keeping only the first one`
      );
      nodes = [pipelineStartNodes[0]];
      edges = [];
    }

    // 로컬스토리지도 업데이트
    if (projectId && pipelineId) {
      const storageKey = `pipeline-${projectId}-${pipelineId}`;
      const resetData = {
        nodes: nodes,
        edges: []
      };
      localStorage.setItem(storageKey, JSON.stringify(resetData));
      console.log(`💾 Reset saved to localStorage (${storageKey})`);
    }

    console.log('✅ Pipeline reset completed');
  }

  function cancelReset() {
    showResetConfirm = false;
  }

  async function handleSave() {
    if (!pipeline || !pipelineId) return;

    isSaving = true;
    try {
      const flowData = { nodes, edges };

      await api.functional.pipelines.updatePipeline(makeFetch({ fetch }), pipelineId, {
        pipelineName: pipeline.pipelineName,
        data: flowData
      });

      // 성공 메시지 (나중에 toast로 교체)
      console.log('파이프라인이 저장되었습니다!');
    } catch (err) {
      console.error('저장 실패:', err);
      error = '저장에 실패했습니다';
    }

    isSaving = false;
  }

  async function handleRun() {
    // 먼저 저장
    await handleSave();

    isRunning = true;
    try {
      // TODO: 빌드 실행 API 호출
      console.log('파이프라인 실행:', { nodes, edges });

      // 임시: 2초 후 완료
      setTimeout(() => {
        isRunning = false;
        console.log('빌드가 시작되었습니다!');
      }, 2000);
    } catch (err) {
      console.error('실행 실패:', err);
      error = '실행에 실패했습니다';
      isRunning = false;
    }
  }

  function handleBack() {
    goto(`/projects/${projectId}/pipelines`);
  }

  // Flow 이벤트 핸들러들
  function _onNodeClick(event: CustomEvent) {
    console.log('Node clicked:', event.detail);
  }

  function _onEdgeClick(event: CustomEvent) {
    console.log('Edge clicked:', event.detail);
  }

  function updateNodeConnections(
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandle: string,
    isRemoving = false
  ) {
    const sourceNode = nodes.find((node) => node.id === sourceNodeId);
    if (!sourceNode) return;

    const updatedNodes = nodes.map((node) => {
      if (node.id === sourceNodeId) {
        const updatedData = { ...node.data };

        // Pipeline Start 노드는 onFailed가 항상 null
        const isPipelineStart = node.data.blockType === 'pipeline_start';

        if (isRemoving) {
          // 연결 제거 시
          if (sourceHandle === 'success') {
            updatedData.onSuccess = null;
          } else if (sourceHandle === 'failed' && !isPipelineStart) {
            updatedData.onFailed = null;
          } else {
            updatedData.onSuccess = null; // default handle
          }
        } else {
          // 연결 추가 시
          if (sourceHandle === 'success') {
            updatedData.onSuccess = targetNodeId;
          } else if (sourceHandle === 'failed' && !isPipelineStart) {
            updatedData.onFailed = targetNodeId;
          } else {
            updatedData.onSuccess = targetNodeId; // default handle
          }
        }

        // Pipeline Start 노드는 onFailed 강제로 null 유지
        if (isPipelineStart) {
          updatedData.onFailed = null;
        }

        return { ...node, data: updatedData };
      }
      return node;
    });

    nodes = updatedNodes;
    console.log(
      `🔄 Updated node ${sourceNodeId} connections:`,
      isRemoving ? 'removed' : 'added',
      `${sourceHandle} -> ${targetNodeId}`
    );
  }

  function onConnect(connection: any) {
    console.log('🔗 Connection attempt:', connection);

    // 1:1 연결 제한 - 이미 같은 source handle에서 나가는 연결이 있으면 삭제
    const sourceHandle = connection.sourceHandle || 'default';
    console.log('📍 Source handle:', sourceHandle);

    const existingEdge = edges.find(
      (edge) =>
        edge.source === connection.source && (edge.sourceHandle || 'default') === sourceHandle
    );

    if (existingEdge) {
      console.log('🗑️ Removing existing connection from same source handle:', existingEdge.id);
      edges = edges.filter((edge) => edge.id !== existingEdge.id);
      // 기존 연결 제거 시 노드 데이터도 업데이트
      updateNodeConnections(existingEdge.source, existingEdge.target, sourceHandle, true);
    }

    // 새 연결 추가 - crypto.randomUUID() 사용
    const newEdge = {
      ...connection,
      id: crypto.randomUUID(),
      type: 'cicd',
      sourceHandle: sourceHandle,
      data: {
        sourceHandle: sourceHandle,
        targetHandle: connection.targetHandle
      }
    };

    console.log('🔗 Creating new edge:', newEdge);

    edges = [...edges, newEdge];

    // 새 연결 추가 시 노드 데이터 업데이트
    updateNodeConnections(connection.source, connection.target, sourceHandle, false);

    console.log('✅ Connection added:', newEdge);
  }

  // 노드 드래그 종료 핸들러 - onnodedragstop 이벤트 사용
  function onNodeDragStop(event: any) {
    console.log('🎯 Raw drag stop event:', event);
    console.log('🎯 Event detail:', event.detail);
    console.log('🎯 Event targetNode:', event.targetNode);
    console.log('🎯 Event nodes:', event.nodes);

    // SvelteFlow의 onnodedragstop 이벤트에서 노드 정보 추출
    const draggedNode = event.targetNode || event.detail?.node || (event.nodes && event.nodes[0]);

    if (!draggedNode || !draggedNode.id) {
      console.log('🚫 No dragged node found in event');
      return;
    }

    console.log('🎯 Node dragged:', draggedNode.id, draggedNode.position);

    // 드래그된 노드의 위치를 업데이트
    const nodeIndex = nodes.findIndex((node) => node.id === draggedNode.id);
    if (nodeIndex !== -1) {
      console.log(`📍 Updating position for ${draggedNode.id}:`, draggedNode.position);

      // 새 배열 생성하여 반응성 트리거
      const updatedNodes = [...nodes];
      updatedNodes[nodeIndex] = {
        ...updatedNodes[nodeIndex],
        position: { ...draggedNode.position }
      };

      nodes = updatedNodes;
      console.log('💾 Node position updated - localStorage will be saved via $effect');
    }
  }

  // 엣지 변경 핸들러
  function onEdgesChange(changes: any[]) {
    console.log('🔗 Edges changed:', changes);

    let hasChanges = false;

    changes.forEach((change) => {
      if (change.type === 'remove') {
        // 삭제될 엣지 정보 가져오기
        const edgeToRemove = edges.find((edge) => edge.id === change.id);
        if (edgeToRemove) {
          // 노드 연결 정보 업데이트
          const sourceHandle = edgeToRemove.sourceHandle || 'default';
          updateNodeConnections(edgeToRemove.source, edgeToRemove.target, sourceHandle, true);
        }

        // 엣지 삭제
        edges = edges.filter((edge) => edge.id !== change.id);
        hasChanges = true;
        console.log(`🗑️ Edge removed: ${change.id}`);
      }
    });

    // 변경사항이 있을 때만 반응성 트리거
    if (hasChanges) {
      edges = [...edges];
      console.log('💾 Edge changes detected - $effect will handle saving');
    }
  }

  // 노드 추가 핸들러
  function handleAddNode(blockType: CICDBlockType, position: { x: number; y: number }) {
    console.log('🆕 Adding new node:', blockType, 'at position:', position);

    // 기존 노드 선택 해제 및 드래그 상태 정리
    const clearedNodes = nodes.map((node) => ({
      ...node,
      selected: false,
      dragging: false
    }));

    const newNode = createNodeInstance(blockType.toString(), position);
    console.log('✅ New node created:', newNode);

    nodes = [...clearedNodes, newNode];

    // 약간의 지연 후 다시 한 번 선택 해제 (SvelteFlow 내부 상태 정리)
    setTimeout(() => {
      nodes = nodes.map((node) => ({
        ...node,
        selected: false,
        dragging: false
      }));
    }, 50);
  }

  // 노드 삭제 핸들러
  function handleDeleteNode(nodeId: string) {
    // 노드가 Pipeline Start인 경우 삭제 방지
    const nodeToDelete = nodes.find((n) => n.id === nodeId);
    if (nodeToDelete?.type === CICDBlockType.PIPELINE_START) {
      console.log('🚫 Cannot delete Pipeline Start node');
      return;
    }

    // 연결된 모든 엣지도 함께 삭제
    edges = edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
    nodes = nodes.filter((node) => node.id !== nodeId);
    console.log('🗑️ Node deleted:', nodeId);
  }

  // 엣지 삭제 핸들러
  function handleDeleteEdge(edgeId: string) {
    edges = edges.filter((edge) => edge.id !== edgeId);
    console.log('🗑️ Edge deleted:', edgeId);
  }

  // 노드 데이터 업데이트 핸들러
  function updateNodeData(nodeId: string, newData: any) {
    console.log('🔄 Updating node data:', nodeId, newData);

    const nodeIndex = nodes.findIndex((node) => node.id === nodeId);
    if (nodeIndex !== -1) {
      // 데이터가 실제로 변경되었는지 확인
      const currentData = nodes[nodeIndex].data;
      const hasChanges =
        JSON.stringify(currentData) !== JSON.stringify({ ...currentData, ...newData });

      if (hasChanges) {
        const updatedNodes = [...nodes];
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          data: { ...updatedNodes[nodeIndex].data, ...newData }
        };

        nodes = updatedNodes;
        console.log('✅ Node data updated - localStorage will be saved via $effect');
      } else {
        console.log('🚫 No actual changes in node data, skipping update');
      }
    }
  }

  // Context 설정 - 노드 삭제 핸들러
  setContext('deleteNodeHandler', handleDeleteNode);
  setContext('deleteEdgeHandler', handleDeleteEdge);
  setContext('updateNodeData', updateNodeData);

  // 드래그 앤 드롭 핸들러들
  function onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  function _onDrop(event: DragEvent) {
    event.preventDefault();

    const blockType =
      event.dataTransfer?.getData('application/reactflow') ||
      event.dataTransfer?.getData('text/plain');

    if (!blockType) return;

    // 드롭된 위치를 플로우 좌표로 변환 (간단한 방법)
    const flowElement = event.currentTarget as HTMLElement;
    const rect = flowElement.getBoundingClientRect();

    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    console.log('🎯 Dropping block at position:', position);
    handleAddNode(blockType as CICDBlockType, position);
  }

  // Flow 인스턴스 초기화 핸들러
  function handleFlowInit() {
    console.log('✅ Flow instance initialized');
  }
</script>

<svelte:head>
  <title>{pipeline?.pipelineName || '파이프라인'} - Otto</title>
</svelte:head>

{#if loading}
  <div class="flex h-screen items-center justify-center">
    <div class="h-12 w-12 animate-spin rounded-full border-b-2 border-purple-600"></div>
  </div>
{:else if error}
  <div class="flex h-screen flex-col items-center justify-center">
    <h2 class="mb-4 text-xl font-semibold text-red-600">오류가 발생했습니다</h2>
    <p class="mb-6 text-gray-600">{error}</p>
    <button
      onclick={handleBack}
      class="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
    >
      돌아가기
    </button>
  </div>
{:else}
  <div class="relative flex h-screen w-full bg-gray-50">
    <!-- 사이드바 -->
    <FlowSidebar onAddNode={handleAddNode} />

    <!-- 메인 영역 -->
    <div class="relative flex-1">
      <!-- 상단 헤더 -->
      <div class="absolute top-0 right-0 left-0 z-20 border-b border-gray-200 bg-white px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              onclick={handleBack}
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <ArrowLeft class="h-4 w-4" />
              <span>파이프라인</span>
            </button>

            <div>
              <h1 class="text-xl font-semibold text-gray-900">
                {pipeline?.pipelineName || '파이프라인'}
              </h1>
              <p class="text-sm text-gray-600">
                파이프라인 플로우를 시각적으로 구성하고 관리하세요
              </p>
            </div>
          </div>

          <!-- 액션 버튼들 -->
          <div class="flex gap-3">
            <button
              onclick={resetPipeline}
              class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
              title="파이프라인 초기화"
            >
              <RotateCcw class="h-4 w-4" />
              <span>초기화</span>
            </button>

            <button
              onclick={handleSave}
              disabled={isSaving}
              class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="파이프라인 저장"
            >
              <Save class="h-4 w-4" />
              <span>{isSaving ? '저장 중...' : '저장'}</span>
            </button>

            <button
              onclick={handleRun}
              disabled={isRunning}
              class="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="파이프라인 실행"
            >
              {#if isRunning}
                <Loader2 class="h-4 w-4 animate-spin" />
                <span>실행 중...</span>
              {:else}
                <Play class="h-4 w-4" />
                <span>실행</span>
              {/if}
            </button>
          </div>
        </div>
      </div>

      <!-- Flow Canvas -->
      <div class="absolute inset-0 top-[73px]">
        <SvelteFlowProvider>
          <FlowCanvas
            {nodes}
            {edges}
            {nodeTypes}
            {edgeTypes}
            {onConnect}
            {onNodeDragStop}
            {onEdgesChange}
            {handleFlowInit}
            {onDragOver}
            {handleAddNode}
          />
        </SvelteFlowProvider>
      </div>
    </div>
  </div>
{/if}

<!-- 초기화 확인 모달 -->
{#if showResetConfirm}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-gray-900">파이프라인 초기화</h3>
        <p class="mt-2 text-sm text-gray-600">
          정말로 파이프라인을 초기화하시겠습니까?<br />
          시작 노드를 제외한 모든 블록과 연결이 삭제됩니다.
        </p>
      </div>
      <div class="flex justify-end gap-3">
        <button
          onclick={cancelReset}
          class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
        >
          취소
        </button>
        <button
          onclick={confirmReset}
          class="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
        >
          초기화
        </button>
      </div>
    </div>
  </div>
{/if}
