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
			const newPipeline = await api.functional.pipelines.createPipeline(
				makeFetch({ fetch }),
				{
					projectId,
					pipelineName: pipelineName.trim(),
					data: {}
				}
			);
			
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
		<div class="flex items-center gap-4 mb-8">
			<button
				onclick={handleCancel}
				class="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
			>
				<ArrowLeft class="w-4 h-4" />
				<span>돌아가기</span>
			</button>
			
			<div>
				<h1 class="text-2xl font-bold text-gray-900">새 파이프라인 생성</h1>
				<p class="text-gray-600 mt-1">
					CI/CD 파이프라인을 생성하여 자동화된 빌드와 배포를 시작하세요
				</p>
			</div>
		</div>

		<!-- Form Card -->
		<div class="max-w-2xl mx-auto">
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
				<div class="flex items-center gap-3 mb-6">
					<div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
						<Settings class="w-5 h-5 text-purple-600" />
					</div>
					<div>
						<h2 class="text-lg font-semibold text-gray-900">파이프라인 정보</h2>
						<p class="text-sm text-gray-600">파이프라인 이름을 입력해주세요</p>
					</div>
				</div>

				{#if error}
					<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
						<p class="text-sm text-red-600">{error}</p>
					</div>
				{/if}

				<form onsubmit={handleCreatePipeline} class="space-y-6">
					<!-- Pipeline Name -->
					<div>
						<label for="pipelineName" class="block text-sm font-medium text-gray-700 mb-2">
							파이프라인 이름 *
						</label>
						<input
							id="pipelineName"
							type="text"
							bind:value={pipelineName}
							placeholder="예: Production Deploy Pipeline"
							required
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
						/>
						<p class="mt-1 text-xs text-gray-500">
							파이프라인을 식별할 수 있는 이름을 입력해주세요
						</p>
					</div>


					<!-- Pipeline Configuration Preview -->
					<div class="bg-gray-50 rounded-lg p-4">
						<h3 class="text-sm font-medium text-gray-700 mb-3">기본 설정</h3>
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
							class="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
						>
							취소
						</button>
						<button
							type="submit"
							disabled={loading || !pipelineName.trim()}
							class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{#if loading}
								<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
								<span>생성 중...</span>
							{:else}
								<Plus class="w-4 h-4" />
								<span>파이프라인 생성</span>
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>