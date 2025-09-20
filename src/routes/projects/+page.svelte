<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import api from '$lib/sdk';
  import { makeFetch } from '$lib/utils/make-fetch';
  import { Plus, Search, Filter, Calendar, GitBranch, Activity, Trash2 } from 'lucide-svelte';
  import { getProject } from '$lib/sdk/functional/projects';

  let projects = $state<getProject.Output[]>([]);
  let loading = $state(false); // 초기값을 false로 변경
  let searchTerm = $state('');
  let error = $state('');
  let _hasLoaded = $state(false); // 중복 로딩 방지
  let deleteModal = $state<{ show: boolean; projectId: string; projectName: string }>({
    show: false,
    projectId: '',
    projectName: ''
  });
  let isDeleting = $state(false);

  // 검색 필터링
  const filteredProjects = $derived(
    projects.filter(
      (project) =>
        project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.projectDescription &&
          project.projectDescription.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  onMount(async () => {
    await loadProjects();
  });

  async function loadProjects() {
    loading = true;
    error = '';

    try {
      const data: any = await api.functional.projects.getProjects(makeFetch({ fetch }));

      // 데이터 설정
      if (Array.isArray(data)) {
        projects = [...data]; // 새로운 배열로 할당
      } else if (data && Array.isArray(data.projects)) {
        projects = [...data.projects]; // 새로운 배열로 할당
      } else {
        projects = [];
      }
    } catch (err) {
      error = 'Failed to load projects';
      console.error('Error loading projects:', err);
      projects = [];
    }

    loading = false;
  }

  function handleCreateProject() {
    goto('/projects/new');
  }

  function handleProjectClick(projectId: string) {
    goto(`/projects/${projectId}/pipelines`);
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

  function showDeleteConfirm(projectId: string, projectName: string, e: Event) {
    e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
    deleteModal = {
      show: true,
      projectId,
      projectName
    };
  }

  function cancelDelete() {
    deleteModal = {
      show: false,
      projectId: '',
      projectName: ''
    };
  }

  async function confirmDelete() {
    if (!deleteModal.projectId) return;

    isDeleting = true;
    error = '';

    try {
      await api.functional.projects.deleteProject(
        makeFetch({ fetch }),
        deleteModal.projectId
      );

      // 로컬 상태에서 프로젝트 제거
      projects = projects.filter(p => p.projectId !== deleteModal.projectId);

      // 모달 닫기
      cancelDelete();
    } catch (err) {
      console.error('Error deleting project:', err);
      error = '프로젝트 삭제에 실패했습니다.';
    } finally {
      isDeleting = false;
    }
  }
</script>

<svelte:head>
  <title>프로젝트 - Otto</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="container mx-auto px-4 py-8">
    <!-- Project Header -->
    <div class="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">프로젝트</h1>
        <p class="mt-1 text-gray-600">CI/CD 파이프라인을 관리하고 배포를 모니터링합니다</p>
      </div>

      <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <div class="relative">
          <Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="프로젝트 검색..."
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
          onclick={handleCreateProject}
          class="flex cursor-pointer items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
        >
          <Plus class="h-4 w-4" />
          <span>프로젝트 생성</span>
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
          onclick={loadProjects}
          class="rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700"
        >
          다시 시도
        </button>
      </div>

      <!-- Project Cards (Empty State + Grid) -->
    {:else}
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <!-- Empty State Card -->
        {#if projects.length === 0}
          <div class="col-span-full">
            <div class="py-16 text-center">
              <div
                class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100"
              >
                <Plus class="h-8 w-8 text-gray-400" />
              </div>
              <h3 class="mb-2 text-lg font-semibold text-gray-900">프로젝트가 없습니다</h3>
              <p class="mb-6 text-gray-600">
                첫 번째 프로젝트를 생성하여 CI/CD 파이프라인을 구축해보세요
              </p>
              <button
                onclick={handleCreateProject}
                class="cursor-pointer rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700"
              >
                프로젝트 생성하기
              </button>
            </div>
          </div>
        {:else}
          <!-- Create New Project Card -->
          <button
            type="button"
            onclick={handleCreateProject}
            class="group flex min-h-[200px] w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 shadow-sm transition-all hover:border-purple-400 hover:shadow-md focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none"
          >
            <div class="text-center">
              <div
                class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 transition-colors group-hover:bg-purple-200"
              >
                <Plus class="h-6 w-6 text-purple-600" />
              </div>
              <h3 class="mb-2 text-lg font-medium text-gray-900">새 프로젝트 생성</h3>
              <p class="text-sm text-gray-600">
                GitHub 저장소를 연결하여<br />새로운 프로젝트를 시작하세요
              </p>
            </div>
          </button>

          <!-- Existing Project Cards -->
          {#each filteredProjects as project}
            <article
              class="group relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div class="mb-4 flex items-start justify-between">
                <h3 class="text-lg font-semibold text-gray-900">
                  {project.projectName}
                </h3>
                <div class="flex items-center gap-2">
                  <Activity class="h-5 w-5 text-green-500" />
                  <button
                    type="button"
                    onclick={(e) => showDeleteConfirm(project.projectId, project.projectName, e)}
                    class="p-1 rounded hover:bg-red-50 transition-colors"
                    title="프로젝트 삭제"
                  >
                    <Trash2 class="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>

              {#if project.projectDescription}
                <p class="mb-4 line-clamp-2 text-sm text-gray-600">
                  {project.projectDescription}
                </p>
              {/if}

              <div class="space-y-2 text-sm">
                {#if project.githubRepositoryName}
                  <div class="flex items-center gap-2 text-gray-600">
                    <GitBranch class="h-4 w-4" />
                    <span>
                      {project.githubOwner}/{project.githubRepositoryName}
                    </span>
                  </div>
                {/if}

                {#if project.selectedBranch}
                  <div class="flex items-center gap-2 text-gray-600">
                    <GitBranch class="h-4 w-4" />
                    <span>브랜치: {project.selectedBranch}</span>
                  </div>
                {/if}

                {#if project.createdAt}
                  <div class="flex items-center gap-2 text-gray-500">
                    <Calendar class="h-4 w-4" />
                    <span>{formatDate(project.createdAt)}</span>
                  </div>
                {/if}
              </div>

              <div class="mt-4 border-t border-gray-100 pt-4">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500">
                    {#if project.updatedAt}
                      최근 업데이트: {formatDate(project.updatedAt)}
                    {:else}
                      업데이트 정보 없음
                    {/if}
                  </span>
                  <button
                    type="button"
                    onclick={() => handleProjectClick(project.projectId)}
                    class="text-xs font-medium text-purple-600 hover:text-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none"
                  >
                    파이프라인 보기 →
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
      <h3 class="mb-4 text-lg font-semibold text-gray-900">프로젝트 삭제 확인</h3>
      
      <p class="mb-6 text-gray-600">
        <span class="font-medium text-gray-900">"{deleteModal.projectName}"</span> 프로젝트를 삭제하시겠습니까?
      </p>
      
      <div class="mb-4 rounded-lg bg-yellow-50 p-4 border border-yellow-200">
        <p class="text-sm text-yellow-800">
          <strong>⚠️ 주의:</strong> 이 작업은 되돌릴 수 없습니다. 프로젝트와 관련된 모든 파이프라인도 함께 삭제됩니다.
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
