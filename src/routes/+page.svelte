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

<div class="min-h-screen bg-black text-white">
  <!-- Container with min-height instead of fixed height -->
  <div class="relative flex min-h-screen flex-col">
    <!-- Background Effects -->
    <div class="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-black to-black"></div>
    <div
      class="fixed inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]"
    ></div>

    <!-- Header -->
    <AnimatedSection direction="down" class="relative z-50 w-full">
      <header class="w-full">
        <div class="container mx-auto max-w-7xl px-4 py-3 sm:py-4">
          <div class="flex items-center justify-between py-2 sm:py-3">
            <div class="flex items-center space-x-3">
              <div
                class="rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-2 sm:p-2.5 shadow-lg shadow-purple-500/25 ring-2 ring-white/10"
              >
                <Cpu class="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <span
                class="bg-gradient-to-r from-white to-purple-400 bg-clip-text text-lg font-black tracking-tight text-transparent sm:text-xl md:text-2xl"
              >
                Otto
              </span>
            </div>
          </div>
        </div>
      </header>
    </AnimatedSection>

    <!-- Main Content - Flexible height with padding -->
    <main class="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-12 md:py-16">
    <div class="mx-auto max-w-4xl text-center">
      <!-- Title with responsive sizing -->
      <AnimatedSection delay={50}>
        <h1 class="mb-3 text-3xl font-black tracking-tight sm:mb-4 sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
          <span
            class="bg-gradient-to-r from-purple-400 via-purple-500 to-indigo-500 bg-clip-text text-transparent"
          >
            CI/CD 파이프라인
          </span>
          <br />
          <span class="text-white">블록으로 해결하다</span>
        </h1>
      </AnimatedSection>

      <!-- Description with better spacing -->
      <AnimatedSection delay={100}>
        <p
          class="mx-auto mb-4 max-w-3xl text-base leading-relaxed text-gray-400 sm:mb-6 sm:text-lg md:text-xl lg:text-2xl"
        >
          답답한 타이핑에서 벗어나세요.
          <br class="hidden sm:block" />
          여러분만의 CI/CD 파이프라인을 구상하세요.
        </p>
      </AnimatedSection>

      <!-- CI/CD Flow Visualization - More responsive sizing -->
      <AnimatedSection delay={150} class="mb-4 sm:mb-6 md:mb-8">
        <div class="mx-auto w-full max-w-3xl">
          <div class="scale-[0.6] transform-gpu xs:scale-[0.7] sm:scale-[0.8] md:scale-90 lg:scale-100">
            <CICDFlowVisualization />
          </div>
        </div>
      </AnimatedSection>

      <!-- CTA Button with adjusted sizing -->
      <AnimatedSection class="mt-4 sm:mt-6 lg:mt-8">
        <div class="group relative inline-block">
          <div
            class="absolute -inset-1 animate-pulse rounded-2xl bg-gradient-to-r from-purple-500 to-purple-700 opacity-50 blur-lg transition duration-1000 group-hover:opacity-100 group-hover:duration-200"
          ></div>
          <button
            onclick={handleGetStarted}
            disabled={isLoading}
            class="group relative inline-flex transform cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-2.5 text-base font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-purple-700 hover:to-purple-800 hover:shadow-purple-500/25 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-3 sm:px-8 sm:py-4 sm:text-lg md:px-10 md:py-5 md:text-xl"
          >
            {#if isLoading}
              <div
                class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent sm:h-5 sm:w-5 md:h-6 md:w-6"
              ></div>
              로딩 중...
            {:else}
              <Zap class="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              지금 시작하기
              <ArrowRight
                class="h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5 md:h-6 md:w-6"
              />
            {/if}
          </button>
        </div>
      </AnimatedSection>
    </div>
    </main>

    <!-- Simple Footer with proper spacing -->
    <AnimatedSection delay={400} direction="up" class="relative z-10">
      <footer class="py-3 text-center text-xs text-gray-600 sm:py-4 sm:text-sm md:py-6">
        <p>&copy; 2025 Otto. All rights reserved.</p>
      </footer>
    </AnimatedSection>
  </div>
</div>
