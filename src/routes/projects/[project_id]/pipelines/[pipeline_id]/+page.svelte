<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import api from '$lib/sdk';
	import { makeFetch } from '$lib/utils/make-fetch';
	import { RotateCcw, Play, Loader2, Save, ArrowLeft } from 'lucide-svelte';
	import { SvelteFlow, Background, Controls, MiniMap, SvelteFlowProvider, useSvelteFlow } from '@xyflow/svelte';
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
	let flowInstance = $state<any>(null);
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
			console.log('🔄 Nodes changed, saving to localStorage...', nodes.length);
			saveToLocalStorage();
		}
	});

	// 로컬스토리지 자동 저장 (edges 변경 감지)
	$effect(() => {
		if (initialized && projectId && pipelineId && edges.length >= 0) {
			console.log('🔗 Edges changed, saving to localStorage...', edges.length);
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
			// 1. 먼저 로컬스토리지에서 시도
			const storageKey = `pipeline-${projectId}-${pipelineId}`;
			const savedData = localStorage.getItem(storageKey);

			if (savedData) {
				try {
					const { nodes: savedNodes, edges: savedEdges } = JSON.parse(savedData);
					console.log(`📁 Loading pipeline from localStorage (${storageKey}):`, {
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
				}
			}

			// 2. 로컬스토리지에 없으면 서버에서 로드
			console.log(`🌐 Loading pipeline from server: ${pipelineId}`);
			const data = await api.functional.pipelines.getPipelineById(makeFetch({ fetch }), pipelineId);

			pipeline = data;

			// 저장된 플로우 데이터가 있다면 로드
			if (data.data && data.data.nodes && data.data.edges) {
				console.log(`📁 Loading pipeline from server:`, {
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
			}
		} catch (err) {
			console.error('파이프라인 로드 실패:', err);
			error = '파이프라인을 불러오는데 실패했습니다';
		}

		loading = false;
	}

	function initializeFlow() {
		// 기본 시작 노드 생성
		if (nodes.length === 0) {
			console.log('🏁 Creating default Pipeline Start node...');
			const startNode = {
				...createNodeInstance(
					CICDBlockType.PIPELINE_START,
					{ x: 250, y: 50 }
				),
				// 시작 노드는 삭제 불가능하도록 설정
				selectable: false,
				deletable: false
			};

			nodes = [startNode];
			edges = [];
		}
	}

	// 로컬스토리지 저장 함수
	function saveToLocalStorage() {
		if (projectId && pipelineId && (nodes.length > 0 || edges.length > 0)) {
			const storageKey = `pipeline-${projectId}-${pipelineId}`;
			const pipelineData = { nodes, edges };
			localStorage.setItem(storageKey, JSON.stringify(pipelineData));
			console.log(`💾 Saved to localStorage (${storageKey}):`, {
				nodes: nodes.length,
				edges: edges.length
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
			console.log(`⚠️ Found ${pipelineStartNodes.length} Pipeline Start nodes, keeping only the first one`);
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
	function onNodeClick(event: CustomEvent) {
		console.log('Node clicked:', event.detail);
	}

	function onEdgeClick(event: CustomEvent) {
		console.log('Edge clicked:', event.detail);
	}

	function onConnect(connection: any) {
		console.log('🔗 Connection attempt:', connection);

		// 1:1 연결 제한 - 이미 같은 source handle에서 나가는 연결이 있는지 확인
		const sourceHandle = connection.sourceHandle || 'default';
		console.log('📍 Source handle:', sourceHandle);
		
		const existingEdge = edges.find(
			(edge) =>
				edge.source === connection.source && (edge.sourceHandle || 'default') === sourceHandle
		);

		if (existingEdge) {
			console.log('🚫 Connection rejected: Source handle already has a connection');
			return;
		}

		// 새 연결 추가
		const newEdge = {
			...connection,
			id: `${connection.source}-${connection.target}-${sourceHandle}`,
			type: 'cicd',
			sourceHandle: sourceHandle
		};

		console.log('🔗 Creating new edge:', newEdge);

		edges = [...edges, newEdge];
		console.log('✅ Connection added:', newEdge);
	}

	// 노드 이동 완료 핸들러
	function onNodeMoveEnd(event: CustomEvent, node: any) {
		console.log('🎯 Node move ended:', node);
		
		// 이동된 노드의 위치 업데이트
		const nodeIndex = nodes.findIndex(n => n.id === node.id);
		if (nodeIndex !== -1) {
			console.log(`📍 Updating position for ${node.id}:`, node.position);
			
			// 새로운 노드 객체 생성 (깊은 복사)
			nodes[nodeIndex] = {
				...nodes[nodeIndex],
				position: node.position
			};
			
			// 반응성 트리거
			nodes = [...nodes];
			console.log('💾 Node position updated - localStorage will save automatically');
		}
	}

	// 엣지 변경 핸들러
	function onEdgesChange(changes: any[]) {
		console.log('🔗 Edges changed:', changes);
		
		let hasChanges = false;
		
		changes.forEach(change => {
			if (change.type === 'remove') {
				// 엣지 삭제
				edges = edges.filter(edge => edge.id !== change.id);
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
		const clearedNodes = nodes.map(node => ({
			...node,
			selected: false,
			dragging: false
		}));
		
		const newNode = createNodeInstance(blockType.toString(), position);
		console.log('✅ New node created:', newNode);
		
		// 새 노드도 선택되지 않은 상태로 설정
		newNode.selected = false;
		
		nodes = [...clearedNodes, newNode];
		
		// 약간의 지연 후 다시 한 번 선택 해제 (SvelteFlow 내부 상태 정리)
		setTimeout(() => {
			nodes = nodes.map(node => ({
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

	// Context 설정 - 노드 삭제 핸들러
	setContext('deleteNodeHandler', handleDeleteNode);
	setContext('deleteEdgeHandler', handleDeleteEdge);

	// 드래그 앤 드롭 핸들러들
	function onDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'copy';
		}
	}

	function onDrop(event: DragEvent) {
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
						{onNodeMoveEnd}
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
					정말로 파이프라인을 초기화하시겠습니까?<br>
					시작 노드를 제외한 모든 블록과 연결이 삭제됩니다.
				</p>
			</div>
			<div class="flex gap-3 justify-end">
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
