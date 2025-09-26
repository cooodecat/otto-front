<script lang="ts">
  import { onMount, onDestroy, setContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import api from '$lib/sdk';
  import { makeFetch } from '$lib/utils/make-fetch';
  import {
    RotateCcw,
    Play,
    LoaderCircle,
    Save,
    ArrowLeft,
    FileText,
    ExternalLink,
    QrCode
  } from 'lucide-svelte';
  // @ts-expect-error - svelte-qrcode doesn't have TypeScript declarations
  import QRCode from 'svelte-qrcode';
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
  let deploymentStatus = $state<{
    status: string;
    deployUrl: string | null;
    updatedAt: Date;
  } | null>(null);
  let deploymentPollingInterval: NodeJS.Timeout | null = null;
  let toast = $state<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(
    null
  );

  // 실행 상태 패널 표시 여부 (기본값 false, localStorage에 데이터가 있으면 true로 변경)
  let showExecutionPanel = $state(false);

  // QR 코드 모달 표시 여부
  let showQRModal = $state(false);

  // Polling intervals
  let statusPollingInterval: NodeJS.Timeout | null = null;
  let healthCheckInterval: NodeJS.Timeout | null = null;

  // Deploy health status
  let deployHealthStatus = $state<{
    isHealthy: boolean;
    isChecking: boolean;
    lastChecked: Date | null;
    error?: string;
  } | null>(null);

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

    // 파이프라인 정보가 로드된 후에만 실행 상태 복원
    // pipelineId가 정확한지 확인
    if (pipelineId && pipeline) {
      console.log('🚀 파이프라인 로드 완료, 실행 상태 확인:', {
        pipelineId,
        pipelineName: pipeline.pipelineName
      });
      loadExecutionStatus();
    } else {
      console.warn('⚠️ 파이프라인 정보가 아직 로드되지 않았습니다.');
    }

    // 배포 상태 polling 시작
    if (pipelineId) {
      startDeploymentStatusPolling();
    }
  });

  onDestroy(() => {
    // 클린업: polling 중지
    if (deploymentPollingInterval) {
      clearInterval(deploymentPollingInterval);
    }
  });

  // 배포 상태 polling 함수
  async function startDeploymentStatusPolling() {
    // 초기 상태 조회
    await fetchDeploymentStatus();

    // 5초마다 상태 업데이트
    deploymentPollingInterval = setInterval(async () => {
      await fetchDeploymentStatus();
    }, 5000);
  }

  // 배포 상태 조회
  async function fetchDeploymentStatus() {
    if (!pipelineId) return;

    try {
      const response = await api.functional.pipelines.getDeploymentStatus(
        makeFetch({ fetch }),
        pipelineId
      );

      deploymentStatus = response;

      // 배포 완료 시 polling 중지
      if (
        response.status === 'SUCCESS' ||
        response.status === 'COMPLETED' ||
        response.status === 'FAILED'
      ) {
        if (deploymentPollingInterval) {
          clearInterval(deploymentPollingInterval);
          deploymentPollingInterval = null;
        }
      }
    } catch (err) {
      console.error('Failed to fetch deployment status:', err);
    }
  }

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

      // Deploy 노드에서 deployOption 추출
      const deployNode = nodes.find(
        (node) => node.type === 'deploy' || node.data.blockType === 'deploy'
      );
      const deployOption =
        deployNode?.data?.deployOption &&
        typeof deployNode.data.deployOption === 'object' &&
        'port' in deployNode.data.deployOption &&
        'command' in deployNode.data.deployOption
          ? (deployNode.data.deployOption as { port: number; command: string })
          : undefined;

      await api.functional.pipelines.updatePipeline(makeFetch({ fetch }), pipelineId, {
        pipelineName: pipeline.pipelineName,
        data: flowData,
        deployOption: deployOption
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
        .filter((node) => node.type !== CICDBlockType.PIPELINE_START && node.type)
        .map((node) => ({
          blockType: node.type as string,
          groupType: (node.data?.groupType || node.type) as string,
          blockId: node.id,
          onSuccess: edges.find((e) => e.source === node.id)?.target || null,
          onFailed: null,
          ...node.data
        }));

      // Deploy 노드에서 deployOption 추출
      const deployNode = nodes.find(
        (node) => node.type === 'deploy' || node.data.blockType === 'deploy'
      );
      const deployOption =
        deployNode?.data?.deployOption &&
        typeof deployNode.data.deployOption === 'object' &&
        'port' in deployNode.data.deployOption &&
        'command' in deployNode.data.deployOption
          ? (deployNode.data.deployOption as { port: number; command: string })
          : undefined;

      // 파이프라인 업데이트 (Flow 노드 포함)
      if (!pipelineId) {
        throw new Error('Pipeline ID is required');
      }
      await api.functional.pipelines.updatePipeline(makeFetch({ fetch }), pipelineId, {
        data: { nodes, edges, flowNodes },
        deployOption: deployOption
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
    showExecutionPanel = true; // 실행 시작 시 패널 자동으로 열기

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

  // 실행 상태 자동 저장 (buildInfo, buildStatus, showExecutionPanel 변경 감지)
  $effect(() => {
    if (buildInfo || buildStatus) {
      saveExecutionStatus();
    }
  });

  // 컴포넌트 정리 시 폴링 중지
  $effect(() => {
    return () => {
      if (deploymentPollingInterval) {
        clearInterval(deploymentPollingInterval);
      }
    };
  });

  function showToast(type: 'success' | 'error' | 'warning' | 'info', message: string) {
    toast = { type, message };
  }

  // 실행 상태를 localStorage에 저장
  function saveExecutionStatus() {
    if (!projectId || !pipelineId) return;

    const storageKey = `execution-${projectId}-${pipelineId}`;
    const executionData = {
      buildInfo,
      buildStatus,
      deployHealthStatus,
      deploymentStatus,
      showPanel: showExecutionPanel, // 패널 표시 상태도 저장
      timestamp: new Date().toISOString()
    };

    localStorage.setItem(storageKey, JSON.stringify(executionData));
    console.log('💾 실행 상태 저장됨:', storageKey);
  }

  // 오래된 실행 데이터 정리 (24시간 이상 경과한 데이터)
  function cleanupOldExecutionData() {
    const allKeys = Object.keys(localStorage).filter((key) => key.startsWith('execution-'));
    const now = new Date().getTime();

    allKeys.forEach((key) => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          const timestamp = new Date(parsed.timestamp).getTime();
          const hoursDiff = (now - timestamp) / (1000 * 60 * 60);

          // 24시간 이상 지난 데이터 삭제
          if (hoursDiff > 24) {
            localStorage.removeItem(key);
            console.log('🗑️ 오래된 실행 데이터 삭제:', key);
          }
        }
      } catch (e) {
        // 파싱 실패한 데이터도 삭제
        localStorage.removeItem(key);
        console.error('🗑️ 잘못된 실행 데이터 삭제:', key, e);
      }
    });
  }

  // localStorage에서 실행 상태 불러오기
  function loadExecutionStatus() {
    if (!projectId || !pipelineId) return;

    console.log('🔍 현재 파이프라인 정보:', {
      projectId,
      pipelineId,
      pipelineName: pipeline?.pipelineName
    });

    // 먼저 오래된 데이터 정리
    cleanupOldExecutionData();

    const storageKey = `execution-${projectId}-${pipelineId}`;
    const savedData = localStorage.getItem(storageKey);

    console.log('🔍 실행 상태 확인 중...', storageKey);
    console.log('📦 저장된 데이터 존재 여부:', !!savedData);

    // 디버깅: 모든 execution 키 확인
    const allExecutionKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith('execution-')
    );
    console.log('📋 모든 실행 키:', allExecutionKeys);

    // 현재 프로젝트의 다른 키들 확인
    const projectKeys = allExecutionKeys.filter((key) => key.includes(projectId));
    console.log('📁 같은 프로젝트의 키들:', projectKeys);

    // 만약 잘못된 키가 있다면 경고
    if (!savedData && projectKeys.length > 0) {
      console.warn(
        '⚠️ 경고: 현재 파이프라인의 데이터가 없지만, 같은 프로젝트의 다른 파이프라인 데이터가 존재합니다.'
      );
      console.warn('⚠️ 데이터 격리가 제대로 되어있는지 확인이 필요합니다.');
      // 다른 파이프라인의 데이터를 가져오지 않음 - 격리 보장
      return;
    }

    if (savedData) {
      try {
        const executionData = JSON.parse(savedData);
        console.log('📥 저장된 실행 상태 발견!', executionData);

        // 24시간 이내의 데이터만 복원
        const savedTime = new Date(executionData.timestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);

        if (hoursDiff < 24) {
          buildInfo = executionData.buildInfo;
          buildStatus = executionData.buildStatus;
          deployHealthStatus = executionData.deployHealthStatus;
          deploymentStatus = executionData.deploymentStatus; // 배포 상태도 복원

          // 실행 중인 상태일 때만 패널 자동 표시
          // 완료된 상태는 사용자가 직접 열어보도록 함
          const isRunning =
            buildStatus &&
            !['SUCCEEDED', 'FAILED', 'STOPPED'].includes(buildStatus.buildStatus || '');

          if (isRunning) {
            // 실행 중인 경우에만 패널 자동 표시
            showExecutionPanel = true;
            console.log('🔄 실행 중인 빌드 발견 - 패널 자동 표시');
          } else if (buildInfo || buildStatus || deploymentStatus) {
            // 완료된 실행이 있는 경우 - 저장된 패널 상태 유지 (기본값: false)
            showExecutionPanel = executionData.showPanel === true; // 명시적으로 true일 때만
            console.log(
              '📊 완료된 실행 데이터 발견 - 패널 상태:',
              showExecutionPanel,
              '(저장된 값:',
              executionData.showPanel,
              ')'
            );
          }

          if (deploymentStatus) {
            console.log('🚀 배포 상태 복원:', deploymentStatus);
          }

          // 실행 중인 상태면 폴링 재개
          if (
            buildStatus &&
            !['SUCCEEDED', 'FAILED', 'STOPPED'].includes(buildStatus.buildStatus || '')
          ) {
            console.log('🔄 실행 중인 빌드 발견, 상태 폴링 재개');
            isExecuting = true;
            if (buildInfo?.buildId) {
              startStatusPolling(buildInfo.buildId);
            }
          }

          // 헬스체크가 진행 중이었다면 재개
          if (deployHealthStatus && !deployHealthStatus.isHealthy && pipeline?.deployUrl) {
            console.log('🔄 헬스체크 재개');
            startHealthCheckPolling();
          }

          // 배포 URL이 있으면 파이프라인 정보도 새로고침하여 최신 상태 확인
          if (deploymentStatus?.deployUrl || buildInfo?.ecrImageUri) {
            console.log('🔄 파이프라인 정보 새로고침 (배포 URL 확인)');
            refreshPipelineInfo();
          }
        } else {
          // 24시간이 지난 데이터는 삭제
          localStorage.removeItem(storageKey);
          console.log('🗑️ 오래된 실행 상태 데이터 삭제');
        }
      } catch (error) {
        console.error('❌ 실행 상태 복원 실패:', error);
        localStorage.removeItem(storageKey);
      }
    } else {
      console.log('💤 저장된 실행 상태 없음');
    }
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

  // 백엔드 API를 통한 배포 상태 확인 (DB에서 deployments 테이블 조회)
  async function checkDeploymentHealth() {
    if (!pipelineId || deployHealthStatus?.isChecking) return;

    deployHealthStatus = {
      isHealthy: deployHealthStatus?.isHealthy || false,
      isChecking: true,
      lastChecked: new Date(),
      error: deployHealthStatus?.error
    };

    try {
      console.log(`배포 상태 확인 중: pipelineId=${pipelineId}`);

      // DB에서 deployment 상태 확인 (헬스체크 대신)
      const result = await api.functional.pipelines.getDeploymentStatus(
        makeFetch({ fetch }),
        pipelineId
      );

      // status가 SUCCESS이고 deployUrl이 있으면 건강한 것으로 처리
      const isHealthy = result.status === 'SUCCESS' && !!result.deployUrl;

      deployHealthStatus = {
        isHealthy: isHealthy,
        lastChecked: new Date(),
        isChecking: false,
        error: undefined
      };

      // 배포 URL 업데이트
      if (result.deployUrl && !deploymentStatus?.deployUrl) {
        deploymentStatus = {
          ...deploymentStatus,
          deployUrl: result.deployUrl,
          status: result.status,
          updatedAt: result.updatedAt
        };
      }

      console.log(`배포 상태: ${result.status} - ${isHealthy ? '성공' : result.status}`);

      // 배포 완료 시 체크 중지
      if (isHealthy && healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
        showToast('success', '배포가 성공적으로 완료되었습니다! 사이트에 접속할 수 있습니다.');
      }
    } catch (error) {
      console.log(`배포 상태 확인 실패: ${error}`);

      deployHealthStatus = {
        isHealthy: false,
        lastChecked: new Date(),
        isChecking: false,
        error: error instanceof Error ? error.message : '배포 상태 확인 실패'
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
      <div class="absolute left-0 right-0 top-0 z-20 border-b border-gray-200 bg-white px-6 py-4">
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
      {#if buildInfo || buildStatus || deploymentStatus}
        {#if showExecutionPanel}
          <div
            class="absolute right-4 top-20 z-10 w-96 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
          >
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-700">실행 정보</h3>
              <div class="flex items-center gap-2">
                <!-- 안쓸거입니다 지우기 버튼은. -->
                <!-- <button
                  onclick={clearExecutionStatus}
                  class="rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  title="실행 정보 지우기"
                >
                  지우기
                </button> -->
                <button
                  onclick={() => (showExecutionPanel = false)}
                  class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  title="패널 닫기"
                  aria-label="패널 닫기"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                </button>
              </div>
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

            <!-- 배포 상태 섹션을 buildInfo 밖으로 이동 -->
            {#if deploymentStatus || pipeline?.deployUrl}
              <div class="mt-3 space-y-3">
                <div class="rounded-lg bg-gray-50 p-3">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-gray-700">배포 상태</span>
                    <div class="flex items-center gap-2">
                      {#if deploymentStatus?.status === 'PENDING'}
                        <div class="h-2 w-2 animate-pulse rounded-full bg-yellow-500"></div>
                        <span class="text-xs text-yellow-600">준비 중</span>
                      {:else if deploymentStatus?.status === 'DEPLOYING_ECS'}
                        <div class="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
                        <span class="text-xs text-blue-600">배포 중</span>
                      {:else if deploymentStatus?.status === 'WAITING_HEALTH_CHECK'}
                        <div class="h-2 w-2 animate-pulse rounded-full bg-orange-500"></div>
                        <span class="text-xs text-orange-600">헬스체크 중</span>
                      {:else if deploymentStatus?.status === 'SUCCESS' || deploymentStatus?.status === 'COMPLETED'}
                        <div class="h-2 w-2 rounded-full bg-green-500"></div>
                        <span class="text-xs text-green-600">배포 완료</span>
                      {:else if deploymentStatus?.status === 'FAILED'}
                        <div class="h-2 w-2 rounded-full bg-red-500"></div>
                        <span class="text-xs text-red-600">배포 실패</span>
                      {:else if pipeline?.deployUrl}
                        <div class="h-2 w-2 rounded-full bg-green-500"></div>
                        <span class="text-xs text-green-600">배포됨</span>
                      {:else}
                        <div class="h-2 w-2 rounded-full bg-gray-400"></div>
                        <span class="text-xs text-gray-600"
                          >{deploymentStatus?.status || '알 수 없음'}</span
                        >
                      {/if}
                    </div>
                  </div>

                  {#if deploymentStatus?.deployUrl || pipeline?.deployUrl}
                    <div class="mt-2 flex items-center gap-2">
                      <a
                        href="http://{deploymentStatus?.deployUrl || pipeline?.deployUrl}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
                      >
                        <ExternalLink class="h-3 w-3" />
                        {deploymentStatus?.deployUrl || pipeline?.deployUrl}
                      </a>
                      {#if deploymentStatus?.status === 'SUCCESS' || deploymentStatus?.status === 'COMPLETED' || pipeline?.deployUrl}
                        <button
                          onclick={() => (showQRModal = true)}
                          class="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                          title="QR 코드 보기"
                        >
                          <QrCode class="h-3 w-3" />
                        </button>
                      {/if}
                    </div>
                  {/if}

                  {#if deploymentStatus?.updatedAt}
                    <div class="mt-1 text-xs text-gray-500">
                      업데이트: {new Date(deploymentStatus.updatedAt).toLocaleTimeString()}
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <!-- 실행 상태 패널 열기 버튼 (패널이 닫혀 있을 때) -->
          <button
            onclick={() => (showExecutionPanel = true)}
            class="absolute right-4 top-20 z-10 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-md transition-all hover:border-gray-300 hover:shadow-lg"
            title="실행 정보 보기"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span>실행 정보 보기</span>
            {#if buildStatus?.buildStatus === 'IN_PROGRESS' || buildStatus?.buildStatus === 'PENDING'}
              <div class="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
            {:else if buildStatus?.buildStatus === 'SUCCEEDED'}
              <div class="h-2 w-2 rounded-full bg-green-500"></div>
            {:else if buildStatus?.buildStatus === 'FAILED'}
              <div class="h-2 w-2 rounded-full bg-red-500"></div>
            {/if}
          </button>
        {/if}
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

<!-- QR Code Modal -->
{#if showQRModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    onclick={(e) => {
      if (e.target === e.currentTarget) showQRModal = false;
    }}
  >
    <div
      class="relative flex h-[85vh] w-[85vh] flex-col items-center justify-center rounded-2xl bg-white/90 p-8 shadow-2xl backdrop-blur"
    >
      <!-- Close button -->
      <button
        onclick={() => (showQRModal = false)}
        class="absolute right-4 top-4 rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
        title="닫기"
        aria-label="모달 닫기"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          ></path>
        </svg>
      </button>

      <!-- QR Code -->
      <div class="flex h-full w-full items-center justify-center">
        <QRCode
          value={'http://' + (deploymentStatus?.deployUrl || pipeline?.deployUrl)}
          size={Math.min(window.innerHeight * 0.85 * 0.7, window.innerWidth * 0.7)}
          background="#ffffff"
          color="#000000"
          errorCorrection="M"
        />
      </div>

      <!-- URL text -->
      <div class="mt-4 text-center">
        <p class="text-sm text-gray-600">모바일로 스캔하여 접속</p>
        <p class="mt-1 font-mono text-xs text-gray-500">
          {deploymentStatus?.deployUrl || pipeline?.deployUrl}
        </p>
      </div>
    </div>
  </div>
{/if}

<!-- ESC key handler for QR modal -->
<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && showQRModal) {
      showQRModal = false;
    }
  }}
/>
