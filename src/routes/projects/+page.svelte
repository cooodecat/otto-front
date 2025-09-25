<script lang="ts">
import { onMount, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import api from '$lib/sdk';
  import { makeFetch } from '$lib/utils/make-fetch';
import { Plus, Search, Filter, Calendar, GitBranch, FileText, Trash2, Check, X } from 'lucide-svelte';
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
let editingProjectName = $state<{ id: string; value: string } | null>(null);
let editingProjectDescription = $state<{ id: string; value: string } | null>(null);
let projectNameInputRef = $state<HTMLInputElement | null>(null);
let projectDescriptionRef = $state<HTMLTextAreaElement | null>(null);
let savingProjectField = $state<{ id: string; field: 'name' | 'description' } | null>(null);

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

  function handleProjectLogsClick(projectId: string, e: Event) {
    e.stopPropagation();
    goto(`/projects/${projectId}/logs`);
  }

  async function handleEditProjectName(project: getProject.Output, e: Event) {
    e.stopPropagation();
    editingProjectDescription = null;
    editingProjectName = {
      id: project.projectId,
      value: project.projectName || ''
    };
    await tick();
    projectNameInputRef?.focus();
    projectNameInputRef?.select();
  }

  async function handleEditProjectDescription(project: getProject.Output, e: Event) {
    e.stopPropagation();
    editingProjectName = null;
    editingProjectDescription = {
      id: project.projectId,
      value: project.projectDescription || ''
    };
    await tick();
    projectDescriptionRef?.focus();
  }

  function cancelProjectNameEdit() {
    editingProjectName = null;
    projectNameInputRef = null;
  }

  function cancelProjectDescriptionEdit() {
    editingProjectDescription = null;
    projectDescriptionRef = null;
  }

  async function saveProjectName(project: getProject.Output) {
    if (!editingProjectName || editingProjectName.id !== project.projectId) return;
    const trimmed = editingProjectName.value.trim();
    const current = project.projectName || '';

    if (trimmed === current.trim()) {
      cancelProjectNameEdit();
      return;
    }

    savingProjectField = { id: project.projectId, field: 'name' };
    try {
      const connection = makeFetch({ fetch });
      const updated = await api.functional.projects.updateProject(connection, project.projectId, {
        projectName: trimmed
      });
      projects = projects.map((p) =>
        p.projectId === project.projectId ? { ...p, ...updated } : p
      );
    } catch (error) {
      console.error('프로젝트 이름 업데이트 실패:', error);
    } finally {
      savingProjectField = null;
      cancelProjectNameEdit();
    }
  }

  async function saveProjectDescription(project: getProject.Output) {
    if (!editingProjectDescription || editingProjectDescription.id !== project.projectId) return;
    const trimmed = editingProjectDescription.value.trim();
    const current = project.projectDescription || '';

    if (trimmed === current.trim()) {
      cancelProjectDescriptionEdit();
      return;
    }

    savingProjectField = { id: project.projectId, field: 'description' };
    try {
      const connection = makeFetch({ fetch });
      const updated = await api.functional.projects.updateProject(connection, project.projectId, {
        projectDescription: trimmed
      });
      projects = projects.map((p) =>
        p.projectId === project.projectId ? { ...p, ...updated } : p
      );
    } catch (error) {
      console.error('프로젝트 설명 업데이트 실패:', error);
    } finally {
      savingProjectField = null;
      cancelProjectDescriptionEdit();
    }
  }

  function onProjectNameKeydown(event: KeyboardEvent, project: getProject.Output) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void saveProjectName(project);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelProjectNameEdit();
    }
  }

  function onProjectDescriptionKeydown(event: KeyboardEvent, project: getProject.Output) {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelProjectDescriptionEdit();
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void saveProjectDescription(project);
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
      await api.functional.projects.deleteProject(makeFetch({ fetch }), deleteModal.projectId);

      // 로컬 상태에서 프로젝트 제거
      projects = projects.filter((p) => p.projectId !== deleteModal.projectId);

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
          {#each filteredProjects as project (project)}
            <div
              class="group relative cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-purple-200 hover:shadow-lg"
              role="button"
              tabindex="0"
              onclick={() => handleProjectClick(project.projectId)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleProjectClick(project.projectId);
                }
              }}
              aria-label={`${project.projectName} 프로젝트로 이동`}
            >
              <div class="mb-4 flex items-start justify-between gap-4">
                <div class="flex-1">
                  {#if editingProjectName?.id === project.projectId}
                    <div class="flex items-center gap-2">
                      <input
                        bind:this={projectNameInputRef}
                        bind:value={editingProjectName.value}
                        type="text"
                        class="flex-1 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="프로젝트 이름"
                        onclick={(event) => event.stopPropagation()}
                        onkeydown={(event) => onProjectNameKeydown(event, project)}
                      />
                      <button
                        type="button"
                        class="cursor-pointer rounded-lg bg-purple-600 p-2 text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                        onclick={(event) => {
                          event.stopPropagation();
                          void saveProjectName(project);
                        }}
                        disabled={savingProjectField?.id === project.projectId && savingProjectField.field === 'name'}
                        aria-label="프로젝트 이름 저장"
                      >
                        <Check class="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        class="cursor-pointer rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-gray-100"
                        onclick={(event) => {
                          event.stopPropagation();
                          cancelProjectNameEdit();
                        }}
                        aria-label="프로젝트 이름 편집 취소"
                      >
                        <X class="h-4 w-4" />
                      </button>
                    </div>
                  {:else}
                    <button
                      type="button"
                      class="text-left text-lg font-semibold text-gray-900 cursor-pointer bg-transparent p-0 transition-colors hover:text-purple-600 hover:underline focus:outline-none"
                      onclick={(e) => handleEditProjectName(project, e)}
                      aria-label="프로젝트 이름 편집"
                    >
                      {project.projectName}
                    </button>
                  {/if}
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    onclick={(e) => handleProjectLogsClick(project.projectId, e)}
                    class="rounded p-1 transition-colors hover:bg-blue-50"
                    title="로그 보기"
                    aria-label="로그 보기"
                  >
                    <FileText class="h-4 w-4 text-blue-500 cursor-pointer" />
                  </button>
                  <button
                    type="button"
                    onclick={(e) => showDeleteConfirm(project.projectId, project.projectName, e)}
                    class="rounded p-1 transition-colors hover:bg-red-50"
                    title="프로젝트 삭제"
                  >
                    <Trash2 class="h-4 w-4 cursor-pointer text-red-500" />
                  </button>
                </div>
              </div>

              <div class="mb-4 text-sm text-gray-600">
                {#if editingProjectDescription?.id === project.projectId}
                  <div class="space-y-2">
                    <textarea
                      bind:this={projectDescriptionRef}
                      bind:value={editingProjectDescription.value}
                      rows="3"
                      class="w-full resize-none rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="프로젝트 설명"
                      onclick={(event) => event.stopPropagation()}
                      onkeydown={(event) => onProjectDescriptionKeydown(event, project)}
                    ></textarea>
                    <div class="flex justify-end gap-2">
                      <button
                        type="button"
                        class="cursor-pointer rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                        onclick={(event) => {
                          event.stopPropagation();
                          void saveProjectDescription(project);
                        }}
                        disabled={savingProjectField?.id === project.projectId && savingProjectField.field === 'description'}
                      >
                        <Check class="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        class="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
                        onclick={(event) => {
                          event.stopPropagation();
                          cancelProjectDescriptionEdit();
                        }}
                      >
                        <X class="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                {:else}
                  {#if project.projectDescription && project.projectDescription.trim() !== ''}
                    <button
                      type="button"
                      class="w-full text-left line-clamp-2 cursor-pointer bg-transparent p-0 transition-colors hover:text-purple-500 hover:underline focus:outline-none"
                      onclick={(e) => handleEditProjectDescription(project, e)}
                      aria-label="프로젝트 설명 편집"
                    >
                      {project.projectDescription}
                    </button>
                  {:else}
                    <button
                      type="button"
                      class="text-left italic text-gray-400 cursor-pointer bg-transparent p-0 transition-colors hover:text-purple-500 hover:underline focus:outline-none"
                      onclick={(e) => handleEditProjectDescription(project, e)}
                      aria-label="프로젝트 설명 편집"
                    >
                      설명이 없습니다
                    </button>
                  {/if}
                {/if}
              </div>

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
                    class="text-xs font-medium text-purple-600 hover:text-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none cursor-pointer"
                  >
                    파이프라인 이동 →
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
      class="bg-opacity-20 absolute inset-0 bg-gray-900 backdrop-blur-sm transition-opacity"
      onclick={cancelDelete}
      aria-label="Cancel delete"
    ></button>

    <!-- Modal Content -->
    <div class="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
      <h3 class="mb-4 text-lg font-semibold text-gray-900">프로젝트 삭제 확인</h3>

      <p class="mb-6 text-gray-600">
        <span class="font-medium text-gray-900">"{deleteModal.projectName}"</span> 프로젝트를 삭제하시겠습니까?
      </p>

      <div class="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p class="text-sm text-yellow-800">
          <strong>⚠️ 주의:</strong> 이 작업은 되돌릴 수 없습니다.<br />프로젝트와 관련된 모든
          파이프라인도 함께 삭제됩니다.
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
