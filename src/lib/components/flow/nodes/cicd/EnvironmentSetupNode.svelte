<script lang="ts">
  import { Settings, Plus, X, Eye, EyeOff } from 'lucide-svelte';
  import BaseNode from '../BaseNode.svelte';
  import { CICD_GROUP_COLORS, CICDBlockGroup } from '$lib/types/flow-node.types';
  import type { EnvironmentSetupNodeData } from '$lib/types/flow-node.types';
  import { getContext } from 'svelte';
  interface Props {
    id: string;
    data: EnvironmentSetupNodeData;
  }

  const { data, id }: Props = $props();
  const groupColor = CICD_GROUP_COLORS[CICDBlockGroup.PREBUILD];

  // 노드 데이터 업데이트 핸들러 가져오기
  const updateNodeData = getContext<
    ((nodeId: string, newData: EnvironmentSetupNodeData) => void) | undefined
  >('updateNodeData');

  let isEditing = $state(false);
  let environmentVariables = $state(data.environmentVariables || {});
  let loadFromFile = $state(data.loadFromFile || '');
  let newKey = $state('');
  let newValue = $state('');
  let hiddenValues = $derived(new Set(Object.keys(environmentVariables || {})));
  let _editingValues = $state<Set<string>>(new Set());
  let newInputVisible = $state(false);

  // 데이터 저장 헬퍼 함수
  function saveNodeData() {
    console.log('🟡 saveNodeData called for:', id);
    if (updateNodeData) {
      updateNodeData(id, {
        ...data,
        environmentVariables,
        loadFromFile
      });
    }
  }

  function toggleEdit() {
    isEditing = !isEditing;
  }

  function addEnvVar() {
    if (newKey && newValue) {
      environmentVariables[newKey] = { value: newValue, visible: false };
      environmentVariables = { ...environmentVariables };
      // 새로 추가된 변수는 기본적으로 숨김 처리
      hiddenValues.add(newKey);
      hiddenValues = new Set(hiddenValues);
      newKey = '';
      newValue = '';
      // 저장
      saveNodeData();
    }
  }

  function importFromEnvFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.env,.env.*';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          parseEnvContent(content);
          loadFromFile = file.name;
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  function parseEnvContent(content: string) {
    const lines = content.split('\n');
    const newVars: Record<string, { value: string; visible: boolean }> = {};

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim();
          let value = trimmed.substring(equalIndex + 1).trim();

          // 따옴표 제거
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }

          newVars[key] = { value: value, visible: false };
        }
      }
    });

    // 기존 변수와 병합
    environmentVariables = { ...environmentVariables, ...newVars };

    // 새로 추가된 변수들을 숨김 처리
    Object.keys(newVars).forEach((key) => {
      hiddenValues.add(key);
    });
    hiddenValues = new Set(hiddenValues);

    // 저장
    saveNodeData();
  }

  function removeEnvVar(key: string) {
    delete environmentVariables[key];
    environmentVariables = { ...environmentVariables };
    // 저장
    saveNodeData();
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      addEnvVar();
    }
  }

  function toggleValueVisibility(key: string) {
    if (hiddenValues.has(key)) {
      hiddenValues.delete(key);
    } else {
      hiddenValues.add(key);
    }
    hiddenValues = new Set(hiddenValues);
  }

  function toggleNewInputVisibility() {
    newInputVisible = !newInputVisible;
  }
</script>

<BaseNode
  {data}
  {id}
  colorClass={groupColor.colorClass}
  icon={Settings}
  minWidth={240}
  deletable={true}
  showOutput={true}
