<script lang="ts">
import { onMount, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import api from '$lib/sdk';
  import { makeFetch } from '$lib/utils/make-fetch';
  import {
    Plus,
    Search,
    SlidersHorizontal,
    Calendar,
    Settings,
    Play,
    Trash2,
    FileText,
    ArrowLeft,
    House,
    ChevronRight,
    Check,
    X
  } from 'lucide-svelte';
  import { getPipelineById } from '$lib/sdk/functional/pipelines';
  import BuildStatus from '$lib/components/BuildStatus.svelte';

const projectId = $page.params.project_id!;

  let pipelines = $state<getPipelineById.Output[]>([]);
  let projectInfo = $state<{ name: string } | null>(null);
  let loading = $state(false);
  let searchTerm = $state('');
  let error = $state('');
let deleteModal = $state<{ show: boolean; pipelineId: string; pipelineName: string }>({
  show: false,
  pipelineId: '',
  pipelineName: ''
});
let isDeleting = $state(false);
let editingPipelineName = $state<{ id: string; value: string } | null>(null);
let pipelineNameInputRef = $state<HTMLInputElement | null>(null);
let savingPipelineId = $state<string | null>(null);

  // 검색 필터링
  const filteredPipelines = $derived(
    pipelines.filter((pipeline) =>
      pipeline.pipelineName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  onMount(async () => {
    await Promise.all([loadPipelines(), loadProjectInfo()]);
  });

  async function loadProjectInfo() {
    try {
      const project = await api.functional.projects.getProject(makeFetch({ fetch }), projectId!);
      if (project) {
        projectInfo = { name: project.projectName };
      }
    } catch (err) {
      console.error('Error loading project info:', err);
      // 프로젝트 정보 로드 실패 시 기본값 사용
      projectInfo = { name: '프로젝트' };
    }
  }

  async function loadPipelines() {
    loading = true;
    error = '';

    try {
      const data = await api.functional.pipelines.getPipelines(makeFetch({ fetch }), { projectId });

      if (Array.isArray(data)) {
        pipelines = [...data];
      } else {
        pipelines = [];
      }
    } catch (err) {
      error = '파이프라인을 불러오는데 실패했습니다';
      console.error('Error loading pipelines:', err);
      pipelines = [];
    }

    loading = false;
  }

  function handleCreatePipeline() {
    goto(`/projects/${projectId}/pipelines/new`);
  }

  function handlePipelineClick(pipelineId: string) {
    goto(`/projects/${projectId}/pipelines/${pipelineId}`);
  }

  function handleViewLogs(e: Event) {
    e.stopPropagation(); // Prevent card click
    goto(`/projects/${projectId}/logs`);
  }

  async function handleEditPipelineName(pipeline: getPipelineById.Output, e: Event) {
    e.stopPropagation();
    editingPipelineName = {
      id: pipeline.pipelineId,
      value: pipeline.pipelineName || ''
    };
    await tick();
    pipelineNameInputRef?.focus();
    pipelineNameInputRef?.select();
  }

  function cancelPipelineNameEdit() {
    editingPipelineName = null;
    pipelineNameInputRef = null;
  }

  async function savePipelineName(pipeline: getPipelineById.Output) {
    if (!editingPipelineName || editingPipelineName.id !== pipeline.pipelineId) return;
    const trimmed = editingPipelineName.value.trim();
    const current = pipeline.pipelineName || '';

    if (trimmed === current.trim()) {
      cancelPipelineNameEdit();
      return;
    }

    savingPipelineId = pipeline.pipelineId;
    try {
      const connection = makeFetch({ fetch });
      const updated = await api.functional.pipelines.updatePipeline(connection, pipeline.pipelineId, {
        pipelineName: trimmed
      });
      pipelines = pipelines.map((p) =>
        p.pipelineId === pipeline.pipelineId ? { ...p, ...updated } : p
      );
    } catch (error) {
      console.error('파이프라인 이름 업데이트 실패:', error);
    } finally {
      savingPipelineId = null;
      cancelPipelineNameEdit();
    }
  }

  function onPipelineNameKeydown(event: KeyboardEvent, pipeline: getPipelineById.Output) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void savePipelineName(pipeline);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelPipelineNameEdit();
    }
  }

  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '날짜 없음';
      }
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return '날짜 없음';
    }
  }

  function showDeleteConfirm(pipelineId: string, pipelineName: string, e: Event) {
    e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
    deleteModal = {
      show: true,
      pipelineId,
      pipelineName
    };
  }

  function cancelDelete() {
    deleteModal = {
      show: false,
      pipelineId: '',
      pipelineName: ''
    };
  }

  async function confirmDelete() {
    if (!deleteModal.pipelineId) return;

    isDeleting = true;
    error = '';

    try {
      await api.functional.pipelines.deletePipeline(makeFetch({ fetch }), deleteModal.pipelineId);

      // 로컬 상태에서 파이프라인 제거
      pipelines = pipelines.filter((p) => p.pipelineId !== deleteModal.pipelineId);

      // 모달 닫기
      cancelDelete();
    } catch (err) {
      console.error('Error deleting pipeline:', err);
      error = '파이프라인 삭제에 실패했습니다.';
    } finally {
      isDeleting = false;
    }
  }
