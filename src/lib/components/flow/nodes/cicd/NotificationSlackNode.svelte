<script lang="ts">
	import { MessageSquare, Settings, Hash } from 'lucide-svelte';
	import BaseNode from '../BaseNode.svelte';
	import type { NotificationSlackNodeData } from '$lib/types/flow-node.types';
	interface Props {
		id: string;
		data: NotificationSlackNodeData;
	}

	const { data, id }: Props = $props();

	let isExpanded = $state(false);

	const getTriggerText = $derived(() => {
		if (data.onSuccessOnly) return 'Success only';
		if (data.onFailureOnly) return 'Failure only';
		return 'Success & Failure';
	});

	const getTriggerColor = $derived(() => {
		if (data.onSuccessOnly) return 'text-green-600 bg-green-50';
		if (data.onFailureOnly) return 'text-red-600 bg-red-50';
		return 'text-blue-600 bg-blue-50';
	});
</script>

<BaseNode
	{data}
	{id}
	colorClass="bg-purple-500"
	icon={MessageSquare}
	minWidth={280}
	deletable={true}
	useCICDOutputs={true}
>
	<div class="space-y-3">
		<!-- 기본 정보 -->
		<div class="rounded border border-purple-200 bg-purple-50 p-3">
			<div class="mb-2 flex items-center justify-between">
				<div class="flex items-center gap-2 text-sm font-medium text-purple-700">
					<span>💬</span>
					Slack Notify
				</div>
				<button
					onclick={() => (isExpanded = !isExpanded)}
					class="rounded p-1 hover:bg-gray-100"
					title="설정 보기"
				>
					<Settings size={14} class="text-gray-500" />
				</button>
			</div>

			<!-- 채널 정보 -->
			{#if data.channel}
				<div class="mb-2 flex items-center gap-2">
					<Hash class="h-3 w-3 text-gray-500" />
					<span class="font-mono text-xs text-gray-800">
						{data.channel}
					</span>
				</div>
			{/if}

			<!-- 트리거 조건 -->
			<div class="flex items-center gap-2">
				<span class="text-xs text-gray-600">Trigger:</span>
				<span class="rounded px-2 py-1 text-xs font-medium {getTriggerColor}">
					{getTriggerText}
				</span>
			</div>
		</div>

		<!-- 확장 정보 -->
		{#if isExpanded}
			<div class="space-y-3 rounded border bg-gray-50 p-3">
				<!-- 메시지 템플릿 -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700"> Message Template </label>
					<div class="max-h-20 overflow-y-auto rounded border bg-white p-2 font-mono text-xs">
						{data.messageTemplate || 'Pipeline {status}: {project} - {branch}'}
					</div>
					<div class="mt-1 text-xs text-gray-500">
						Variables: {'{status}, {project}, {branch}, {commit}, {duration}'}
					</div>
				</div>

				<!-- Webhook 설정 -->
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">
						Webhook Configuration
					</label>
					<div class="rounded border bg-white p-2">
						<div class="space-y-1 text-xs">
							<div>
								<span class="text-gray-600">URL Env Var:</span>
								<span class="ml-1 font-mono text-gray-800">
									{data.webhookUrlEnv}
								</span>
							</div>
							{#if data.channel}
								<div>
									<span class="text-gray-600">Channel:</span>
									<span class="ml-1 font-mono text-gray-800">
										#{data.channel}
									</span>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- 알림 설정 -->
				<div class="grid grid-cols-2 gap-2">
					<div class="rounded border bg-white p-2">
						<div class="mb-1 text-xs text-gray-600">Success Notifications</div>
						<div class="flex items-center gap-1">
							<div
								class="h-2 w-2 rounded-full {!data.onFailureOnly ? 'bg-green-400' : 'bg-gray-300'}"
							></div>
							<span class="text-xs">
								{!data.onFailureOnly ? 'Enabled' : 'Disabled'}
							</span>
						</div>
					</div>
					<div class="rounded border bg-white p-2">
						<div class="mb-1 text-xs text-gray-600">Failure Notifications</div>
						<div class="flex items-center gap-1">
							<div
								class="h-2 w-2 rounded-full {!data.onSuccessOnly ? 'bg-red-400' : 'bg-gray-300'}"
							></div>
							<span class="text-xs">
								{!data.onSuccessOnly ? 'Enabled' : 'Disabled'}
							</span>
						</div>
					</div>
				</div>

				<!-- 실행 정보 -->
				<div class="grid grid-cols-2 gap-2 text-xs">
					<div>
						<span class="text-gray-600">Timeout:</span>
						<span class="ml-1">{data.timeout || 30}s</span>
					</div>
					<div>
						<span class="text-gray-600">Retry:</span>
						<span class="ml-1">{data.retryCount || 3}</span>
					</div>
				</div>

				<!-- 연결 정보 -->
				<div class="border-t border-gray-200 pt-2">
					<div class="text-xs text-gray-600">
						<div>On Success: {data.onSuccess || 'Continue'}</div>
						<div>On Failed: {data.onFailed || 'Continue anyway'}</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- 상태 표시 -->
		<div class="flex items-center justify-between text-xs text-gray-500">
			<span>Team Communication</span>
			<span class="flex items-center gap-1">
				<span class="h-2 w-2 rounded-full bg-yellow-400"></span>
				Ready
			</span>
		</div>
	</div>
</BaseNode>
