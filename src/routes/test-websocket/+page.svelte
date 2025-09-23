<script lang="ts">
  import { onDestroy } from 'svelte';
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
      wsService.connected.subscribe((value) => {
        connected = value;
      });

      wsService.logs.subscribe((value) => {
        logs = value;
      });

      wsService.error.subscribe((value) => {
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
      console.log('Subscribing to execution:', testExecutionId);

      // Also subscribe to phases to see phase updates
      wsService.phases.subscribe((value) => {
        phases = value;
      });
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
      const index = phases.findIndex((p) => p.id === phase.id);
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
      level: ['info', 'warning', 'error'][Math.floor(Math.random() * 3)] as
        | 'info'
        | 'warning'
        | 'error',
      message: `Test log message ${Date.now()}`,
      phase: 'TESTING'
    };

    logs = [...logs, mockLog];
  }

  // Send log via server API
  async function sendServerLog() {
    if (!connected) return;

    try {
      const response = await fetch(
        `http://localhost:4000/api/v1/test-logs/executions/${testExecutionId}/log`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Server test log at ${new Date().toISOString()}`,
            level: ['info', 'warning', 'error'][Math.floor(Math.random() * 3)],
            phase: 'BACKEND_TEST'
          })
        }
      );

      if (!response.ok) {
        console.error('Failed to send server log:', await response.text());
      } else {
        console.log('Server log sent successfully');
      }
    } catch (err) {
      console.error('Error sending server log:', err);
    }
  }

  // Send batch of logs
  async function sendBatchLogs() {
    if (!connected) return;

    try {
      const response = await fetch(
        `http://localhost:4000/api/v1/test-logs/executions/${testExecutionId}/batch-logs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            count: 10,
            delay: 100 // 100ms delay between each log
          })
        }
      );

      if (!response.ok) {
        console.error('Failed to send batch logs:', await response.text());
      } else {
        console.log('Batch logs sent successfully');
      }
    } catch (err) {
      console.error('Error sending batch logs:', err);
    }
  }
</script>

<div class="min-h-screen bg-gray-50 p-8">
  <div class="mx-auto max-w-4xl">
    <h1 class="mb-8 text-2xl font-bold">WebSocket Connection Test</h1>

    <!-- Connection Status -->
    <div class="mb-6 rounded-lg bg-white p-6 shadow">
      <h2 class="mb-4 text-lg font-semibold">Connection Status</h2>

      <div class="mb-4 flex items-center gap-4">
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full {connected ? 'bg-green-500' : 'bg-red-500'}"></div>
          <span class="font-medium">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>

        {#if error}
          <div class="text-sm text-red-600">{error}</div>
        {/if}
      </div>

      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium">Auth Token (Optional)</label>
          <input
            type="text"
            bind:value={token}
            placeholder="Enter auth token or leave empty"
            class="w-full rounded-lg border px-3 py-2"
            disabled={connected}
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium">Execution ID</label>
          <input
            type="text"
            bind:value={testExecutionId}
            class="w-full rounded-lg border px-3 py-2"
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

        <div class="flex flex-wrap gap-2">
          {#if !connected}
            {#if useMockServer}
              <button
                onclick={startMockServer}
                class="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
              >
                Start Mock Server
              </button>
            {:else}
              <button
                onclick={connectWebSocket}
                class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Connect to WebSocket
              </button>
            {/if}
          {:else}
            {#if useMockServer}
              <button
                onclick={stopMockServer}
                class="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Stop Mock Server
              </button>
            {:else}
              <button
                onclick={disconnect}
                class="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Disconnect
              </button>
            {/if}
            <button
              onclick={subscribeToExecution}
              class="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Subscribe to Execution
            </button>
            <button
              onclick={clearLogs}
              class="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              Clear Logs
            </button>
            <button
              onclick={simulateLogMessage}
              class="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
            >
              Simulate Log (Local)
            </button>
            <button
              onclick={sendServerLog}
              class="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Send Server Log
            </button>
            <button
              onclick={sendBatchLogs}
              class="rounded-lg bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
            >
              Send Batch (10 logs)
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Backend URLs -->
    <div class="mb-6 rounded-lg bg-white p-6 shadow">
      <h2 class="mb-4 text-lg font-semibold">Environment Configuration</h2>
      <div class="space-y-2 font-mono text-sm">
        <div>API URL: {import.meta.env.PUBLIC_API_URL || 'Not configured'}</div>
        <div>WebSocket URL: {import.meta.env.PUBLIC_WEBSOCKET_URL || 'Not configured'}</div>
        <div>Backend URL: {import.meta.env.PUBLIC_BACKEND_URL || 'Not configured'}</div>
      </div>
    </div>

    <!-- Phase Status -->
    {#if phases.length > 0}
      <div class="mb-6 rounded-lg bg-white p-6 shadow">
        <h2 class="mb-4 text-lg font-semibold">Execution Phases</h2>
        <div class="grid grid-cols-4 gap-4">
          {#each phases as phase}
            <div
              class="rounded-lg border p-3
							{phase.status === 'completed' ? 'border-green-200 bg-green-50' : ''}
							{phase.status === 'running' ? 'border-blue-200 bg-blue-50' : ''}
							{phase.status === 'pending' ? 'border-gray-200 bg-gray-50' : ''}
						"
            >
              <div class="text-sm font-medium">{phase.name}</div>
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
    <div class="rounded-lg bg-white p-6 shadow">
      <h2 class="mb-4 text-lg font-semibold">Received Logs ({logs.length})</h2>

      <div class="h-96 overflow-y-auto rounded-lg bg-gray-900 p-4 font-mono text-sm text-gray-100">
        {#if logs.length === 0}
          <div class="text-gray-500">No logs received yet...</div>
        {:else}
          {#each logs as log}
            <div class="mb-1">
              <span class="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span
                class="
								{log.level === 'error' ? 'text-red-400' : ''}
								{log.level === 'warning' ? 'text-yellow-400' : ''}
								{log.level === 'info' ? 'text-gray-300' : ''}
								mx-2
							">[{log.level.toUpperCase()}]</span
              >
              <span>{log.message}</span>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Instructions -->
    <div class="mt-6 rounded-lg bg-blue-50 p-4">
      <h3 class="mb-2 font-semibold">Testing Instructions:</h3>
      <ol class="list-inside list-decimal space-y-1 text-sm">
        <li>Click "Connect" to establish WebSocket connection</li>
        <li>Connection should turn green if backend is running on port 4000</li>
        <li>Click "Subscribe to Execution" to start receiving logs</li>
        <li>Use "Simulate Log" to add test messages locally</li>
        <li>Real logs will appear when backend sends them</li>
      </ol>
    </div>
  </div>
</div>