</script>

<svelte:head>
  <title>파이프라인 - Otto</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="container mx-auto px-4 py-8">
    <!-- Breadcrumb Navigation -->
    <nav class="mb-6 flex items-center gap-2 text-sm">
      <button
        onclick={() => goto('/projects')}
        class="flex items-center gap-1 text-gray-600 transition-colors hover:text-purple-600 cursor-pointer"
      >
        <House class="h-4 w-4" />
        <span>프로젝트</span>
      </button>

      <ChevronRight class="h-4 w-4 text-gray-400" />

      {#if projectInfo}
        <span class="font-medium text-gray-900">{projectInfo.name}</span>
      {:else}
        <span class="h-4 w-20 animate-pulse rounded bg-gray-200"></span>
      {/if}

      <ChevronRight class="h-4 w-4 text-gray-400" />

      <span class="font-medium text-purple-600">파이프라인</span>
    </nav>

    <!-- Back Button for Mobile -->
    <div class="mb-4 flex items-center gap-4 sm:hidden">
      <button
        onclick={() => window.history.back()}
        class="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors hover:bg-gray-50 cursor-pointer"
      >
        <ArrowLeft class="h-4 w-4" />
        <span>뒤로</span>
      </button>
    </div>

    <!-- Pipeline Header -->
    <div class="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">파이프라인</h1>
        <p class="mt-1 text-gray-600">CI/CD 파이프라인을 생성하고 관리합니다</p>
      </div>

      <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="파이프라인 검색..."
            bind:value={searchTerm}
            class="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 sm:w-64"
          />
        </div>

        <button
          class="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50"
        >
          <SlidersHorizontal class="h-4 w-4" />
          <span>필터</span>
        </button>

        <button
          onclick={handleCreatePipeline}
          class="flex cursor-pointer items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
        >
          <Plus class="h-4 w-4" />
          <span>파이프라인 생성</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    {#if loading}
      <div class="flex h-64 items-center justify-center">
        <div class="h-12 w-12 animate-spin rounded-full border-b-2 border-purple-600"></div>
      </div>

      <!-- Error State -->
    {:else if error}
      <div class="py-12 text-center">
        <h3 class="mb-2 text-lg font-semibold text-red-600">오류가 발생했습니다</h3>
        <p class="mb-6 text-gray-600">{error}</p>
        <button
          onclick={loadPipelines}
          class="rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700"
        >
          다시 시도
        </button>
      </div>

      <!-- Pipeline Cards (Empty State + Grid) -->
    {:else}
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <!-- Empty State Card -->
        {#if pipelines.length === 0}
          <div class="col-span-full">
            <div class="py-16 text-center">
              <div
                class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100"
              >
                <Settings class="h-8 w-8 text-gray-400" />
              </div>
              <h3 class="mb-2 text-lg font-semibold text-gray-900">파이프라인이 없습니다</h3>
              <p class="mb-6 text-gray-600">
                첫 번째 파이프라인을 생성하여 자동화된 빌드와 배포를 시작해보세요
              </p>
              <button
                onclick={handleCreatePipeline}
                class="cursor-pointer rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700"
              >
                파이프라인 생성하기
              </button>
            </div>
          </div>
        {:else}
          <!-- Create New Pipeline Card -->
          <button
            type="button"
            onclick={handleCreatePipeline}
            class="group flex min-h-[200px] w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 shadow-sm transition-all hover:border-purple-400 hover:shadow-md focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            <div class="text-center">
              <div
                class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 transition-colors group-hover:bg-purple-200"
              >
                <Plus class="h-6 w-6 text-purple-600" />
              </div>
              <h3 class="mb-2 text-lg font-medium text-gray-900">새 파이프라인 생성</h3>
              <p class="text-sm text-gray-600">
                빌드, 테스트, 배포 과정을<br />자동화해보세요
              </p>
            </div>
          </button>

          <!-- Existing Pipeline Cards -->
          {#each filteredPipelines as pipeline}
            <div
              class="group relative cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-purple-200 hover:shadow-lg"
              role="button"
              tabindex="0"
              onclick={() => handlePipelineClick(pipeline.pipelineId)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePipelineClick(pipeline.pipelineId);
                }
              }}
              aria-label={`${pipeline.pipelineName} 파이프라인 편집`}
            >
              <div class="mb-4 flex items-start justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-start gap-2">
                    {#if editingPipelineName?.id === pipeline.pipelineId}
                      <div class="flex w-full items-center gap-2">
                        <input
                          bind:this={pipelineNameInputRef}
                          bind:value={editingPipelineName.value}
                          type="text"
                          class="flex-1 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="파이프라인 이름"
                          onclick={(event) => event.stopPropagation()}
                          onkeydown={(event) => onPipelineNameKeydown(event, pipeline)}
                        />
                        <button
                          type="button"
                          class="cursor-pointer rounded-lg bg-purple-600 p-2 text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                          onclick={(event) => {
                            event.stopPropagation();
                            void savePipelineName(pipeline);
                          }}
                          disabled={savingPipelineId === pipeline.pipelineId}
                          aria-label="파이프라인 이름 저장"
                        >
                          <Check class="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          class="cursor-pointer rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-100"
                          onclick={(event) => {
                            event.stopPropagation();
                            cancelPipelineNameEdit();
                          }}
                          aria-label="파이프라인 이름 편집 취소"
                        >
                          <X class="h-4 w-4" />
                        </button>
                      </div>
                    {:else}
                      <button
                        type="button"
                        class="text-left text-lg font-semibold text-gray-900 cursor-pointer bg-transparent p-0 transition-colors hover:text-purple-600 hover:underline focus:outline-none"
                        onclick={(e) => handleEditPipelineName(pipeline, e)}
                        aria-label="파이프라인 이름 편집"
                      >
                        {pipeline.pipelineName}
                      </button>
                    {/if}
                  </div>
                  {#if pipeline.ecrImageUri || pipeline.imageTag}
                    <div class="mt-2">
                      <BuildStatus status="SUCCEEDED" compact={true} />
                    </div>
                  {:else}
                    <div class="mt-2">
                      <BuildStatus status="NOT_STARTED" compact={true} />
                    </div>
                  {/if}
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    onclick={handleViewLogs}
                    class="rounded p-1 transition-colors hover:bg-blue-50"
                    title="로그 보기"
                    aria-label="로그 보기"
                  >
                    <FileText class="h-4 w-4 cursor-pointer text-blue-500" />
                  </button>
                  <button
                    type="button"
                    onclick={(e) =>
                      showDeleteConfirm(pipeline.pipelineId, pipeline.pipelineName, e)}
                    class="rounded p-1 transition-colors hover:bg-red-50"
                    title="파이프라인 삭제"
                  >
                    <Trash2 class="h-4 w-4 cursor-pointer text-red-500" />
                  </button>
                </div>
              </div>


              <div class="space-y-2 text-sm">
                {#if pipeline.imageTag}
                  <div class="flex items-center gap-2 text-gray-600">
                    <span class="text-xs">이미지: {pipeline.imageTag.substring(0, 20)}...</span>
                  </div>
                {/if}
                {#if pipeline.data && pipeline.data.trigger}
                  <div class="flex items-center gap-2 text-gray-600">
                    <Play class="h-4 w-4" />
                    <span>트리거: {pipeline.data.trigger}</span>
                  </div>
                {/if}

                {#if pipeline.data && pipeline.data.status}
                  <div class="flex items-center gap-2 text-gray-600">
                    <div
                      class="h-2 w-2 rounded-full {pipeline.data.status === 'active'
                        ? 'bg-green-500'
                        : 'bg-gray-400'}"
                    ></div>
                    <span>상태: {pipeline.data.status === 'active' ? '활성' : '비활성'}</span>
                  </div>
                {/if}

                {#if pipeline.createdAt}
                  <div class="flex items-center gap-2 text-gray-500">
                    <Calendar class="h-4 w-4" />
                    <span>생성일: {formatDate(pipeline.createdAt)}</span>
                  </div>
                {/if}
              </div>

              <div class="mt-4 border-t border-gray-100 pt-4">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500">
                    {#if pipeline.updatedAt}
                      최근 업데이트: {formatDate(pipeline.updatedAt)}
                    {:else}
                      업데이트 정보 없음
                    {/if}
                  </span>
                  <button
                    type="button"
                    onclick={() => handlePipelineClick(pipeline.pipelineId)}
                    class="text-xs font-medium text-purple-600 hover:text-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none cursor-pointer"
                  >
                    파이프라인 편집 →
                  </button>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Delete Confirmation Modal -->
{#if deleteModal.show}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop with glass effect -->
    <button
      type="button"
      class="absolute inset-0 bg-opacity-20 backdrop-blur-sm transition-opacity"
      onclick={cancelDelete}
      aria-label="Cancel delete"
    ></button>

    <!-- Modal Content -->
    <div class="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
      <h3 class="mb-4 text-lg font-semibold text-gray-900">파이프라인 삭제 확인</h3>

      <p class="mb-6 text-gray-600">
        <span class="font-medium text-gray-900">"{deleteModal.pipelineName}"</span> 파이프라인을 삭제하시겠습니까?
      </p>

      <div class="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p class="text-sm text-yellow-800">
          <strong>⚠️ 주의:</strong> 이 작업은 되돌릴 수 없습니다.<br />파이프라인 구성과 플로우
          데이터가 모두 삭제됩니다.
        </p>
      </div>

      <div class="flex justify-end gap-3">
        <button
          type="button"
          onclick={cancelDelete}
          disabled={isDeleting}
          class="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          onclick={confirmDelete}
          disabled={isDeleting}
          class="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {#if isDeleting}
            <div
              class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
            ></div>
            삭제 중...
          {:else}
            삭제
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
