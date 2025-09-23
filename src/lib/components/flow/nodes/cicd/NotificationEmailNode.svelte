<script lang="ts">
  import { Mail } from 'lucide-svelte';
  import BaseNode from '../BaseNode.svelte';
  import { CICD_GROUP_COLORS, CICDBlockGroup } from '$lib/types/flow-node.types';
  import type { NotificationEmailNodeData } from '$lib/types/flow-node.types';
  import { getContext } from 'svelte';

  interface Props {
    id: string;
    data: NotificationEmailNodeData;
  }

  const { data, id }: Props = $props();
  const groupColor = CICD_GROUP_COLORS[CICDBlockGroup.NOTIFICATION];

  // 노드 데이터 업데이트 핸들러 가져오기
  const updateNodeData = getContext<((nodeId: string, newData: any) => void) | undefined>(
    'updateNodeData'
  );

  let isEditing = $state(false);
  let recipients = $state(data?.recipients || '');
  let subject = $state(data?.subject || 'Pipeline {status}');
  let messageTemplate = $state(data?.messageTemplate || 'Pipeline {status} completed');
  let smtpHost = $state(data?.smtpHost || '');
  let smtpPort = $state(data?.smtpPort || 587);
  let smtpUser = $state(data?.smtpUser || '');
  let smtpPasswordEnv = $state(data?.smtpPasswordEnv || 'SMTP_PASSWORD');

  // 데이터 저장 헬퍼 함수
  function saveNodeData() {
    if (updateNodeData) {
      updateNodeData(id, {
        recipients,
        subject,
        messageTemplate,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPasswordEnv
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
  icon={Mail}
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
        <div class="mb-1 text-sm font-medium {groupColor.textClass}">Email Notify</div>
        <div class="text-xs text-gray-600">Send email notifications</div>
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
        {#if recipients}
          <div>
            <div class="font-medium text-gray-700">Recipients</div>
            <div class="mt-1 rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
              {recipients}
            </div>
          </div>
        {/if}

        {#if smtpHost}
          <div>
            <div class="font-medium text-gray-700">SMTP Host</div>
            <div class="mt-1 rounded border bg-gray-100 px-2 py-1 font-mono text-xs">
              {smtpHost}:{smtpPort}
            </div>
          </div>
        {/if}

        {#if !recipients && !smtpHost}
          <div class="text-gray-500">No email configuration</div>
        {/if}
      </div>
    {/if}

    <!-- 편집 모드 -->
    {#if isEditing}
      <div class="space-y-3 rounded border bg-gray-50 p-3">
        <!-- Recipients -->
        <div>
          <label for="email-recipients" class="mb-1 block text-sm font-medium text-gray-700"
            >Recipients</label
          >
          <input
            id="email-recipients"
            type="text"
            bind:value={recipients}
            onchange={saveNodeData}
            placeholder="user@example.com, team@company.com"
            class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <!-- Subject -->
        <div>
          <label for="email-subject" class="mb-1 block text-sm font-medium text-gray-700"
            >Subject</label
          >
          <input
            id="email-subject"
            type="text"
            bind:value={subject}
            onchange={saveNodeData}
            placeholder="Pipeline {status}"
            class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <!-- Message Template -->
        <div>
          <label for="email-message" class="mb-1 block text-sm font-medium text-gray-700"
            >Message Template</label
          >
          <textarea
            id="email-message"
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

        <!-- SMTP Configuration -->
        <div class="space-y-2">
          <div class="text-sm font-medium text-gray-700">SMTP Configuration</div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <input
                type="text"
                bind:value={smtpHost}
                onchange={saveNodeData}
                placeholder="smtp.gmail.com"
                class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <input
                type="number"
                bind:value={smtpPort}
                onchange={saveNodeData}
                placeholder="587"
                class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <input
              type="text"
              bind:value={smtpUser}
              onchange={saveNodeData}
              placeholder="SMTP Username"
              class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <input
              type="text"
              bind:value={smtpPasswordEnv}
              onchange={saveNodeData}
              placeholder="SMTP_PASSWORD"
              class="w-full rounded border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <div class="mt-1 text-xs text-gray-500">Environment variable for SMTP password</div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</BaseNode>
