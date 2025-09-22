<script lang="ts">
  import { Wifi, WifiOff, AlertCircle } from 'lucide-svelte';

  interface Props {
    isConnected: boolean;
    error?: string | null;
    reconnectAttempts?: number;
    maxReconnectAttempts?: number;
  }

  let {
    isConnected,
    error = null,
    reconnectAttempts = 0,
    maxReconnectAttempts = 5
  }: Props = $props();

  const isReconnecting = $derived(
    reconnectAttempts > 0 && reconnectAttempts < maxReconnectAttempts
  );
</script>

<div
  class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm
	{isConnected ? 'border border-green-200 bg-green-50 text-green-700' : ''}
	{!isConnected && !error ? 'border border-gray-200 bg-gray-50 text-gray-600' : ''}
	{error ? 'border border-red-200 bg-red-50 text-red-700' : ''}
"
>
  {#if isConnected}
    <Wifi class="h-4 w-4 animate-pulse" />
    <span>Connected • Live streaming</span>
  {:else if isReconnecting}
    <WifiOff class="h-4 w-4 animate-spin" />
    <span>Reconnecting... ({reconnectAttempts}/{maxReconnectAttempts})</span>
  {:else if error}
    <AlertCircle class="h-4 w-4" />
    <span>{error}</span>
  {:else}
    <WifiOff class="h-4 w-4" />
    <span>Disconnected</span>
  {/if}
</div>
