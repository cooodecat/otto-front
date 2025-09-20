<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import api from '$lib/sdk';
  import { makeFetch } from '$lib/utils/make-fetch';
  import {
    Plus,
    Search,
    Filter,
    Calendar,
    Settings,
    Activity,
    Play,
    ArrowLeft,
    Trash2
  } from 'lucide-svelte';
  import { getPipelineById } from '$lib/sdk/functional/pipelines';

  const projectId = $page.params.project_id;

  let pipelines = $state<getPipelineById.Output[]>([]);
  let loading = $state(false);
  let searchTerm = $state('');
  let error = $state('');
  let deleteModal = $state<{ show: boolean; pipelineId: string; pipelineName: string }>({
    show: false,
    pipelineId: '',
    pipelineName: ''
  });
  let isDeleting = $state(false);

  // 검색 필터링
  const filteredPipelines = $derived(
    pipelines.filter((pipeline) =>
      pipeline.pipelineName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  onMount(async () => {
    await loadPipelines();
  });

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
    } catch (err: any) {
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

  function handleBackToProjects() {
    goto('/projects');
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
      await api.functional.pipelines.deletePipeline(
        makeFetch({ fetch }),
        deleteModal.pipelineId
      );

      // 로컬 상태에서 파이프라인 제거
      pipelines = pipelines.filter(p => p.pipelineId !== deleteModal.pipelineId);

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
    <!-- Pipeline Header -->
    <div class="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div class="flex items-center gap-4">
        <button
          onclick={handleBackToProjects}
          class="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <ArrowLeft class="h-4 w-4" />
          <span>프로젝트</span>
        </button>

        <div>
          <h1 class="text-2xl font-bold text-gray-900">파이프라인</h1>
          <p class="mt-1 text-gray-600">CI/CD 파이프라인을 생성하고 관리합니다</p>
        </div>
      </div>

      <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <div class="relative">
          <Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="파이프라인 검색..."
            bind:value={searchTerm}
            class="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none sm:w-64"
          />
        </div>

        <button
          class="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50"
        >
          <Filter class="h-4 w-4" />
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
            class="group flex min-h-[200px] w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 shadow-sm transition-all hover:border-purple-400 hover:shadow-md focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none"
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
            <article
              class="group relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div class="mb-4 flex items-start justify-between">
                <h3 class="text-lg font-semibold text-gray-900">
                  {pipeline.pipelineName}
                </h3>
                <div class="flex items-center gap-2">
                  <Activity class="h-5 w-5 text-green-500" />
                  <button
                    type="button"
                    onclick={(e) => showDeleteConfirm(pipeline.pipelineId, pipeline.pipelineName, e)}
                    class="p-1 rounded hover:bg-red-50 transition-colors"
                    title="파이프라인 삭제"
                  >
                    <Trash2 class="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>

              {#if pipeline.data && pipeline.data.description}
                <p class="mb-4 line-clamp-2 text-sm text-gray-600">
                  {pipeline.data.description}
                </p>
              {/if}

              <div class="space-y-2 text-sm">
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
                    class="text-xs font-medium text-purple-600 hover:text-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none"
                  >
                    상세 보기 →
                  </button>
                </div>
              </div>
            </article>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Delete Confirmation Modal -->
{#if deleteModal.show}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div 
      class="absolute inset-0 bg-black bg-opacity-30 transition-opacity"
      onclick={cancelDelete}
    ></div>
    
    <!-- Modal Content -->
    <div class="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
      <h3 class="mb-4 text-lg font-semibold text-gray-900">파이프라인 삭제 확인</h3>
      
      <p class="mb-6 text-gray-600">
        <span class="font-medium text-gray-900">"{deleteModal.pipelineName}"</span> 파이프라인을 삭제하시겠습니까?
      </p>
      
      <div class="mb-4 rounded-lg bg-yellow-50 p-4 border border-yellow-200">
        <p class="text-sm text-yellow-800">
          <strong>⚠️ 주의:</strong> 이 작업은 되돌릴 수 없습니다. 파이프라인 설정과 관련된 모든 데이터가 삭제됩니다.
        </p>
      </div>
      
      <div class="flex gap-3 justify-end">
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
            <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            삭제 중...
          {:else}
            삭제
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
