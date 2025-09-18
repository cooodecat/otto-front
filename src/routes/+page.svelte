<script lang="ts">
  import { Cpu, Zap, ArrowRight } from 'lucide-svelte';
  import AnimatedSection from '$lib/components/ui/AnimatedSection.svelte';
  import CICDFlowVisualization from '$lib/components/landing/CICDFlowVisualization.svelte';
  import { goto } from '$app/navigation';
  import {resolve} from "$app/paths";

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
  <meta name="description" content="답답한 타이핑에서 벗어나세요. 여러분만의 CI/CD 파이프라인을 구상하세요." />
</svelte:head>

<div class="min-h-screen bg-black text-white flex flex-col">
  <!-- Background Effects -->
  <div class="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-black to-black"></div>
  <div class="fixed inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]"></div>

  <!-- Header -->
  <AnimatedSection direction="down" class="relative z-50 w-full">
    <header class="w-full">
      <div class="container px-4 py-8 mx-auto max-w-7xl">
        <div class="flex items-center justify-between py-6">
          <div class="flex items-center space-x-3">
            <div class="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-3 rounded-2xl shadow-lg shadow-purple-500/25 ring-2 ring-white/10">
              <Cpu class="w-7 h-7 text-white" />
            </div>
            <span class="text-2xl font-black bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent tracking-tight">
              Otto
            </span>
          </div>
        </div>
      </div>
    </header>
  </AnimatedSection>

  <!-- Main Content - Centered -->
  <main class="relative z-10 flex-1 flex items-center justify-center px-8">
    <div class="text-center max-w-4xl mx-auto">
      <!-- Title -->
      <AnimatedSection delay={50}>
        <h1 class="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 tracking-tight">
          <span class="bg-gradient-to-r from-purple-400 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
            CI/CD 파이프라인
          </span>
          <br />
          <span class="text-white">블록으로 해결하다</span>
        </h1>
      </AnimatedSection>

      <!-- Description -->
      <AnimatedSection delay={100}>
        <p class="text-xl sm:text-2xl text-gray-400 mb-12 leading-relaxed max-w-3xl mx-auto">
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
        <div class="relative inline-block group">
          <div class="absolute -inset-1 bg-gradient-to-r from-purple-500 to-purple-700 rounded-2xl blur-lg opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
          <button
            onclick={handleGetStarted}
            disabled={isLoading}
            class="relative inline-flex group bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-10 py-5 rounded-2xl font-semibold text-xl transition-all duration-300 shadow-2xl hover:shadow-purple-500/25 items-center gap-3 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {#if isLoading}
              <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              로딩 중...
            {:else}
              <Zap class="w-6 h-6" />
              지금 시작하기
              <ArrowRight class="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            {/if}
          </button>
        </div>
      </AnimatedSection>
    </div>
  </main>

  <!-- Simple Footer -->
  <AnimatedSection delay={400} direction="up" class="relative z-10">
    <footer class="py-6 text-center text-gray-600 text-sm">
      <p>&copy; 2025 Otto. All rights reserved.</p>
    </footer>
  </AnimatedSection>
</div>
