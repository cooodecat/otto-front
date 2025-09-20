<script lang="ts">
  import { page } from '$app/stores';

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
      pathname === '/projects/new' || pathname === '/projects' || pathname.includes('/pipelines')
    );
  }

  let isCanvasLayout = $derived(isCanvasLayoutPath($page.url.pathname));
  let isFullWidth = $derived(isFullWidthLayoutPath($page.url.pathname));
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
