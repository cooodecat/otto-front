<script lang="ts">
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
  <div class="w-full max-w-md space-y-8">
    <div class="text-center">
      {#if data.error}
        <div class="space-y-4">
          <div class="text-red-600">
            <svg class="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-gray-900">로그인 실패</h2>
          <p class="text-gray-600">{data.error}</p>
          {#if 'details' in data && data.details}
            <details class="mt-2">
              <summary class="cursor-pointer text-sm text-gray-500">상세 정보</summary>
              <pre class="mt-2 max-h-40 overflow-auto text-xs text-gray-400">{data.details}</pre>
            </details>
          {/if}
          <button
            onclick={() => (window.location.href = '/')}
            class="mt-4 flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          >
            홈으로 돌아가기
          </button>
        </div>
      {:else}
        <div class="space-y-4">
          <div class="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <h2 class="text-xl font-semibold text-gray-900">로그인 처리 중...</h2>
          <p class="text-gray-600">잠시만 기다려주세요.</p>
        </div>
      {/if}
    </div>
  </div>
</div>
