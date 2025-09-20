<script lang="ts">
	import { Package, Edit3 } from 'lucide-svelte';
	import BaseNode from '../BaseNode.svelte';
	import { CICD_GROUP_COLORS, CICDBlockGroup } from '$lib/types/flow-node.types';
	import type { OSPackageNodeData } from '$lib/types/flow-node.types';
	import { getContext } from 'svelte';
	interface Props {
		id: string;
		data: OSPackageNodeData;
	}

	const { data, id }: Props = $props();
	const groupColor = CICD_GROUP_COLORS[CICDBlockGroup.PREBUILD];

	// 노드 데이터 업데이트 핸들러 가져오기
	const updateNodeData = getContext<((nodeId: string, newData: any) => void) | undefined>(
		'updateNodeData'
	);

	let isEditing = $state(false);
	let packages = $state<string[]>(data.installPackages || []);
	let packageManager = $state(data.packageManager || 'apt');
	let updateList = $state<boolean>(data.updatePackageList ?? true);
	let newPackage = $state('');

	// 데이터 저장 헬퍼 함수
	function saveNodeData() {
		if (updateNodeData) {
			updateNodeData(id, {
				installPackages: packages,
				packageManager,
				updatePackageList: updateList
			});
		}
	}

	function handleAddPackage() {
		if (newPackage.trim() && !packages.includes(newPackage.trim())) {
			packages = [...packages, newPackage.trim()];
			newPackage = '';
			// 저장
			saveNodeData();
		}
	}

	function handleRemovePackage(index: number) {
		packages = packages.filter((_, i) => i !== index);
		// 저장
		saveNodeData();
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleAddPackage();
		}
	}

	const updatedData = $derived({
		...data,
		installPackages: packages,
		packageManager: packageManager,
		updatePackageList: updateList
	});
</script>

<BaseNode
	data={updatedData}
	{id}
	colorClass={groupColor.colorClass}
	icon={Package}
	minWidth={280}
	deletable={true}
	showOutput={true}
>
	<div class="space-y-3">
		<!-- 기본 정보 -->
		<div class="rounded border {groupColor.borderClass} {groupColor.bgClass} p-3">
			<div class="mb-2 flex items-center justify-between">
				<div class="text-sm font-medium {groupColor.textClass}">
					{packageManager} ({packages.length} packages)
				</div>
				<button
					onclick={() => (isEditing = !isEditing)}
					class="rounded p-1 hover:bg-gray-100"
					title="편집"
				>
					<Edit3 size={14} class="text-gray-500" />
				</button>
			</div>

			<!-- 패키지 목록 미리보기 -->
			{#if !isEditing}
				<div class="space-y-1">
					{#each packages.slice(0, 3) as pkg, _idx}
						<div class="rounded bg-white px-2 py-1 font-mono text-xs text-gray-600">
							{pkg}
						</div>
					{/each}
					{#if packages.length > 3}
						<div class="text-xs italic text-gray-500">
							+{packages.length - 3} more packages...
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- 편집 모드 -->
		{#if isEditing}
			<div class="space-y-3 rounded border bg-gray-50 p-3">
				<!-- 패키지 매니저 선택 -->
				<div>
					<label for="pm-select-{id}" class="mb-1 block text-sm font-medium text-gray-700">
						Package Manager
					</label>
					<select
						id="pm-select-{id}"
						bind:value={packageManager}
						onchange={saveNodeData}
						class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="apt">apt (Ubuntu/Debian)</option>
						<option value="yum">yum (CentOS/RHEL)</option>
						<option value="dnf">dnf (Fedora)</option>
						<option value="apk">apk (Alpine)</option>
						<option value="brew">brew (macOS)</option>
						<option value="pacman">pacman (Arch)</option>
					</select>
				</div>

				<!-- 업데이트 리스트 토글 -->
				<div>
					<label for="update-pkg-{id}" class="mb-1 block text-sm font-medium text-gray-700">
						Update package list
					</label>
					<div class="flex items-center gap-2">
						<input
							id="update-pkg-{id}"
							type="checkbox"
							bind:checked={updateList}
							onchange={saveNodeData}
						/>
						<span class="text-sm text-gray-600">
							{updateList ? 'Yes' : 'No'}
						</span>
					</div>
				</div>

				<!-- 패키지 추가 -->
				<div>
					<label for="add-pkg-{id}" class="mb-1 block text-sm font-medium text-gray-700">
						Add Package
					</label>
					<div class="flex gap-2">
						<input
							id="add-pkg-{id}"
							type="text"
							bind:value={newPackage}
							onkeypress={handleKeyPress}
							placeholder="Enter package name"
							class="flex-1 rounded border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						<button
							onclick={handleAddPackage}
							class="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							Add
						</button>
					</div>
				</div>

				<!-- 패키지 목록 -->
				<div>
					<span class="mb-1 block text-sm font-medium text-gray-700">
						Packages ({packages.length})
					</span>
					<div class="max-h-32 space-y-1 overflow-y-auto">
						{#each packages as pkg, idx}
							<div class="flex items-center justify-between rounded border bg-white px-2 py-1">
								<span class="font-mono text-sm text-gray-700">
									{pkg}
								</span>
								<button
									onclick={() => handleRemovePackage(idx)}
									class="text-xs text-red-500 hover:text-red-700"
								>
									✕
								</button>
							</div>
						{/each}
						{#if packages.length === 0}
							<div class="py-2 text-center text-sm italic text-gray-500">No packages added</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- 설정 옵션 -->
		<div class="text-xs text-gray-500">
			<div>Update package list: {updateList ? 'Yes' : 'No'}</div>
		</div>
	</div>
</BaseNode>
