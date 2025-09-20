<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import api from '$lib/sdk';
  import { makeFetch } from '$lib/utils/make-fetch';
  import { ArrowLeft, Plus, Settings } from 'lucide-svelte';

  const projectId = $page.params.project_id;

  let pipelineName = $state('');
  let loading = $state(false);
  let error = $state('');

  async function handleCreatePipeline(event: SubmitEvent) {
    event.preventDefault();
    if (!projectId) {
      error = '프로젝트 ID가 없습니다';
      return;
    }

    if (!pipelineName.trim()) {
      error = '파이프라인 이름을 입력해주세요';
      return;
    }

    loading = true;
    error = '';

    try {
      const newPipeline = await api.functional.pipelines.createPipeline(makeFetch({ fetch }), {
        projectId,
        pipelineName: pipelineName.trim(),
        data: {}
      });

      // 생성된 파이프라인으로 이동
      await goto(`/projects/${projectId}/pipelines/${newPipeline.pipelineId}`);
    } catch (err) {
      console.error('파이프라인 생성 실패:', err);
      error = '파이프라인 생성에 실패했습니다';
    }

    loading = false;
  }

  function handleCancel() {
    goto(`/projects/${projectId}/pipelines`);
  }
</script>

<svelte:head>
  <title>새 파이프라인 생성 - Otto</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8 flex items-center gap-4">
      <button
        onclick={handleCancel}
        class="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        <ArrowLeft class="h-4 w-4" />
        <span>돌아가기</span>
      </button>

      <div>
        <h1 class="text-2xl font-bold text-gray-900">새 파이프라인 생성</h1>
        <p class="mt-1 text-gray-600">
          CI/CD 파이프라인을 생성하여 자동화된 빌드와 배포를 시작하세요
        </p>
      </div>
    </div>

    <!-- Form Card -->
    <div class="mx-auto max-w-2xl">
      <div class="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div class="mb-6 flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
            <Settings class="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">파이프라인 정보</h2>
            <p class="text-sm text-gray-600">파이프라인 이름을 입력해주세요</p>
          </div>
        </div>

        {#if error}
          <div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p class="text-sm text-red-600">{error}</p>
          </div>
        {/if}

        <form onsubmit={handleCreatePipeline} class="space-y-6">
          <!-- Pipeline Name -->
          <div>
            <label for="pipelineName" class="mb-2 block text-sm font-medium text-gray-700">
              파이프라인 이름 *
            </label>
            <input
              id="pipelineName"
              type="text"
              bind:value={pipelineName}
              placeholder="예: Production Deploy Pipeline"
              required
              class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <p class="mt-1 text-xs text-gray-500">
              파이프라인을 식별할 수 있는 이름을 입력해주세요
            </p>
          </div>

          <!-- Pipeline Configuration Preview -->
          <div class="rounded-lg bg-gray-50 p-4">
            <h3 class="mb-3 text-sm font-medium text-gray-700">기본 설정</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">트리거 방식:</span>
                <span class="text-gray-900">수동 실행</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">상태:</span>
                <span class="text-green-600">활성</span>
              </div>
            </div>
            <p class="mt-3 text-xs text-gray-500">
              생성 후 파이프라인 설정에서 세부 구성을 변경할 수 있습니다
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 pt-4">
            <button
              type="button"
              onclick={handleCancel}
              class="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !pipelineName.trim()}
              class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {#if loading}
                <div class="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                <span>생성 중...</span>
              {:else}
                <Plus class="h-4 w-4" />
                <span>파이프라인 생성</span>
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>
