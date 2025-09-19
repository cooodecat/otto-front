<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import api from '$lib/sdk';
	import { makeFetch } from '$lib/utils/make-fetch';
	import { Plus, Search, Filter, Calendar, Settings, Activity, Play, Pause, ArrowLeft } from 'lucide-svelte';

	const projectId = $page.params.project_id;
	
	let pipelines = $state<any[]>([]);
	let loading = $state(false);
	let searchTerm = $state('');
	let error = $state('');

	// 검색 필터링
	const filteredPipelines = $derived(pipelines.filter(pipeline =>
		pipeline.pipelineName.toLowerCase().includes(searchTerm.toLowerCase())
	));

	onMount(async () => {
		await loadPipelines();
	});

	async function loadPipelines() {
		loading = true;
		error = '';
		
		try {
			const data = await api.functional.pipelines.getPipelines(
				makeFetch({ fetch }),
				{ projectId }
			);
			
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
</script>

<svelte:head>
	<title>파이프라인 - Otto</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="container mx-auto px-4 py-8">
		<!-- Pipeline Header -->
		<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
			<div class="flex items-center gap-4">
				<button
					onclick={handleBackToProjects}
					class="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
				>
					<ArrowLeft class="w-4 h-4" />
					<span>프로젝트</span>
				</button>
				
				<div>
					<h1 class="text-2xl font-bold text-gray-900">파이프라인</h1>
					<p class="text-gray-600 mt-1">
						CI/CD 파이프라인을 생성하고 관리합니다
					</p>
				</div>
			</div>

			<div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
				<div class="relative">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
					<input
						type="text"
						placeholder="파이프라인 검색..."
						bind:value={searchTerm}
						class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full sm:w-64"
					/>
				</div>

				<button class="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
					<Filter class="w-4 h-4" />
					<span>필터</span>
				</button>

				<button
					onclick={handleCreatePipeline}
					class="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
				>
					<Plus class="w-4 h-4" />
					<span>파이프라인 생성</span>
				</button>
			</div>
		</div>

		<!-- Loading State -->
		{#if loading}
			<div class="flex items-center justify-center h-64">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
			</div>

		<!-- Error State -->
		{:else if error}
			<div class="text-center py-12">
				<h3 class="text-lg font-semibold text-red-600 mb-2">오류가 발생했습니다</h3>
				<p class="text-gray-600 mb-6">{error}</p>
				<button
					onclick={loadPipelines}
					class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
				>
					다시 시도
				</button>
			</div>

		<!-- Pipeline Cards (Empty State + Grid) -->
		{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<!-- Empty State Card -->
			{#if pipelines.length === 0}
				<div class="col-span-full">
					<div class="text-center py-16">
						<div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<Settings class="w-8 h-8 text-gray-400" />
						</div>
						<h3 class="text-lg font-semibold text-gray-900 mb-2">파이프라인이 없습니다</h3>
						<p class="text-gray-600 mb-6">
							첫 번째 파이프라인을 생성하여 자동화된 빌드와 배포를 시작해보세요
						</p>
						<button
							onclick={handleCreatePipeline}
							class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer"
						>
							파이프라인 생성하기
						</button>
					</div>
				</div>
			{:else}
				<!-- Create New Pipeline Card -->
				<div
					onclick={handleCreatePipeline}
					class="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 p-6 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group flex items-center justify-center min-h-[200px]"
				>
					<div class="text-center">
						<div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
							<Plus class="w-6 h-6 text-purple-600" />
						</div>
						<h3 class="text-lg font-medium text-gray-900 mb-2">새 파이프라인 생성</h3>
						<p class="text-sm text-gray-600">
							빌드, 테스트, 배포 과정을<br />자동화해보세요
						</p>
					</div>
				</div>

				<!-- Existing Pipeline Cards -->
				{#each filteredPipelines as pipeline}
					<div
						onclick={() => handlePipelineClick(pipeline.pipelineId)}
						class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
					>
						<div class="flex items-start justify-between mb-4">
							<h3 class="text-lg font-semibold text-gray-900">
								{pipeline.pipelineName}
							</h3>
							<Activity class="w-5 h-5 text-green-500" />
						</div>

						{#if pipeline.data && pipeline.data.description}
							<p class="text-sm text-gray-600 mb-4 line-clamp-2">
								{pipeline.data.description}
							</p>
						{/if}

						<div class="space-y-2 text-sm">
							{#if pipeline.data && pipeline.data.trigger}
								<div class="flex items-center gap-2 text-gray-600">
									<Play class="w-4 h-4" />
									<span>트리거: {pipeline.data.trigger}</span>
								</div>
							{/if}

							{#if pipeline.data && pipeline.data.status}
								<div class="flex items-center gap-2 text-gray-600">
									<div class="w-2 h-2 rounded-full {pipeline.data.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}"></div>
									<span>상태: {pipeline.data.status === 'active' ? '활성' : '비활성'}</span>
								</div>
							{/if}

							{#if pipeline.createdAt}
								<div class="flex items-center gap-2 text-gray-500">
									<Calendar class="w-4 h-4" />
									<span>생성일: {formatDate(pipeline.createdAt)}</span>
								</div>
							{/if}
						</div>

						<div class="mt-4 pt-4 border-t border-gray-100">
							<div class="flex items-center justify-between">
								<span class="text-xs text-gray-500">
									{#if pipeline.updatedAt}
										최근 업데이트: {formatDate(pipeline.updatedAt)}
									{:else}
										업데이트 정보 없음
									{/if}
								</span>
								<button
									onclick={(e) => {
										e.stopPropagation();
										handlePipelineClick(pipeline.pipelineId);
									}}
									class="text-xs text-purple-600 hover:text-purple-700 font-medium"
								>
									상세 보기 →
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