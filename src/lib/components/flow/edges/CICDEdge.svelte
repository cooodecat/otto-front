<script lang="ts">
  import { getSmoothStepPath, Position } from '@xyflow/svelte';
  import { CheckCircle, XCircle, Trash2 } from 'lucide-svelte';
  import { getContext } from 'svelte';

  interface Props {
    id: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourcePosition: Position;
    targetPosition: Position;
    sourceHandle?: string;
    targetHandle?: string;
    data?: any;
    markerEnd?: string;
    source?: string;
    target?: string;
    selected?: boolean;
  }

  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    sourceHandle,
    targetHandle,
    data,
    markerEnd,
    source,
    target,
    selected
  }: Props = $props();

  // 성공/실패에 따른 스타일 결정
  const actualSourceHandle = $derived(sourceHandle || data?.sourceHandle || 'default');
  const isSuccessPath = $derived(actualSourceHandle === 'success-output');
  const isFailedPath = $derived(actualSourceHandle === 'failed-output');
  const isDefaultPath = $derived(!isSuccessPath && !isFailedPath);

  // 디버깅 로그 제거 (성능 향상)

  const edgeStyle = $derived.by(() => {
    if (isSuccessPath) {
      return {
        stroke: '#10b981', // emerald-500
        strokeWidth: 2,
        strokeDasharray: 'none' // 실선
      };
    } else if (isFailedPath) {
      return {
        stroke: '#ef4444', // red-500
        strokeWidth: 2,
        strokeDasharray: 'none' // 실선
      };
    }
    // 기본 스타일
    return {
      stroke: '#6b7280', // gray-500
      strokeWidth: 2,
      strokeDasharray: 'none' // 실선
    };
  });

  const label = $derived.by(() => {
    if (isSuccessPath) {
      return {
        text: 'Success',
        bgColor: '#10b981',
        textColor: 'white'
      };
    } else if (isFailedPath) {
      return {
        text: 'Failed',
        bgColor: '#ef4444',
        textColor: 'white'
      };
    }
    // 기본 연결은 라벨 없음
    return null;
  });

  const pathData = $derived(
    getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 20
    })
  );

  const edgePath = $derived(pathData[0]);
  const labelX = $derived(pathData[1]);
  const labelY = $derived(pathData[2]);

  // 부모에서 전달된 삭제 핸들러 가져오기
  const deleteEdgeHandler = getContext<((edgeId: string) => void) | undefined>('deleteEdgeHandler');

  function handleDelete(event: MouseEvent) {
    event.stopPropagation();
    if (deleteEdgeHandler) {
      deleteEdgeHandler(id);
    } else {
      console.log('Delete edge (no handler):', id);
    }
  }
</script>

<!-- 기본 간선 경로 (베이스) -->
<path
  {id}
  stroke={edgeStyle.stroke}
  stroke-width={edgeStyle.strokeWidth}
  class="react-flow__edge-path"
  d={edgePath}
  marker-end={markerEnd}
  fill="none"
  opacity="0.0"
/>

<!-- 진행 방향 애니메이션 효과 -->
<path
  d={edgePath}
  fill="none"
  stroke-width="2"
  stroke={edgeStyle.stroke}
  stroke-dasharray="8,12"
  opacity="0.8"
  class="edge-animation"
/>

<!-- 라벨 렌더러 -->
<foreignObject x={labelX - 50} y={labelY - 20} width="100" height="40" style="pointer-events: all;">
  <div class="flex items-center gap-1">
    <!-- 라벨 배지 (Success/Failed만 표시) -->
    {#if label}
      <div
        class="flex items-center gap-1 rounded-full border border-white/20 px-2 py-1 text-xs font-medium shadow-sm"
        style="background-color: {label.bgColor}; color: {label.textColor};"
      >
        <span>{label.text}</span>
      </div>
    {/if}

    <!-- 삭제 버튼 -->
    <button
      onclick={handleDelete}
      class="rounded-full border border-gray-200 bg-white p-1 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50"
      title="Delete connection"
    >
      <Trash2 class="h-3 w-3 text-gray-500 hover:text-red-500" />
    </button>
  </div>
</foreignObject>

<style>
  @keyframes flow {
    0% {
      stroke-dashoffset: 0;
    }
    100% {
      stroke-dashoffset: -20;
    }
  }

  .edge-animation {
    animation: flow 0.8s linear infinite;
    pointer-events: none;
  }
</style>
