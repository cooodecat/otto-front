<script lang="ts">
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
	<div class="max-w-md w-full space-y-8">
		<div class="text-center">
			{#if data.error}
				<div class="space-y-4">
					<div class="text-red-600">
						<svg class="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-gray-900">로그인 실패</h2>
					<p class="text-gray-600">{data.error}</p>
					<button 
						onclick={() => window.location.href = '/'}
						class="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						홈으로 돌아가기
					</button>
				</div>
			{:else}
				<div class="space-y-4">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
					<h2 class="text-xl font-semibold text-gray-900">로그인 처리 중...</h2>
					<p class="text-gray-600">잠시만 기다려주세요.</p>
				</div>
			{/if}
		</div>
	</div>
</div>