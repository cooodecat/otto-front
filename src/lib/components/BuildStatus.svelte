<script lang="ts">
  import { CircleCheck, CircleX, LoaderCircle, Clock, CircleAlert, Play } from 'lucide-svelte';
  import { onMount, onDestroy } from 'svelte';

  interface Props {
    status?: string;
    currentPhase?: string;
    startTime?: string;
    endTime?: string;
    compact?: boolean;
  }

  const { status, currentPhase, startTime, endTime, compact = false }: Props = $props();

  // 상태별 스타일 매핑
  const statusStyles = {
    SUCCEEDED: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: CircleCheck,
      label: '성공',
      animate: false
    },
    FAILED: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: CircleX,
      label: '실패',
      animate: false
    },
    IN_PROGRESS: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: LoaderCircle,
      label: '진행중',
      animate: true
    },
    STOPPED: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      icon: CircleAlert,
      label: '중지됨',
      animate: false
    },
    PENDING: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      icon: Clock,
      label: '대기중',
      animate: false
    },
    NOT_STARTED: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      icon: Play,
      label: '시작 전',
      animate: false
    }
  };

  const style = $derived(
    statusStyles[status as keyof typeof statusStyles] || statusStyles.NOT_STARTED
  );
  const Icon = $derived(style.icon);

  // 소요 시간 계산
  let elapsedTime = $state('');
  let intervalId: NodeJS.Timeout | null = null;

  function calculateElapsedTime() {
    if (!startTime) {
      elapsedTime = '';
      return;
    }

    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const diff = Math.floor((end - start) / 1000);

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (hours > 0) {
      elapsedTime = `${hours}시간 ${minutes}분 ${seconds}초`;
    } else if (minutes > 0) {
      elapsedTime = `${minutes}분 ${seconds}초`;
    } else {
      elapsedTime = `${seconds}초`;
    }
  }

  onMount(() => {
    calculateElapsedTime();
    if (status === 'IN_PROGRESS' && !endTime) {
      intervalId = setInterval(calculateElapsedTime, 1000);
    }
  });

  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });
</script>

{#if compact}
  <!-- 컴팩트 뷰 (목록에서 사용) -->
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium {style.bg} {style.text}"
  >
    <Icon class="h-3 w-3 {style.animate ? 'animate-spin' : ''}" />
    {style.label}
  </span>
{:else}
  <!-- 상세 뷰 -->
  <div class="rounded-lg border {style.bg} {style.text} border-opacity-50 p-4">
    <div class="flex items-start gap-3">
      <Icon class="mt-0.5 h-5 w-5 {style.animate ? 'animate-spin' : ''}" />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-sm font-semibold">빌드 상태: {style.label}</h3>
          {#if currentPhase}
            <span class="text-xs opacity-75">({currentPhase})</span>
          {/if}
        </div>
        {#if elapsedTime}
          <p class="mt-1 text-xs opacity-75">소요 시간: {elapsedTime}</p>
        {/if}
        {#if startTime}
          <p class="mt-1 text-xs opacity-75">
            시작: {new Date(startTime).toLocaleString('ko-KR')}
          </p>
        {/if}
        {#if endTime}
          <p class="mt-1 text-xs opacity-75">
            종료: {new Date(endTime).toLocaleString('ko-KR')}
          </p>
        {/if}
      </div>
    </div>
  </div>
{/if}
