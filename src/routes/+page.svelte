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

<div class="flex h-screen flex-col overflow-hidden bg-black text-white">
  <!-- Background Effects -->
  <div class="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-black to-black"></div>
  <div
    class="fixed inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]"
  ></div>

  <!-- Header -->
  <AnimatedSection direction="down" class="relative z-50 w-full flex-shrink-0">
    <header class="w-full">
      <div class="container mx-auto max-w-7xl px-4 py-4">
        <div class="flex items-center justify-between py-3">
          <div class="flex items-center space-x-3">
            <div
              class="rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-2.5 shadow-lg shadow-purple-500/25 ring-2 ring-white/10"
            >
              <Cpu class="h-6 w-6 text-white" />
            </div>
            <span
              class="bg-gradient-to-r from-white to-purple-400 bg-clip-text text-xl font-black tracking-tight text-transparent sm:text-2xl"
            >
              Otto
            </span>
          </div>
        </div>
      </div>
    </header>
  </AnimatedSection>

  <!-- Main Content - Centered -->
  <main class="relative z-10 flex flex-1 items-center justify-center overflow-hidden px-4 sm:px-8">
    <div class="mx-auto max-w-4xl text-center">
      <!-- Title -->
      <AnimatedSection delay={50}>
        <h1 class="mb-4 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
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
        <p
          class="mx-auto mb-6 max-w-3xl text-lg leading-relaxed text-gray-400 sm:text-xl md:text-2xl"
        >
          답답한 타이핑에서 벗어나세요.
          <br class="hidden sm:block" />
          여러분만의 CI/CD 파이프라인을 구상하세요.
        </p>
      </AnimatedSection>

      <!-- CI/CD Flow Visualization - Responsive sizing -->
      <AnimatedSection delay={150} class="mb-6 sm:mb-8">
        <div class="scale-75 transform-gpu sm:scale-90 md:scale-100">
          <CICDFlowVisualization />
        </div>
      </AnimatedSection>

      <!-- CTA Button -->
      <AnimatedSection class="mt-4 sm:mt-8">
        <div class="group relative inline-block">
          <div
            class="absolute -inset-1 animate-pulse rounded-2xl bg-gradient-to-r from-purple-500 to-purple-700 opacity-50 blur-lg transition duration-1000 group-hover:opacity-100 group-hover:duration-200"
          ></div>
          <button
            onclick={handleGetStarted}
            disabled={isLoading}
            class="group relative inline-flex transform cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-lg font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-purple-700 hover:to-purple-800 hover:shadow-purple-500/25 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-3 sm:px-10 sm:py-5 sm:text-xl"
          >
            {#if isLoading}
              <div
                class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent sm:h-6 sm:w-6"
              ></div>
              로딩 중...
            {:else}
              <Zap class="h-5 w-5 sm:h-6 sm:w-6" />
              지금 시작하기
              <ArrowRight
                class="h-5 w-5 transition-transform group-hover:translate-x-1 sm:h-6 sm:w-6"
              />
            {/if}
          </button>
        </div>
      </AnimatedSection>
    </div>
  </main>

  <!-- Simple Footer -->
  <AnimatedSection delay={400} direction="up" class="relative z-10 flex-shrink-0">
    <footer class="py-3 text-center text-xs text-gray-600 sm:py-4 sm:text-sm">
      <p>&copy; 2025 Otto. All rights reserved.</p>
    </footer>
  </AnimatedSection>
</div>
