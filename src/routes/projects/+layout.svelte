<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';

  let { children } = $props();

  // Canvas layout paths (like Next.js pattern from otto-ui)
  function isCanvasLayoutPath(pathname: string): boolean {
    if (pathname === '/pipelines') return true;
    const pipelineDetailPattern = /^\/projects\/[^/]+\/pipelines\/[^/]+$/;
    return pipelineDetailPattern.test(pathname);
  }

  // Full-width layout paths (no sidebar)
  function isFullWidthLayoutPath(pathname: string): boolean {
    return (
      pathname === '/projects/new' || 
      pathname === '/projects' || 
      pathname.includes('/pipelines') ||
      pathname.includes('/logs')
    );
  }

  let isCanvasLayout = $derived(isCanvasLayoutPath($page.url.pathname));
  let isFullWidth = $derived(isFullWidthLayoutPath($page.url.pathname));

  // Focus/visibility 이벤트에서 인증 상태 재확인
  onMount(() => {
    let isCheckingAuth = false;
    let lastCheckTime = Date.now();

    const checkAuthOnFocus = async () => {
      // 중복 호출 방지
      if (isCheckingAuth) return;

      // 마지막 체크로부터 5초 이내면 스킵 (너무 자주 체크하지 않음)
      const now = Date.now();
      if (now - lastCheckTime < 5000) return;

      try {
        isCheckingAuth = true;
        lastCheckTime = now;

        // 페이지 데이터를 다시 로드하여 서버에서 인증 확인
        // invalidateAll은 모든 load 함수를 다시 실행
        await invalidateAll();
      } catch (error) {
        // 인증 실패 시 +layout.server.ts에서 자동으로 리다이렉트 처리
        console.error('Auth check failed:', error);
      } finally {
        isCheckingAuth = false;
      }
    };

    // 탭이 다시 활성화될 때 인증 확인
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 탭이 10초 이상 백그라운드에 있었던 경우에만 체크
        const hiddenTime = Date.now() - lastCheckTime;
        if (hiddenTime > 10000) {
          checkAuthOnFocus();
        }
      }
    };

    // 윈도우가 포커스를 받을 때 인증 확인
    const handleFocus = () => {
      checkAuthOnFocus();
    };

    // 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  });
</script>

{#if isCanvasLayout}
  <div class="relative min-h-screen">
    <!-- GlobalSidebar equivalent - to be implemented -->
    <div class="global-sidebar">
      <!-- Sidebar content -->
    </div>
    <main class="min-h-screen">
      {@render children()}
    </main>
  </div>
{:else if isFullWidth}
  <!-- Full-width layout for project creation and other special pages -->
  <main class="min-h-screen">
    {@render children()}
  </main>
{:else}
  <div class="flex min-h-screen bg-gray-50">
    <div class="w-80 flex-shrink-0">
      <div class="p-4">
        <!-- GlobalSidebar equivalent -->
        <div class="sidebar">
          <!-- Sidebar content -->
        </div>
      </div>
    </div>
    <main class="min-h-screen flex-1">
      {@render children()}
    </main>
  </div>
{/if}

<style>
  .global-sidebar {
    /* Add your sidebar styles here */
    position: fixed;
    left: 0;
    top: 0;
    z-index: 10;
  }

  .sidebar {
    /* Sidebar styles will be added here when needed */
    min-height: 100vh;
  }
</style>
