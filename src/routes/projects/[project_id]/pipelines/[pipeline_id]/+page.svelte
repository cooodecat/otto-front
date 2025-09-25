<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import api from '$lib/sdk';
  import { makeFetch } from '$lib/utils/make-fetch';
  import { RotateCcw, Play, LoaderCircle, Save, ArrowLeft, FileText } from 'lucide-svelte';
  import {
    SvelteFlowProvider,
    type NodeTargetEventWithPointer,
    type Connection,
    type Node,
    type Edge
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { nodeTypes, createNodeInstance } from '$lib/components/flow/nodeTypes';
  import { edgeTypes } from '$lib/components/flow/edgeTypes';
  import FlowSidebar from '$lib/components/flow/FlowSidebar.svelte';
  import FlowCanvas from '$lib/components/flow/FlowCanvas.svelte';
  import { CICDBlockType } from '$lib/types/flow-node.types';
  import BuildStatus from '$lib/components/BuildStatus.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import type { PipelineResponseDto } from '$lib/sdk/structures/PipelineResponseDto';

  const projectId = $page.params.project_id;
  const pipelineId = $page.params.pipeline_id;

  let pipeline = $state<PipelineResponseDto | null>(null);
  let loading = $state(true);
  let error = $state('');
  let isSaving = $state(false);
  let isRunning = $state(false);
  let isExecuting = $state(false);
  let buildInfo = $state<{
    buildId?: string;
    buildNumber?: string;
    imageTag?: string;
    ecrImageUri?: string;
  } | null>(null);
  let buildStatus = $state<{
    buildStatus?: string;
    currentPhase?: string;
    startTime?: string;
    endTime?: string;
    logs?: { groupName?: string; streamName?: string };
  } | null>(null);

  // 임시: 배포 URL 헬스체크 상태 추가
  let deployHealthStatus = $state<{
    isHealthy?: boolean;
    lastChecked?: Date;
    responseStatus?: number;
    isChecking?: boolean;
  } | null>(null);
  let healthCheckInterval: NodeJS.Timeout | null = null;
  let statusPollingInterval: NodeJS.Timeout | null = null;
  let toast = $state<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(
    null
  );

  // Flow 관련 상태
  let nodes = $state<Node[]>([]);
  let edges = $state<Edge[]>([]);
  let initialized = $state(false);
  let _flowInstance = $state<unknown>(null);
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
          savedNodePositions: parsed.nodes?.map(
            (n: { id: string; position: { x: number; y: number } }) => ({
              id: n.id,
              position: n.position
            })
          )
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

      // 성공 메시지
      console.log('파이프라인이 저장되었습니다!');
      showToast('success', '파이프라인이 저장되었습니다!');
    } catch (err) {
      console.error('저장 실패:', err);
      error = '저장에 실패했습니다';
      showToast('error', '파이프라인 저장에 실패했습니다');
    }

    isSaving = false;
  }

  async function handleRun() {
    // 먼저 저장
    await handleSave();

    isRunning = true;
    try {
      // Flow 노드 데이터를 백엔드 형식으로 변환
      const flowNodes = nodes
        .filter((node) => node.type !== CICDBlockType.PIPELINE_START)
        .map((node) => ({
          blockType: node.type,
          groupType: node.data.groupType || node.type,
          blockId: node.id,
          onSuccess: edges.find((e) => e.source === node.id)?.target || null,
          onFailed: null,
          ...node.data
        }));

      // 파이프라인 업데이트 (Flow 노드 포함)
      if (!pipelineId) {
        throw new Error('Pipeline ID is required');
      }
      await api.functional.pipelines.updatePipeline(makeFetch({ fetch }), pipelineId, {
        data: { nodes, edges, flowNodes }
      });

      console.log('파이프라인 실행 준비 완료');
      isRunning = false;
      // 파이프라인 실행으로 전환
      await executePipeline();
    } catch (err) {
      console.error('실행 실패:', err);
      error = '실행에 실패했습니다';
      isRunning = false;
    }
  }

  async function executePipeline() {
    if (!pipelineId) return;

    isExecuting = true;
    buildInfo = null;
    buildStatus = null;
    error = '';

    try {
      // 파이프라인 실행 API 호출
      const result = await api.functional.pipelines.execute.executePipeline(
        makeFetch({ fetch }),
        pipelineId
      );

      buildInfo = result;
      console.log('파이프라인 실행 시작:', result);
      showToast('info', '파이프라인 실행이 시작되었습니다. 상태를 확인하고 있습니다...');

      // 실행 상태 폴링 시작
      startStatusPolling(result.buildId);
    } catch (err) {
      console.error('파이프라인 실행 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '파이프라인 실행에 실패했습니다';
      error = errorMessage;
      showToast('error', error);
      isExecuting = false;
    }
  }

  async function startStatusPolling(buildId: string) {
    if (!pipelineId || !buildId) return;

    // 기존 폴링 중지
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
    }

    // 즉시 상태 확인
    await checkBuildStatus(buildId);

    // 5초마다 상태 확인
    statusPollingInterval = setInterval(async () => {
      const status = await checkBuildStatus(buildId);

      // 실행이 완료되면 폴링 중지
      if (status && ['SUCCEEDED', 'FAILED', 'STOPPED'].includes(status.buildStatus || '')) {
        if (statusPollingInterval) {
          clearInterval(statusPollingInterval);
          statusPollingInterval = null;
        }
        isExecuting = false;

        // 실행 완료 알림 및 임시: 배포 URL 헬스체크 시작
        if (status.buildStatus === 'SUCCEEDED') {
          showToast('success', '빌드가 성공적으로 완료되었습니다! 배포 상태를 확인 중입니다...');

          // 임시: 빌드 완료 시 파이프라인 정보 새로고침하여 최신 deployUrl 가져오기
          await refreshPipelineInfo();

          if (pipeline?.deployUrl) {
            console.log(`배포 URL 발견: ${pipeline.deployUrl}`);
            startHealthCheckPolling();
          } else {
            console.log('배포 URL이 아직 설정되지 않았습니다. 잠시 후 다시 확인합니다.');
            // 3초 후 다시 파이프라인 정보 확인
            setTimeout(async () => {
              await refreshPipelineInfo();
              if (pipeline?.deployUrl) {
                console.log(`지연 로드 후 배포 URL 발견: ${pipeline.deployUrl}`);
                startHealthCheckPolling();
              }
            }, 3000);
          }
        } else if (status.buildStatus === 'FAILED') {
          showToast('error', '파이프라인 실행이 실패했습니다. 로그를 확인해주세요.');
        } else if (status.buildStatus === 'STOPPED') {
          showToast('warning', '파이프라인 실행이 중단되었습니다.');
        }
      }
    }, 5000);
  }

  async function checkBuildStatus(buildId: string) {
    if (!pipelineId || !buildId) return null;

    try {
      const status = await api.functional.pipelines.builds.status.getBuildStatus(
        makeFetch({ fetch }),
        pipelineId,
        buildId
      );

      buildStatus = status;
      console.log('실행 상태:', status);
      return status;
    } catch (err) {
      console.error('상태 확인 실패:', err);
      return null;
    }
  }

  // 컴포넌트 정리 시 폴링 중지
  $effect(() => {
    return () => {
      if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
      }
      // 임시: 헬스체크 폴링도 중지
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    };
  });

  function showToast(type: 'success' | 'error' | 'warning' | 'info', message: string) {
    toast = { type, message };
  }

  // 임시: 파이프라인 정보 새로고침 (배포 URL 업데이트 확인용)
  async function refreshPipelineInfo() {
    if (!pipelineId) return;

    try {
      console.log('파이프라인 정보 새로고침 중...');

      const data = await api.functional.pipelines.getPipelineById(makeFetch({ fetch }), pipelineId);

      // 기존 pipeline 데이터와 비교해서 배포 URL 변경 사항 로그
      if (pipeline?.deployUrl !== data.deployUrl) {
        console.log(`배포 URL 업데이트: ${pipeline?.deployUrl} -> ${data.deployUrl}`);
      }

      pipeline = data;

      console.log('파이프라인 정보 새로고침 완료:', {
        deployUrl: data.deployUrl,
        ecrImageUri: data.ecrImageUri,
        imageTag: data.imageTag
      });
    } catch (error) {
      console.error('파이프라인 정보 새로고침 실패:', error);
    }
  }

  // 임시: 백엔드 API를 통한 배포 헬스체크
  async function checkDeploymentHealth() {
    if (!pipelineId || deployHealthStatus?.isChecking) return;

    deployHealthStatus = {
      ...deployHealthStatus,
      isChecking: true,
      lastChecked: new Date()
    };

    try {
      console.log(`백엔드 헬스체크 API 호출: pipelineId=${pipelineId}`);

      const result = await api.functional.pipelines.deployment.health.getDeploymentHealth(
        makeFetch({ fetch }),
        pipelineId
      );

      deployHealthStatus = {
        isHealthy: result.isHealthy,
        lastChecked: new Date(result.lastChecked),
        responseStatus: result.responseStatus,
        isChecking: false
      };

      console.log(
        `헬스체크 결과: ${result.responseStatus} - ${result.isHealthy ? '건강' : '비건강'} (${result.responseTime}ms)`
      );

      // 배포 완료 시 헬스체크 중지
      if (result.isHealthy && healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
        showToast('success', '배포가 성공적으로 완료되었습니다! 사이트에 접속할 수 있습니다.');
      }
    } catch (error) {
      console.log(`헬스체크 실패: ${error}`);

      deployHealthStatus = {
        isHealthy: false,
        lastChecked: new Date(),
        responseStatus: 0,
        isChecking: false
      };
    }
  }

  // 임시: 헬스체크 폴링 시작 (백엔드 API 사용)
  function startHealthCheckPolling() {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }

    console.log(`백엔드 헬스체크 폴링 시작: pipelineId=${pipelineId}`);

    // 즉시 첫 번째 체크
    checkDeploymentHealth();

    // 5초마다 체크
    healthCheckInterval = setInterval(() => {
      if (deployHealthStatus?.isHealthy) {
        // 이미 건강하면 중지
        if (healthCheckInterval) {
          clearInterval(healthCheckInterval);
          healthCheckInterval = null;
        }
        return;
      }
      checkDeploymentHealth();
    }, 5000);
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

  function onConnect(connection: Connection) {
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
  const onNodeDragStop: NodeTargetEventWithPointer<MouseEvent | TouchEvent> = (event) => {
    console.log('🎯 Raw drag stop event:', event);
    console.log('🎯 Event targetNode:', event.targetNode);
    console.log('🎯 Event nodes:', event.nodes);

    // SvelteFlow의 onnodedragstop 이벤트에서 노드 정보 추출
    const draggedNode = event.targetNode;

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
  };

  // 엣지 변경 핸들러 (현재 미사용 - SvelteFlow에서 직접 지원하지 않음)
  function _onEdgesChange(changes: Array<{ type: string; id?: string }>) {
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
  function updateNodeData(nodeId: string, newData: Record<string, unknown>) {
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
              onclick={() => goto(`/projects/${projectId}/logs`)}
              class="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
              title="로그 보기"
              aria-label="로그 보기"
            >
              <FileText class="h-4 w-4" />
              <span>로그 보기</span>
            </button>

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
              disabled={isRunning || isExecuting}
              class="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="파이프라인 실행"
            >
              {#if isRunning || isExecuting}
                <LoaderCircle class="h-4 w-4 animate-spin" />
                <span>실행 중...</span>
              {:else}
                <Play class="h-4 w-4" />
                <span>실행</span>
              {/if}
            </button>
          </div>
        </div>
      </div>

      <!-- Build Status Panel -->
      {#if buildInfo || buildStatus}
        <div
          class="absolute top-20 right-4 z-10 w-96 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
        >
          <div class="mb-3">
            <h3 class="text-sm font-semibold text-gray-700">실행 정보</h3>
          </div>

          {#if buildStatus}
            <button
              onclick={() => goto(`/projects/${projectId}/logs`)}
              class="w-full cursor-pointer text-left transition-opacity hover:opacity-80"
              title="로그 보기"
              aria-label="로그 보기"
            >
              <BuildStatus
                status={buildStatus.buildStatus}
                currentPhase={buildStatus.currentPhase}
                startTime={buildStatus.startTime?.toString()}
                endTime={buildStatus.endTime?.toString()}
              />
            </button>
          {/if}

          {#if buildInfo}
            <div class="mt-3 space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-gray-500">실행 ID:</span>
                <span class="font-mono text-gray-700"
                  >{buildInfo.buildId?.split(':')[1] || buildInfo.buildId}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">실행 번호:</span>
                <span class="font-mono text-gray-700">{buildInfo.buildNumber}</span>
              </div>
              {#if buildInfo.imageTag}
                <div class="flex justify-between">
                  <span class="text-gray-500">이미지 태그:</span>
                  <span class="ml-2 truncate font-mono text-gray-700" title={buildInfo.imageTag}>
                    {buildInfo.imageTag}
                  </span>
                </div>
              {/if}

              <!-- 임시: 배포 URL 및 헬스체크 상태 -->
              {#if pipeline?.deployUrl}
                <div class="mt-2 border-t pt-2">
                  <div class="flex items-center justify-between">
                    <span class="text-gray-500">배포 URL:</span>
                    <div class="flex items-center gap-2">
                      {#if deployHealthStatus?.isChecking}
                        <div
                          class="h-2 w-2 animate-pulse rounded-full bg-yellow-500"
                          title="헬스체크 중"
                        ></div>
                      {:else if deployHealthStatus?.isHealthy}
                        <div class="h-2 w-2 rounded-full bg-green-500" title="배포 완료"></div>
                      {:else if deployHealthStatus?.isHealthy === false}
                        <div class="h-2 w-2 rounded-full bg-red-500" title="배포 대기 중"></div>
                      {:else}
                        <div class="h-2 w-2 rounded-full bg-gray-400" title="상태 확인 중"></div>
                      {/if}
                    </div>
                  </div>
                  <div class="mt-1">
                    <a
                      href="http://{pipeline.deployUrl}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="font-mono text-xs break-all text-blue-600 hover:text-blue-800"
                      title="배포된 사이트 열기"
                    >
                      http://{pipeline.deployUrl}
                    </a>
                  </div>
                  {#if deployHealthStatus}
                    <div class="mt-1 text-xs text-gray-500">
                      {#if deployHealthStatus.isChecking}
                        사이트 상태 확인 중...
                      {:else if deployHealthStatus.isHealthy}
                        사이트 접속 가능 ({deployHealthStatus.responseStatus || 200})
                      {:else}
                        사이트 준비 중... (잠시 후 다시 시도해주세요)
                      {/if}
                      {#if deployHealthStatus.lastChecked}
                        <br />마지막 확인: {deployHealthStatus.lastChecked.toLocaleTimeString()}
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}
              {#if buildStatus?.logs?.groupName}
                <div class="mt-2 border-t pt-2">
                  <span class="text-gray-500">CloudWatch 로그:</span>
                  <div class="mt-1 font-mono text-xs break-all text-gray-600">
                    {buildStatus.logs.groupName}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}

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

<!-- Toast Notifications -->
{#if toast}
  <Toast type={toast.type} message={toast.message} onClose={() => (toast = null)} />
{/if}
