<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import api from '$lib/sdk';
	import { makeFetch } from '$lib/utils/make-fetch';
	import { X, ChevronLeft, ChevronRight, AlertCircle, ExternalLink, Github, Loader2, GitBranch, Star, Lock, Unlock, ChevronDown, Check } from 'lucide-svelte';
	
	// SDK 타입 정의
	type Installation = api.functional.github_app.installations.getUserInstallations.Output[0];
	type Repository = api.functional.github_app.repositories.getUserRepositories.Output[0];
	type Branch = api.functional.github_app.installations.repositories.branches.getRepositoryBranches.Output[0];

	
	// Wizard state (SvelteKit 5 $state)
	let currentStep = $state(1);
	let installations = $state<Installation[]>([]);
	let selectedInstallation = $state<Installation | null>(null);
	let repositories = $state<Repository[]>([]);
	let selectedRepository = $state<Repository | null>(null);
	let branches = $state<Branch[]>([]);
	let selectedBranch = $state('main');
	let projectConfig = $state({
		name: '',
		description: ''
	});
	let validation = $state({
		isNameValid: false,
		nameError: null as string | null,
		isChecking: false
	});
	
	let loading = $state(false);
	let error = $state('');
	let isCreating = $state(false);
	let createdProjectId = $state<string | null>(null);
	let hasGithubApp = $state(false);
	let isInstallingGitHub = $state(false);
	let searchQuery = $state('');
	
	// Dropdown states
	let showInstallationDropdown = $state(false);
	let showRepositoryDropdown = $state(false);
	let loadingRepositories = $state(false);
	
	// 검색된 리포지토리 필터링
	const filteredRepositories = $derived(repositories.filter(repo =>
		repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
	));
	
	onMount(() => {
		loadInstallations();
		
		// 외부 클릭 이벤트 리스너 추가
		document.addEventListener('click', handleClickOutside);
		
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
	
	async function loadInstallations() {
		try {
			loading = true;
			error = '';
			
			const data = await api.functional.github_app.installations.getUserInstallations(
				makeFetch({ fetch })
			);
			
			if (Array.isArray(data)) {
				installations = data;
				hasGithubApp = data.length > 0;
			} else {
				installations = [];
				hasGithubApp = false;
			}
		} catch (err: any) {
			error = 'GitHub App 설치 정보를 불러오는데 실패했습니다';
			console.error('Error loading installations:', err);
			installations = [];
			hasGithubApp = false;
		}
		
		loading = false;
	}
	
	async function loadRepositoriesForInstallation(installationId: string) {
		try {
			console.log('📦 Loading repositories for installation:', installationId);
			loadingRepositories = true;
			repositories = [];
			selectedRepository = null;
			
			const data = await api.functional.github_app.installations.repositories.getInstallationRepositories(
				makeFetch({ fetch }),
				installationId
			);
			
			console.log('📦 Repository data received:', data);
			
			if (Array.isArray(data)) {
				repositories = data;
				console.log('✅ Repositories loaded:', data.length);
			} else {
				repositories = [];
				console.log('❌ No repositories found');
			}
		} catch (err: any) {
			error = '리포지토리 목록을 불러오는데 실패했습니다';
			console.error('❌ Error loading repositories:', err);
			repositories = [];
		}
		
		loadingRepositories = false;
	}
	
	function selectInstallation(installation: Installation) {
		console.log('🔍 Installation selected:', installation.id, installation.account.login);
		selectedInstallation = installation;
		showInstallationDropdown = false;
		loadRepositoriesForInstallation(installation.id);
	}
	
	function selectRepository(repository: Repository) {
		selectedRepository = repository;
		showRepositoryDropdown = false;
		projectConfig.name = repository.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
		projectConfig.description = repository.description || '';
		validateProjectName(projectConfig.name);
		loadBranches();
	}
	
	async function loadBranches() {
		if (!selectedRepository || !selectedInstallation) return;
		
		try {
			// 올바른 API 호출 방식: installations/installationId/repositories/owner/repo/branches
			const data = await api.functional.github_app.installations.repositories.branches.getRepositoryBranches(
				makeFetch({ fetch }),
				selectedInstallation.id,
				selectedRepository.owner.login,
				selectedRepository.name
			);
			
			if (Array.isArray(data)) {
				branches = data;
				selectedBranch = selectedRepository.default_branch || 'main';
			}
		} catch (err) {
			console.error('Error loading branches:', err);
			branches = [];
		}
	}
	
	let githubInstallWindow: Window | null = null;
	let windowCheckInterval: NodeJS.Timeout | null = null;

	async function handleInstallGitHub() {
		try {
			isInstallingGitHub = true;
			
			// 이미 열린 창이 있다면 포커스
			if (githubInstallWindow && !githubInstallWindow.closed) {
				githubInstallWindow.focus();
				return;
			}
			
			const data = await api.functional.github_app.installation_url.getInstallationUrl(
				makeFetch({ fetch })
			);
			
			if (data.installation_url) {
				// 작은 팝업 창으로 열기
				const windowFeatures = 'width=800,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no';
				githubInstallWindow = window.open(
					data.installation_url, 
					'github-app-install', 
					windowFeatures
				);
				
				// 창이 닫혔는지 주기적으로 확인
				if (githubInstallWindow) {
					startWindowCheckInterval();
				}
			}
		} catch (err) {
			console.error('Error getting installation URL:', err);
		} finally {
			isInstallingGitHub = false;
		}
	}
	
	function startWindowCheckInterval() {
		// 기존 인터벌 정리
		if (windowCheckInterval) {
			clearInterval(windowCheckInterval);
		}
		
		windowCheckInterval = setInterval(() => {
			if (!githubInstallWindow || githubInstallWindow.closed) {
				// 창이 닫혔으면 Installation 목록 새로고침
				clearInterval(windowCheckInterval!);
				windowCheckInterval = null;
				githubInstallWindow = null;
				
				console.log('🔄 GitHub App 창이 닫혔습니다. Installation 목록을 새로고침합니다.');
				loadInstallations();
			}
		}, 500); // 500ms마다 확인
	}
	
	// 컴포넌트 언마운트 시 정리
	$effect(() => {
		return () => {
			if (windowCheckInterval) {
				clearInterval(windowCheckInterval);
				windowCheckInterval = null;
			}
			if (githubInstallWindow && !githubInstallWindow.closed) {
				try {
					githubInstallWindow.close();
				} catch (e) {
					console.log('창 닫기 실패:', e);
				}
				githubInstallWindow = null;
			}
			document.removeEventListener('click', handleClickOutside);
		};
	});
	
	async function handleRefreshRepositories() {
		if (selectedInstallation) {
			await loadRepositoriesForInstallation(selectedInstallation.id);
		} else {
			await loadInstallations();
		}
	}
	
	// 드롭다운 외부 클릭 시 닫기
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		
		// Installation 드롭다운 확인
		if (!target.closest('[data-dropdown="installation"]')) {
			showInstallationDropdown = false;
		}
		
		// Repository 드롭다운 확인
		if (!target.closest('[data-dropdown="repository"]')) {
			showRepositoryDropdown = false;
		}
	}
	
	async function loadRepositories() {
		try {
			loading = true;
			error = '';
			
			const data = await api.functional.github_app.repositories.getUserRepositories(
				makeFetch({ fetch })
			);
			
			// 데이터 검증
			if (!data || !Array.isArray(data)) {
				console.error('Invalid repository data:', data);
				repositories = [];
				hasGithubApp = false;
				error = 'GitHub 저장소 데이터를 불러올 수 없습니다.';
				return;
			}
			
			repositories = data;
			hasGithubApp = true; // API 호출이 성공했으면 GitHub App이 설치되어 있음
			
			if (repositories.length > 0) {
				// 첫 번째 저장소를 자동 선택
				const firstRepo = repositories[0];
				selectedRepository = firstRepo;
				selectedBranch = firstRepo.default_branch || 'main';
				projectConfig.name = firstRepo.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
				projectConfig.description = firstRepo.description || '';
				validateProjectName(projectConfig.name);
			} else {
				// 저장소가 없는 경우 (권한 없음)
				hasGithubApp = true;
				error = 'GitHub App이 설치되어 있지만 접근 가능한 저장소가 없습니다.';
			}
		} catch (err: any) {
			console.error('Error loading repositories:', err);
			
			// 401 에러인 경우 GitHub App이 설치되지 않은 것
			if (err?.status === 401 || err?.message?.includes('401')) {
				hasGithubApp = false;
				error = 'GitHub App 설치가 필요합니다.';
			} else {
				hasGithubApp = false;
				error = 'GitHub 저장소를 불러오는데 실패했습니다.';
			}
			repositories = [];
		} finally {
			loading = false;
		}
	}
	
	async function validateProjectName(name: string) {
		validation.isChecking = true;
		
		// 기본 유효성 검사
		const isValid = name.length >= 3 && name.length <= 50 && /^[a-z0-9-]+$/.test(name);
		
		if (!isValid) {
			validation = {
				isNameValid: false,
				nameError: '프로젝트 이름은 3-50자의 소문자, 숫자, 하이픈만 사용 가능합니다.',
				isChecking: false
			};
		} else {
			validation = {
				isNameValid: true,
				nameError: null,
				isChecking: false
			};
		}
	}
	
	function handleRepositoryChange(repoName: string) {
		const repo = repositories.find(r => r.name === repoName);
		if (repo) {
			selectedRepository = repo;
			selectedBranch = repo.default_branch || 'main';
			projectConfig.name = repo.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
			projectConfig.description = repo.description || '';
			validateProjectName(projectConfig.name);
		}
	}
	
	async function createProject() {
		if (!selectedRepository) return;
		
		isCreating = true;
		error = '';
		
		try {
			const projectData = {
				projectName: projectConfig.name,
				projectDescription: projectConfig.description || undefined,
				githubOwner: selectedRepository.owner.login,
				githubRepositoryName: selectedRepository.name,
				githubRepositoryId: selectedRepository.id.toString(),
				selectedBranch: selectedBranch,
				installationId: selectedInstallation?.id || '',
				// 필수 필드들 - 실제 값으로 교체 필요
				codebuildProjectName: `${projectConfig.name}-build`,
				cloudwatchLogGroup: `/aws/codebuild/${projectConfig.name}`,
				codebuildProjectArn: `arn:aws:codebuild:us-east-1:123456789012:project/${projectConfig.name}-build`
			};
			
			const newProject = await api.functional.projects.createProject(
				makeFetch({ fetch }),
				projectData
			);
			
			createdProjectId = newProject.projectId;
			currentStep = 3; // 완료 단계로 이동
		} catch (err) {
			error = '프로젝트 생성에 실패했습니다.';
			console.error('Error creating project:', err);
		} finally {
			isCreating = false;
		}
	}
	
	function handleNext() {
		if (currentStep === 2) {
			// 2단계에서는 3단계로 이동 (프로젝트 생성은 3단계에서)
			currentStep = 3;
		} else if (currentStep === 1) {
			// 1단계에서는 2단계로 이동
			currentStep = 2;
		}
	}
	
	function handlePrevious() {
		if (currentStep > 1) {
			currentStep--;
		}
	}
	
	function canProceed() {
		switch (currentStep) {
			case 1:
				return selectedRepository !== null && selectedBranch !== '';
			case 2:
				return projectConfig.name.length > 0 && !validation.isChecking && validation.isNameValid;
			case 3:
				return true;
			default:
				return false;
		}
	}
	
	function formatDate(dateString: string) {
		try {
			return new Date(dateString).toLocaleDateString('ko-KR');
		} catch {
			return '날짜 없음';
		}
	}
	


	
	function goToProject() {
		if (createdProjectId) {
			goto(`/projects/${createdProjectId}`);
		}
	}
</script>

<svelte:head>
	<title>프로젝트 생성 마법사 - Otto</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-4xl mx-auto px-4 py-8">
		<!-- Header -->
		<div class="flex items-center justify-between mb-8">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">프로젝트 생성 마법사</h1>
				<p class="text-gray-600 mt-1">
					{#if selectedRepository}
						{selectedRepository.owner.login}/{selectedRepository.name} 저장소로 새 프로젝트를 만듭니다
					{:else}
						GitHub 저장소를 선택하여 새 프로젝트를 만듭니다
					{/if}
				</p>
			</div>
			<button 
				onclick={() => goto('/projects')}
				class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
			>
				<X class="w-6 h-6" />
			</button>
		</div>

		<!-- Progress Indicator -->
		<div class="flex items-center justify-center mb-8">
			<div class="flex items-center space-x-4">
				{#each [1, 2, 3] as step}
					<div class="flex items-center">
						<div class="flex items-center justify-center w-10 h-10 rounded-full {currentStep >= step ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'} font-medium">
							{step}
						</div>
						{#if step < 3}
							<div class="w-16 h-0.5 ml-4 {currentStep > step ? 'bg-purple-600' : 'bg-gray-200'}"></div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Content Card -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
			<!-- Step Content -->
			<div class="p-8">
				<!-- Step 1: Repository Selection -->
				{#if currentStep === 1}
					<div>
						<h2 class="text-xl font-semibold text-gray-900 mb-6">저장소 선택</h2>
						
						{#if loading}
							<div class="flex flex-col items-center justify-center py-12">
								<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
								<p class="text-gray-600">GitHub 저장소를 불러오는 중...</p>
							</div>
						{:else if !hasGithubApp}
							<div class="p-4 bg-red-50 border border-red-200 rounded-lg">
								<div class="flex items-start gap-3">
									<AlertCircle class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
									<div class="flex-1">
										<p class="text-sm font-medium text-red-900">GitHub App 설치 필요</p>
										<p class="text-sm text-red-700 mt-1">
											GitHub 저장소에 접근하려면 GitHub App을 설치해야 합니다.
										</p>
										<button 
											onclick={handleInstallGitHub}
											disabled={isInstallingGitHub}
											class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors disabled:cursor-not-allowed mt-3"
										>
											{#if isInstallingGitHub}
												<Loader2 class="w-4 h-4 animate-spin" />
												설치 중...
											{:else}
												<Github class="w-4 h-4" />
												GitHub App 설치하기
												<ExternalLink class="w-3 h-3" />
											{/if}
										</button>
									</div>
								</div>
							</div>
						{:else}
							<!-- GitHub App 설치 버튼 (항상 표시) -->
							<div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-blue-900">GitHub App 관리</p>
										<p class="text-sm text-blue-700">새로운 저장소에 접근하거나 권한을 업데이트하세요</p>
									</div>
									<div class="flex items-center gap-2">
										<button 
											onclick={handleRefreshRepositories}
											disabled={loading}
											class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:bg-gray-200 disabled:text-gray-500 rounded-lg transition-colors disabled:cursor-not-allowed"
										>
											{#if loading}
												<Loader2 class="w-4 h-4 animate-spin" />
												새로고침 중...
											{:else}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
												</svg>
												새로고침
											{/if}
										</button>
										<button 
											onclick={handleInstallGitHub}
											disabled={isInstallingGitHub}
											class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors disabled:cursor-not-allowed"
										>
											{#if isInstallingGitHub}
												<Loader2 class="w-4 h-4 animate-spin" />
												설치 중...
											{:else}
												<Github class="w-4 h-4" />
												GitHub App 설치/관리
												<ExternalLink class="w-3 h-3" />
											{/if}
										</button>
									</div>
								</div>
							</div>

							<!-- Installation Selection -->
							<div class="mb-6">
								<label class="block text-sm font-medium text-gray-700 mb-2">
									GitHub 계정 선택 <span class="text-red-500">*</span>
								</label>
								<div class="relative" data-dropdown="installation">
									<button
										onclick={() => showInstallationDropdown = !showInstallationDropdown}
										class="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
									>
										<div class="flex items-center gap-3">
											{#if selectedInstallation}
												<img 
													src={selectedInstallation.account.avatar_url} 
													alt={selectedInstallation.account.login}
													class="w-6 h-6 rounded-full"
												/>
												<span class="font-medium text-gray-900">{selectedInstallation.account.login}</span>
												<span class="text-sm text-gray-500">({selectedInstallation.account.type})</span>
											{:else}
												<span class="text-gray-500">계정을 선택하세요</span>
											{/if}
										</div>
										<ChevronDown class="w-5 h-5 text-gray-400" />
									</button>

									{#if showInstallationDropdown}
										<div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
											{#each installations as installation}
												<button
													onclick={() => selectInstallation(installation)}
													class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
												>
													<img 
														src={installation.account.avatar_url} 
														alt={installation.account.login}
														class="w-6 h-6 rounded-full"
													/>
													<div class="flex-1 text-left">
														<div class="font-medium text-gray-900">{installation.account.login}</div>
														<div class="text-sm text-gray-500">{installation.account.type}</div>
													</div>
													{#if selectedInstallation?.id === installation.id}
														<Check class="w-5 h-5 text-purple-600" />
													{/if}
												</button>
											{/each}
										</div>
									{/if}
								</div>
							</div>

							<!-- Repository Selection -->
							{#if selectedInstallation}
								<div class="mb-6">
									<label class="block text-sm font-medium text-gray-700 mb-2">
										저장소 선택 <span class="text-red-500">*</span>
									</label>
									<div class="relative" data-dropdown="repository">
										<button
											onclick={() => showRepositoryDropdown = !showRepositoryDropdown}
											disabled={loadingRepositories}
											class="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
										>
											<div class="flex items-center gap-3">
												{#if loadingRepositories}
													<Loader2 class="w-4 h-4 animate-spin text-gray-400" />
													<span class="text-gray-500">저장소 불러오는 중...</span>
												{:else if selectedRepository}
													<div class="w-4 h-4 flex items-center justify-center">
														{#if selectedRepository.private}
															<Lock class="w-4 h-4 text-amber-500" />
														{:else}
															<Unlock class="w-4 h-4 text-green-500" />
														{/if}
													</div>
													<span class="font-medium text-gray-900">{selectedRepository.full_name}</span>
												{:else}
													<span class="text-gray-500">저장소를 선택하세요</span>
												{/if}
											</div>
											<ChevronDown class="w-5 h-5 text-gray-400" />
										</button>

										{#if showRepositoryDropdown && !loadingRepositories}
											<div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
												{#if repositories.length === 0}
													<div class="px-4 py-6 text-center text-gray-500">
														접근 가능한 저장소가 없습니다
													</div>
												{:else}
													{#each repositories as repository}
														<button
															onclick={() => selectRepository(repository)}
															class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors text-left"
														>
															<div class="w-4 h-4 flex items-center justify-center">
																{#if repository.private}
																	<Lock class="w-4 h-4 text-amber-500" />
																{:else}
																	<Unlock class="w-4 h-4 text-green-500" />
																{/if}
															</div>
															<div class="flex-1">
																<div class="font-medium text-gray-900">{repository.name}</div>
																<div class="text-sm text-gray-500">{repository.full_name}</div>
															</div>
															{#if selectedRepository?.id === repository.id}
																<Check class="w-5 h-5 text-purple-600" />
															{/if}
														</button>
													{/each}
												{/if}
											</div>
										{/if}
									</div>
								</div>
							{/if}

							{#if selectedRepository}
								<!-- Branch Selection -->
								<div class="mt-6 pt-6 border-t border-gray-200">
									<label class="block text-sm font-medium text-gray-700 mb-2">
										브랜치 선택
									</label>
									<div class="flex items-center gap-2">
										<GitBranch class="w-4 h-4 text-gray-400" />
										<select 
											bind:value={selectedBranch}
											class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-w-48"
										>
											{#if branches.length > 0}
												{#each branches as branch}
													<option value={branch.name}>
														{branch.name}
														{#if branch.name === selectedRepository.default_branch}
															(기본)
														{/if}
													</option>
												{/each}
											{:else}
												<option value={selectedRepository.default_branch || 'main'}>
													{selectedRepository.default_branch || 'main'} (기본)
												</option>
											{/if}
										</select>
									</div>
								</div>
							{/if}
						{/if}
					</div>

				<!-- Step 2: Project Configuration -->
				{:else if currentStep === 2}
					<div>
						<h2 class="text-xl font-semibold text-gray-900 mb-6">프로젝트 설정</h2>
						
						<div class="space-y-6">
							<div>
								<label for="project-name" class="block text-sm font-medium text-gray-700 mb-2">
									프로젝트 이름 <span class="text-red-500">*</span>
								</label>
								<input
									id="project-name"
									type="text"
									bind:value={projectConfig.name}
									oninput={() => validateProjectName(projectConfig.name)}
									placeholder="my-awesome-project"
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent {validation.nameError ? 'border-red-500' : ''}"
								/>
								{#if validation.isChecking}
									<p class="text-sm text-gray-500 mt-1">검증 중...</p>
								{:else if validation.nameError}
									<p class="text-sm text-red-600 mt-1">{validation.nameError}</p>
								{:else if validation.isNameValid}
									<p class="text-sm text-green-600 mt-1">사용 가능한 이름입니다.</p>
								{/if}
							</div>

							<div>
								<label for="project-description" class="block text-sm font-medium text-gray-700 mb-2">
									프로젝트 설명
								</label>
								<textarea
									id="project-description"
									bind:value={projectConfig.description}
									placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
									rows="3"
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
								></textarea>
							</div>

							{#if selectedRepository}
								<div class="bg-gray-50 rounded-lg p-4">
									<h3 class="text-sm font-medium text-gray-900 mb-3">저장소 정보</h3>
									<div class="space-y-2 text-sm">
										<div class="flex justify-between">
											<span class="text-gray-600">저장소:</span>
											<span class="font-medium">{selectedRepository.owner.login}/{selectedRepository.name}</span>
										</div>
										<div class="flex justify-between">
											<span class="text-gray-600">브랜치:</span>
											<span class="font-medium">{selectedBranch}</span>
										</div>
										<div class="flex justify-between">
											<span class="text-gray-600">공개 여부:</span>
											<span class="font-medium">{selectedRepository.private ? '비공개' : '공개'}</span>
										</div>
									</div>
								</div>
							{/if}
						</div>
					</div>

				<!-- Step 3: Summary and Create -->
				{:else if currentStep === 3}
					<div>
						{#if createdProjectId}
							<div class="text-center py-12">
								<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
									<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
									</svg>
								</div>
								<h3 class="text-xl font-semibold text-gray-900 mb-2">프로젝트가 생성되었습니다!</h3>
								<p class="text-gray-600 mb-6">
									<strong>{projectConfig.name}</strong> 프로젝트가 성공적으로 생성되었습니다.
								</p>
								<button 
									onclick={goToProject}
									class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
								>
									프로젝트로 이동
								</button>
							</div>
						{:else}
							<div>
								<h2 class="text-xl font-semibold text-gray-900 mb-6">프로젝트 생성 확인</h2>
								
								{#if error}
									<div class="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
										<p class="text-sm text-red-600">{error}</p>
									</div>
								{/if}

								<div class="bg-gray-50 rounded-lg p-6">
									<h3 class="text-lg font-medium text-gray-900 mb-4">프로젝트 요약</h3>
									<div class="space-y-3">
										<div class="flex justify-between">
											<span class="text-gray-600">프로젝트 이름:</span>
											<span class="font-medium">{projectConfig.name}</span>
										</div>
										{#if projectConfig.description}
											<div class="flex justify-between">
												<span class="text-gray-600">설명:</span>
												<span class="font-medium">{projectConfig.description}</span>
											</div>
										{/if}
										{#if selectedRepository}
											<div class="flex justify-between">
												<span class="text-gray-600">저장소:</span>
												<span class="font-medium">{selectedRepository.owner.login}/{selectedRepository.name}</span>
											</div>
											<div class="flex justify-between">
												<span class="text-gray-600">브랜치:</span>
												<span class="font-medium">{selectedBranch}</span>
											</div>
											<div class="flex justify-between">
												<span class="text-gray-600">공개 여부:</span>
												<span class="font-medium">{selectedRepository.private ? '비공개' : '공개'}</span>
											</div>
										{/if}
									</div>
								</div>

								<div class="mt-6 text-center">
									<button 
										onclick={createProject}
										disabled={isCreating}
										class="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
									>
										{#if isCreating}
											<div class="flex items-center gap-2">
												<Loader2 class="w-4 h-4 animate-spin" />
												프로젝트 생성 중...
											</div>
										{:else}
											프로젝트 생성하기
										{/if}
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer Navigation -->
			{#if !createdProjectId}
				<div class="flex items-center justify-between px-8 py-4 border-t border-gray-200 bg-gray-50">
					<button
						onclick={handlePrevious}
						disabled={currentStep === 1}
						class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors {currentStep === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'}"
					>
						<ChevronLeft class="w-4 h-4" />
						이전
					</button>

					<div class="text-sm text-gray-500">
						{currentStep} / 3 단계
					</div>

					{#if currentStep < 3}
						<button
							onclick={handleNext}
							disabled={!canProceed()}
							class="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors {canProceed() ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}"
						>
							다음
							<ChevronRight class="w-4 h-4" />
						</button>
					{:else}
						<div class="w-24"></div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>