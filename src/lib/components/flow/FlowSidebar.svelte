<script lang="ts">
  import {
    CICDBlockType,
    CICDBlockGroup,
    CICD_GROUP_COLORS,
    CICD_BLOCK_CONFIGS,
    type AnyCICDNodeData as _AnyCICDNodeData
  } from '$lib/types/flow-node.types';

  interface Props {
    onAddNode: (blockType: CICDBlockType, position: { x: number; y: number }) => void;
  }

  const { onAddNode: _onAddNode }: Props = $props();

  let isDragging = $state(false);
  let dragBlockType = $state<CICDBlockType | null>(null);

  // 그룹별 블록 분류 (START 그룹 제외)
  const blocksByGroup: Record<CICDBlockGroup, CICDBlockType[]> = {
    [CICDBlockGroup.START]: [], // 사용하지 않지만 타입 호환성을 위해 유지
    [CICDBlockGroup.PREBUILD]: [
      CICDBlockType.OS_PACKAGE,
      CICDBlockType.NODE_VERSION,
      CICDBlockType.ENVIRONMENT_SETUP
    ],
    [CICDBlockGroup.BUILD]: [
      CICDBlockType.INSTALL_MODULE_NODE,
      CICDBlockType.BUILD_WEBPACK,
      CICDBlockType.BUILD_VITE,
      CICDBlockType.BUILD_CUSTOM
    ],
    [CICDBlockGroup.TEST]: [
      CICDBlockType.TEST_JEST,
      CICDBlockType.TEST_MOCHA,
      CICDBlockType.TEST_VITEST,
      // CICDBlockType.TEST_PLAYWRIGHT,
      CICDBlockType.TEST_CUSTOM
    ],
    [CICDBlockGroup.DEPLOY]: [CICDBlockType.DEPLOY],
    [CICDBlockGroup.NOTIFICATION]: [
      CICDBlockType.NOTIFICATION_SLACK,
      CICDBlockType.NOTIFICATION_EMAIL
    ],
    [CICDBlockGroup.UTILITY]: [
      /*			CICDBlockType.CONDITION_BRANCH,
			CICDBlockType.PARALLEL_EXECUTION,*/
      CICDBlockType.CUSTOM_COMMAND
    ]
  };

  // 그룹 표시 순서
  const groupOrder = [
    CICDBlockGroup.PREBUILD,
    CICDBlockGroup.BUILD,
    CICDBlockGroup.TEST,
    CICDBlockGroup.DEPLOY,
    CICDBlockGroup.NOTIFICATION,
    CICDBlockGroup.UTILITY
  ];

  // 그룹 한글 이름
  const groupNames: Record<CICDBlockGroup, string> = {
    [CICDBlockGroup.START]: '시작', // 타입 호환성을 위해 유지
    [CICDBlockGroup.PREBUILD]: '사전 빌드',
    [CICDBlockGroup.BUILD]: '빌드',
    [CICDBlockGroup.TEST]: '테스트',
    [CICDBlockGroup.DEPLOY]: '배포',
    [CICDBlockGroup.NOTIFICATION]: '알림',
    [CICDBlockGroup.UTILITY]: '유틸리티'
  };

  function handleDragStart(event: DragEvent, blockType: CICDBlockType) {
    if (!event.dataTransfer) return;

    isDragging = true;
    dragBlockType = blockType;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/reactflow', blockType);
    event.dataTransfer.setData('text/plain', blockType);
  }

  function handleDragEnd() {
    isDragging = false;
    dragBlockType = null;
  }

  function handleClick(_blockType: CICDBlockType) {
    // 드래그 중이면 클릭 무시
    /*if (isDragging) return;

		// 클릭 시 랜덤 위치에 노드 추가
		const position = {
			x: Math.random() * 300 + 100,
			y: Math.random() * 300 + 100
		};
		onAddNode(_blockType, position);*/
  }
</script>

<div class="flex h-full w-80 flex-col overflow-hidden border-r border-gray-200 bg-white">
  <!-- 헤더 -->
  <div class="border-b border-gray-200 p-4">
    <h2 class="text-lg font-semibold text-gray-900">블록 팔레트</h2>
    <p class="mt-1 text-sm text-gray-600">드래그하거나 클릭해서 블록을 추가하세요</p>
  </div>

  <!-- 블록 목록 -->
  <div class="flex-1 space-y-6 overflow-y-auto p-4">
    {#each groupOrder as group (group)}
      {@const groupColor = CICD_GROUP_COLORS[group]}
      {@const blocks = blocksByGroup[group]}

      {#if blocks.length > 0}
        <div class="space-y-3">
          <!-- 그룹 헤더 -->
          <div class="flex items-center gap-2">
            <div class="h-3 w-3 rounded {groupColor.colorClass}"></div>
            <h3 class="text-sm font-medium text-gray-900">
              {groupNames[group]}
            </h3>
          </div>

          <!-- 블록 목록 -->
          <div class="space-y-2">
            {#each blocks as blockType (blockType)}
              {@const config = CICD_BLOCK_CONFIGS[blockType]}

              <div
                role="button"
                tabindex="0"
                draggable="true"
                ondragstart={(e) => handleDragStart(e, blockType)}
                ondragend={handleDragEnd}
                onclick={() => handleClick(blockType)}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick(blockType);
                  }
                }}
                class="flex cursor-grab items-center gap-3 rounded-lg border border-gray-200 p-3 transition-all hover:border-gray-300 hover:shadow-sm active:cursor-grabbing {groupColor.bgClass} hover:bg-white"
                class:opacity-50={isDragging && dragBlockType === blockType}
              >
                <div
                  class="h-8 w-8 flex-shrink-0 {groupColor.colorClass} flex items-center justify-center rounded-lg text-white"
                >
                  {#if config.icon}
                    {@const Icon = config.icon}
                    <Icon class="h-5 w-5" />
                  {/if}
                </div>

                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-medium text-gray-900">
                    {config.label}
                  </div>
                  <div class="mt-0.5 text-xs text-gray-500">
                    {group}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>

  <!-- 도움말 -->
  <div class="border-t border-gray-200 bg-gray-50 p-4">
    <div class="space-y-1 text-xs text-gray-600">
      <p><strong>드래그:</strong> 캔버스로 드래그해서 추가</p>
    </div>
  </div>
</div>
