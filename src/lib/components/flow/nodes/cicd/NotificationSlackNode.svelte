<script lang="ts">
  import { MessageSquare } from 'lucide-svelte';
  import BaseNode from '../BaseNode.svelte';
  import { CICD_GROUP_COLORS, CICDBlockGroup } from '$lib/types/flow-node.types';
  import type { NotificationSlackNodeData } from '$lib/types/flow-node.types';
  import { getContext } from 'svelte';

  interface Props {
    id: string;
    data: NotificationSlackNodeData;
  }

  const { data, id }: Props = $props();
  const groupColor = CICD_GROUP_COLORS[CICDBlockGroup.NOTIFICATION];

  // 노드 데이터 업데이트 핸들러 가져오기
  const updateNodeData = getContext<((nodeId: string, newData: any) => void) | undefined>(
    'updateNodeData'
  );

  let isEditing = $state(false);
  let channel = $state(data?.channel || '');
  let webhookUrlEnv = $state(data?.webhookUrlEnv || 'SLACK_WEBHOOK_URL');
  let messageTemplate = $state(data?.messageTemplate || 'Pipeline {status} completed');

  // 데이터 저장 헬퍼 함수
  function saveNodeData() {
    if (updateNodeData) {
      updateNodeData(id, {
        channel,
        webhookUrlEnv,
        messageTemplate
      });
    }
  }

  function toggleEdit() {
    isEditing = !isEditing;
  }
</script>

<BaseNode
  {data}
  {id}
  colorClass={groupColor.colorClass}
  icon={MessageSquare}
  minWidth={280}
  showInput={true}
  useCICDOutputs={true}
>
  <div class="space-y-2">
    <!-- 헤더 및 토글 버튼 -->
    <div
      class="flex items-center justify-between rounded border {groupColor.borderClass} {groupColor.bgClass} p-3"
    >
      <div>
        <div class="mb-1 text-sm font-medium {groupColor.textClass}">💬 Slack Notify</div>
        <div class="text-xs text-gray-600">Send Slack notifications</div>
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
        {#if channel}
          <div>
            <div class="font-medium text-gray-700">Channel</div>
            <div class="mt-1 rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
              #{channel}
            </div>
          </div>
        {/if}

        {#if webhookUrlEnv}
          <div>
            <div class="font-medium text-gray-700">Webhook URL Env</div>
            <div class="mt-1 rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
              {webhookUrlEnv}
            </div>
          </div>
        {/if}

        {#if !channel && !webhookUrlEnv}
          <div class="text-gray-500">No Slack configuration</div>
        {/if}
      </div>
    {/if}

    <!-- 편집 모드 -->
    {#if isEditing}
      <div class="space-y-3 rounded border bg-gray-50 p-3">
        <!-- Channel -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Channel</label>
          <input
            type="text"
            bind:value={channel}
            onchange={saveNodeData}
            placeholder="general"
            class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <!-- Webhook URL Environment Variable -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"
            >Webhook URL Environment Variable</label
          >
          <input
            type="text"
            bind:value={webhookUrlEnv}
            onchange={saveNodeData}
            placeholder="SLACK_WEBHOOK_URL"
            class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <!-- Message Template -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Message Template</label>
          <textarea
            bind:value={messageTemplate}
            onchange={saveNodeData}
            rows="3"
            placeholder="Pipeline {status} completed"
            class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          ></textarea>
          <div class="mt-1 text-xs text-gray-500">
            Variables: {'{status}, {branch}, {commit}, {duration}'}
          </div>
        </div>
      </div>
    {/if}
  </div>
</BaseNode>
