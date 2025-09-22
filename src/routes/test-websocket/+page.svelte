<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { LogWebSocketService } from '$lib/services/log-websocket.service';
	import type { LogEntry, PhaseInfo } from '$lib/types/log.types';
	import { MockLogServer } from '$lib/utils/mock-server';
	
	let wsService: LogWebSocketService;
	let mockServer: MockLogServer | null = null;
	let connected = $state(false);
	let logs = $state<LogEntry[]>([]);
	let phases = $state<PhaseInfo[]>([]);
	let error = $state<string | null>(null);
	let testExecutionId = $state('test-execution-001');
	let token = $state('');
	let useMockServer = $state(true);
	
	async function connectWebSocket() {
		try {
			wsService = new LogWebSocketService();
			await wsService.connect(token || 'test-token');
			
			// Subscribe to stores
			wsService.connected.subscribe(value => {
				connected = value;
			});
			
			wsService.logs.subscribe(value => {
				logs = value;
			});
			
			wsService.error.subscribe(value => {
				error = value;
			});
			
			// Subscribe to test execution
			if (connected) {
				wsService.subscribe(testExecutionId);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Connection failed';
		}
	}
	
	function disconnect() {
		wsService?.disconnect();
	}
	
	function clearLogs() {
		wsService?.clearLogs();
	}
	
	function subscribeToExecution() {
		if (wsService && connected) {
			wsService.subscribe(testExecutionId);
		}
	}
	
	function startMockServer() {
		if (mockServer) {
			mockServer.stop();
		}
		
		mockServer = new MockLogServer();
		
		mockServer.onLog((log) => {
			logs = [...logs, log];
		});
		
		mockServer.onPhase((phase) => {
			const index = phases.findIndex(p => p.id === phase.id);
			if (index >= 0) {
				phases[index] = phase;
				phases = [...phases];
			} else {
				phases = [...phases, phase];
			}
		});
		
		mockServer.onStatus((status) => {
			console.log('Execution status:', status);
		});
		
		mockServer.start(1000);
		connected = true;
	}
	
	function stopMockServer() {
		mockServer?.stop();
		mockServer = null;
		connected = false;
		logs = [];
		phases = [];
	}
	
	onDestroy(() => {
		wsService?.disconnect();
		mockServer?.stop();
	});
	
	// Simulate backend sending logs
	function simulateLogMessage() {
		if (!connected) return;
		
		const mockLog: LogEntry = {
			timestamp: new Date().toISOString(),
			level: ['info', 'warning', 'error'][Math.floor(Math.random() * 3)] as 'info' | 'warning' | 'error',
			message: `Test log message ${Date.now()}`,
			phase: 'TESTING'
		};
		
		logs = [...logs, mockLog];
	}
</script>

<div class="min-h-screen bg-gray-50 p-8">
	<div class="max-w-4xl mx-auto">
		<h1 class="text-2xl font-bold mb-8">WebSocket Connection Test</h1>
		
		<!-- Connection Status -->
		<div class="bg-white rounded-lg shadow p-6 mb-6">
			<h2 class="text-lg font-semibold mb-4">Connection Status</h2>
			
			<div class="flex items-center gap-4 mb-4">
				<div class="flex items-center gap-2">
					<div class="w-3 h-3 rounded-full {connected ? 'bg-green-500' : 'bg-red-500'}"></div>
					<span class="font-medium">{connected ? 'Connected' : 'Disconnected'}</span>
				</div>
				
				{#if error}
					<div class="text-red-600 text-sm">{error}</div>
				{/if}
			</div>
			
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium mb-1">Auth Token (Optional)</label>
					<input 
						type="text" 
						bind:value={token}
						placeholder="Enter auth token or leave empty"
						class="w-full px-3 py-2 border rounded-lg"
						disabled={connected}
					/>
				</div>
				
				<div>
					<label class="block text-sm font-medium mb-1">Execution ID</label>
					<input 
						type="text" 
						bind:value={testExecutionId}
						class="w-full px-3 py-2 border rounded-lg"
						disabled={connected}
					/>
				</div>
				
				<div class="mb-4">
					<label class="flex items-center gap-2">
						<input 
							type="checkbox" 
							bind:checked={useMockServer}
							class="rounded"
							disabled={connected}
						/>
						<span>Use Mock Server (for testing without backend)</span>
					</label>
				</div>
				
				<div class="flex gap-2">
					{#if !connected}
						{#if useMockServer}
							<button 
								onclick={startMockServer}
								class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
							>
								Start Mock Server
							</button>
						{:else}
							<button 
								onclick={connectWebSocket}
								class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
							>
								Connect to WebSocket
							</button>
						{/if}
					{:else}
						{#if useMockServer}
							<button 
								onclick={stopMockServer}
								class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
							>
								Stop Mock Server
							</button>
						{:else}
							<button 
								onclick={disconnect}
								class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
							>
								Disconnect
							</button>
						{/if}
						<button 
							onclick={subscribeToExecution}
							class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
						>
							Subscribe to Execution
						</button>
						<button 
							onclick={clearLogs}
							class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
						>
							Clear Logs
						</button>
						<button 
							onclick={simulateLogMessage}
							class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
						>
							Simulate Log
						</button>
					{/if}
				</div>
			</div>
		</div>
		
		<!-- Backend URLs -->
		<div class="bg-white rounded-lg shadow p-6 mb-6">
			<h2 class="text-lg font-semibold mb-4">Environment Configuration</h2>
			<div class="space-y-2 font-mono text-sm">
				<div>API URL: {import.meta.env.PUBLIC_API_URL || 'Not configured'}</div>
				<div>WebSocket URL: {import.meta.env.PUBLIC_WEBSOCKET_URL || 'Not configured'}</div>
				<div>Backend URL: {import.meta.env.PUBLIC_BACKEND_URL || 'Not configured'}</div>
			</div>
		</div>
		
		<!-- Phase Status -->
		{#if phases.length > 0}
			<div class="bg-white rounded-lg shadow p-6 mb-6">
				<h2 class="text-lg font-semibold mb-4">Execution Phases</h2>
				<div class="grid grid-cols-4 gap-4">
					{#each phases as phase}
						<div class="p-3 rounded-lg border 
							{phase.status === 'completed' ? 'bg-green-50 border-green-200' : ''}
							{phase.status === 'running' ? 'bg-blue-50 border-blue-200' : ''}
							{phase.status === 'pending' ? 'bg-gray-50 border-gray-200' : ''}
						">
							<div class="font-medium text-sm">{phase.name}</div>
							<div class="text-xs text-gray-500 capitalize">{phase.status}</div>
							{#if phase.duration}
								<div class="text-xs text-gray-500">{phase.duration}s</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
		
		<!-- Log Display -->
		<div class="bg-white rounded-lg shadow p-6">
			<h2 class="text-lg font-semibold mb-4">Received Logs ({logs.length})</h2>
			
			<div class="bg-gray-900 text-gray-100 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
				{#if logs.length === 0}
					<div class="text-gray-500">No logs received yet...</div>
				{:else}
					{#each logs as log}
						<div class="mb-1">
							<span class="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
							<span class="
								{log.level === 'error' ? 'text-red-400' : ''}
								{log.level === 'warning' ? 'text-yellow-400' : ''}
								{log.level === 'info' ? 'text-gray-300' : ''}
								mx-2
							">[{log.level.toUpperCase()}]</span>
							<span>{log.message}</span>
						</div>
					{/each}
				{/if}
			</div>
		</div>
		
		<!-- Instructions -->
		<div class="mt-6 p-4 bg-blue-50 rounded-lg">
			<h3 class="font-semibold mb-2">Testing Instructions:</h3>
			<ol class="list-decimal list-inside space-y-1 text-sm">
				<li>Click "Connect" to establish WebSocket connection</li>
				<li>Connection should turn green if backend is running on port 4000</li>
				<li>Click "Subscribe to Execution" to start receiving logs</li>
				<li>Use "Simulate Log" to add test messages locally</li>
				<li>Real logs will appear when backend sends them</li>
			</ol>
		</div>
	</div>
</div>