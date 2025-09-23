import { io, Socket } from 'socket.io-client';
import { writable, type Writable } from 'svelte/store';
import type { LogEntry, ExecutionStatus, PhaseInfo, WebSocketEvents } from '$lib/types/log.types';
import { PUBLIC_BACKEND_URL } from '$env/static/public';

export class LogWebSocketService {
  private socket: Socket | null = null;
  private executionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Stores
  public logs: Writable<LogEntry[]> = writable([]);
  public status: Writable<ExecutionStatus> = writable('PENDING');
  public connected: Writable<boolean> = writable(false);
  public phases: Writable<PhaseInfo[]> = writable([]);
  public error: Writable<string | null> = writable(null);

  async connect(token: string, websocketUrl?: string): Promise<void> {
    if (this.socket?.connected) return;

    const url = websocketUrl || PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const logsNamespace = `${url}/logs`;

    this.socket = io(logsNamespace, {
      auth: { token },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    this.setupEventHandlers();
    this.setupReconnectionHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.connected.set(true);
      this.error.set(null);
      this.reconnectAttempts = 0;
      console.log('WebSocket connected');

      // Re-subscribe if we were subscribed before
      if (this.executionId) {
        this.socket!.emit('execution:subscribe', { executionId: this.executionId });
      }
    });

    this.socket.on('disconnect', () => {
      this.connected.set(false);
      console.log('WebSocket disconnected');
    });

    // Log events
    this.socket.on('logs:buffered', (data: LogEntry[]) => {
      this.logs.update((logs) => [...data, ...logs]);
    });

    this.socket.on('logs:historical', (data: LogEntry[]) => {
      this.logs.update((logs) => [...data, ...logs]);
    });

    this.socket.on('logs:new', (data: LogEntry) => {
      this.logs.update((logs) => [...logs, data]);
    });

    // Status and phase updates
    this.socket.on('status:changed', (data: { executionId: string; status: ExecutionStatus }) => {
      if (data.executionId === this.executionId) {
        this.status.set(data.status);
      }
    });

    this.socket.on('phase:update', (data: PhaseInfo) => {
      this.phases.update((phases) => {
        const index = phases.findIndex((p) => p.id === data.id);
        if (index >= 0) {
          phases[index] = data;
        } else {
          phases.push(data);
        }
        return [...phases];
      });
    });

    // Error handling
    this.socket.on('error', (error: Error | { message?: string }) => {
      console.error('WebSocket error:', error);
      const errorMessage =
        error instanceof Error ? error.message : error.message || 'WebSocket connection error';
      this.error.set(errorMessage);
    });
  }

  private setupReconnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('reconnect_attempt', (attempt) => {
      this.reconnectAttempts = attempt;
      console.log(`Reconnection attempt ${attempt}`);
    });

    this.socket.on('reconnect_failed', () => {
      this.error.set('Failed to reconnect after maximum attempts');
    });

    this.socket.on('reconnect', () => {
      console.log('Successfully reconnected');
      this.error.set(null);
    });
  }

  subscribe(executionId: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    // Unsubscribe from previous execution if any
    if (this.executionId && this.executionId !== executionId) {
      this.unsubscribe();
    }

    this.executionId = executionId;
    // Changed to match backend handler: 'subscribe' instead of 'execution:subscribe'
    this.socket.emit('subscribe', { executionId });
    console.log('Subscribing to execution:', executionId);

    // Request historical logs - this might not exist in backend yet
    // this.socket.emit('logs:request-historical', { executionId, limit: 1000 });
  }

  unsubscribe(): void {
    if (!this.socket || !this.executionId) return;

    this.socket.emit('execution:unsubscribe', { executionId: this.executionId });
    this.executionId = null;
    this.logs.set([]);
    this.phases.set([]);
    this.status.set('PENDING');
  }

  disconnect(): void {
    // Clear reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.unsubscribe();
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
    this.reconnectAttempts = 0;
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getExecutionId(): string | null {
    return this.executionId;
  }

  clearLogs(): void {
    this.logs.set([]);
  }
}