>
  <div class="space-y-2">
    <!-- 헤더 및 토글 버튼 -->
    <div
      class="flex items-center justify-between rounded border {groupColor.borderClass} {groupColor.bgClass} p-3"
    >
      <div>
        <div class="mb-1 text-sm font-medium {groupColor.textClass}">Environment Setup</div>
        <div class="text-xs text-gray-600">Configure environment variables and system settings</div>
      </div>
      <button
        onclick={toggleEdit}
        class="text-xs text-blue-600 hover:text-blue-700 focus:outline-none"
      >
        {isEditing ? 'Done' : 'Edit'}
      </button>
    </div>

    <!-- 표시 모드 -->
    {#if !isEditing}
      <div class="space-y-2 text-xs">
        {#if Object.keys(environmentVariables).length > 0}
          <div>
            <div class="font-medium text-gray-700">
              Environment Variables ({Object.keys(environmentVariables).length})
            </div>
            <div class="mt-1 max-h-20 space-y-1 overflow-y-auto">
              {#each Object.entries(environmentVariables) as [key, value] (key)}
                <div class="flex items-center justify-between text-gray-600">
                  <div class="flex min-w-0 flex-1 items-center">
                    <span class="font-mono text-xs"
                      >{key} = {hiddenValues.has(key) ? '••••••••' : value.value}</span
                    >
                  </div>
                  <button
                    onclick={() => toggleValueVisibility(key)}
                    class="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {#if hiddenValues.has(key)}
                      <EyeOff class="h-3 w-3" />
                    {:else}
                      <Eye class="h-3 w-3" />
                    {/if}
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if loadFromFile}
          <div>
            <div class="font-medium text-gray-700">Load from file</div>
            <div class="mt-1 font-mono text-xs text-gray-600">{loadFromFile}</div>
          </div>
        {/if}

        {#if Object.keys(environmentVariables).length === 0 && !loadFromFile}
          <div class="text-gray-500">No environment variables configured</div>
        {/if}
      </div>
    {/if}

    <!-- 편집 모드 -->
    {#if isEditing}
      <div class="space-y-3 rounded border bg-gray-50 p-3">
        <!-- Load from file -->
        <div>
          <label for="env-file-{id}" class="mb-1 block text-sm font-medium text-gray-700"
            >Load from file (optional)</label
          >
          <div class="flex gap-2">
            <input
              id="env-file-{id}"
              type="text"
              bind:value={loadFromFile}
              placeholder=".env, config.env, etc."
              class="flex-1 rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              onclick={importFromEnvFile}
              class="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
              title="Import .env file"
            >
              Import .env
            </button>
          </div>
        </div>

        <!-- Environment Variables -->
        <div>
          <div class="mb-1 block text-sm font-medium text-gray-700">Environment Variables</div>

          <!-- Add new variable -->
          <div class="mb-2 flex gap-2">
            <input
              type="text"
              bind:value={newKey}
              placeholder="Variable name"
              aria-label="Variable name"
              class="flex-1 rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <div class="relative flex-1">
              <input
                type={newInputVisible ? 'text' : 'password'}
                bind:value={newValue}
                onkeypress={handleKeyPress}
                placeholder="Value"
                class="w-full rounded border border-gray-300 px-3 py-1 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onclick={toggleNewInputVisibility}
                class="absolute top-1/2 right-1 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {#if newInputVisible}
                  <EyeOff class="h-4 w-4" />
                {:else}
                  <Eye class="h-4 w-4" />
                {/if}
              </button>
            </div>
            <button
              onclick={addEnvVar}
              class="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <Plus class="h-4 w-4" />
            </button>
          </div>

          <!-- Existing variables -->
          {#if Object.keys(environmentVariables).length > 0}
            <div class="max-h-32 space-y-1 overflow-y-auto">
              {#each Object.entries(environmentVariables) as [key, value] (key)}
                <div class="flex items-center justify-between rounded bg-white px-2 py-1 text-sm">
                  <span class="font-mono">{key}={value.value}</span>
                  <button
                    onclick={() => removeEnvVar(key)}
                    class="text-red-500 hover:text-red-600 focus:outline-none"
                  >
                    <X class="h-3 w-3" />
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Environment 설정은 성공 시에만 다음 단계로 진행 -->
  </div>
</BaseNode>
