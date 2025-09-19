<script lang="ts">
	import { Cpu, Zap, ArrowRight } from 'lucide-svelte';
	import AnimatedSection from '$lib/components/ui/AnimatedSection.svelte';
	import CICDFlowVisualization from '$lib/components/landing/CICDFlowVisualization.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let isLoading = $state(false);

	const handleGetStarted = async () => {
		isLoading = true;
		try {
			// /auth로 이동하여 토큰 체크 후 처리
			goto(resolve('/auth'));
		} catch (error) {
			console.error('Failed to get started:', error);
		} finally {
			isLoading = false;
		}
	};
</script>

<svelte:head>
	<title>Otto - CI/CD 파이프라인을 블록으로 해결하다</title>
	<meta
		name="description"
		content="답답한 타이핑에서 벗어나세요. 여러분만의 CI/CD 파이프라인을 구상하세요."
	/>
</svelte:head>

<div class="flex min-h-screen flex-col bg-black text-white">
	<!-- Background Effects -->
	<div class="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-black to-black"></div>
	<div
		class="fixed inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]"
	></div>

	<!-- Header -->
	<AnimatedSection direction="down" class="relative z-50 w-full">
		<header class="w-full">
			<div class="container mx-auto max-w-7xl px-4 py-8">
				<div class="flex items-center justify-between py-6">
					<div class="flex items-center space-x-3">
						<div
							class="rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-3 shadow-lg ring-2 shadow-purple-500/25 ring-white/10"
						>
							<Cpu class="h-7 w-7 text-white" />
						</div>
						<span
							class="bg-gradient-to-r from-white to-purple-400 bg-clip-text text-2xl font-black tracking-tight text-transparent"
						>
							Otto
						</span>
					</div>
				</div>
			</div>
		</header>
	</AnimatedSection>

	<!-- Main Content - Centered -->
	<main class="relative z-10 flex flex-1 items-center justify-center px-8">
		<div class="mx-auto max-w-4xl text-center">
			<!-- Title -->
			<AnimatedSection delay={50}>
				<h1 class="mb-6 text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
					<span
						class="bg-gradient-to-r from-purple-400 via-purple-500 to-indigo-500 bg-clip-text text-transparent"
					>
						CI/CD 파이프라인
					</span>
					<br />
					<span class="text-white">블록으로 해결하다</span>
				</h1>
			</AnimatedSection>

			<!-- Description -->
			<AnimatedSection delay={100}>
				<p class="mx-auto mb-12 max-w-3xl text-xl leading-relaxed text-gray-400 sm:text-2xl">
					답답한 타이핑에서 벗어나세요.
					<br class="hidden sm:block" />
					여러분만의 CI/CD 파이프라인을 구상하세요.
				</p>
			</AnimatedSection>

			<!-- CI/CD Flow Visualization -->
			<AnimatedSection delay={150}>
				<CICDFlowVisualization />
			</AnimatedSection>

			<!-- CTA Button -->
			<AnimatedSection delay={200} class="mt-16">
				<div class="group relative inline-block">
					<div
						class="absolute -inset-1 animate-pulse rounded-2xl bg-gradient-to-r from-purple-500 to-purple-700 opacity-50 blur-lg transition duration-1000 group-hover:opacity-100 group-hover:duration-200"
					></div>
					<button
						onclick={handleGetStarted}
						disabled={isLoading}
						class="group relative inline-flex transform cursor-pointer items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 px-10 py-5 text-xl font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-purple-700 hover:to-purple-800 hover:shadow-purple-500/25 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isLoading}
							<div
								class="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"
							></div>
							로딩 중...
						{:else}
							<Zap class="h-6 w-6" />
							지금 시작하기
							<ArrowRight class="h-6 w-6 transition-transform group-hover:translate-x-1" />
						{/if}
					</button>
				</div>
			</AnimatedSection>
		</div>
	</main>

	<!-- Simple Footer -->
	<AnimatedSection delay={400} direction="up" class="relative z-10">
		<footer class="py-6 text-center text-sm text-gray-600">
			<p>&copy; 2025 Otto. All rights reserved.</p>
		</footer>
	</AnimatedSection>
</div>
