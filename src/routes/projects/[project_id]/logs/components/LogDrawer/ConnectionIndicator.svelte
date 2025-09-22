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
	
	const isReconnecting = $derived(reconnectAttempts > 0 && reconnectAttempts < maxReconnectAttempts);
</script>

<div class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
	{isConnected ? 'bg-green-50 text-green-700 border border-green-200' : ''}
	{!isConnected && !error ? 'bg-gray-50 text-gray-600 border border-gray-200' : ''}
	{error ? 'bg-red-50 text-red-700 border border-red-200' : ''}
">
	{#if isConnected}
		<Wifi class="w-4 h-4 animate-pulse" />
		<span>Connected • Live streaming</span>
	{:else if isReconnecting}
		<WifiOff class="w-4 h-4 animate-spin" />
		<span>Reconnecting... ({reconnectAttempts}/{maxReconnectAttempts})</span>
	{:else if error}
		<AlertCircle class="w-4 h-4" />
		<span>{error}</span>
	{:else}
		<WifiOff class="w-4 h-4" />
		<span>Disconnected</span>
	{/if}
</div>