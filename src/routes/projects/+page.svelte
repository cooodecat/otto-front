<script lang="ts">

	import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';



</script>

<svelte:head>
	<title>Projects - Otto</title>
</svelte:head>


	<div class="min-h-screen bg-gray-50">
		<header class="bg-white shadow">
			<div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
				<h1 class="text-3xl font-bold text-gray-900">프로젝트</h1>
			</div>
		</header>

		<main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
			<div class="px-4 py-6 sm:px-0">
				<div class="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
					<div class="text-center">
						<h2 class="text-xl font-semibold text-gray-900 mb-4">환영합니다!</h2>
						<p class="text-gray-600">프로젝트 관리 기능이 곧 추가될 예정입니다.</p>
						<button 
							onclick={() => goto(resolve('/'))}
							class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							홈으로 돌아가기
						</button>
					</div>
				</div>
			</div>
		</main>
	</div>
