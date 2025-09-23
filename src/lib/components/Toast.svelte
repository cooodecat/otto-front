<script lang="ts">
  import { CircleCheck, CircleX, CircleAlert, X } from 'lucide-svelte';
  import { onMount } from 'svelte';

  interface Props {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
    onClose?: () => void;
  }

  const { type, message, duration = 3000, onClose }: Props = $props();

  let show = $state(true);

  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: CircleCheck,
      iconColor: 'text-green-500'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: CircleX,
      iconColor: 'text-red-500'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: CircleAlert,
      iconColor: 'text-yellow-500'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: CircleAlert,
      iconColor: 'text-blue-500'
    }
  };

  const style = styles[type];
  const Icon = style.icon;

  onMount(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  });

  function handleClose() {
    show = false;
    setTimeout(() => {
      onClose?.();
    }, 300);
  }
</script>

{#if show}
  <div
    class="fixed right-4 bottom-4 z-50 flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all {style.bg} {style.border} {style.text}"
    class:opacity-0={!show}
    class:translate-y-2={!show}
  >
    <Icon class="h-5 w-5 flex-shrink-0 {style.iconColor}" />
    <p class="flex-1 text-sm font-medium">{message}</p>
    <button
      onclick={handleClose}
      class="flex-shrink-0 rounded transition-colors hover:bg-white/50"
      aria-label="닫기"
    >
      <X class="h-4 w-4" />
    </button>
  </div>
{/if}
