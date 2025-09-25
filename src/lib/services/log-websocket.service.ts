import { io } from 'socket.io-client';
import { writable, type Writable } from 'svelte/store';
import type {
  LogEntry,
  ExecutionStatus,
  PhaseInfo,
  WebSocketEvents as _WebSocketEvents
} from '$lib/types/log.types';
import { PUBLIC_BACKEND_URL } from '$env/static/public';

function sanitizeWebsocketBaseUrl(input: string): string {
  if (!input) return '';

  try {
    const parsed = new URL(input);
    const sanitizedPath = parsed.pathname.replace(/\/+$/, '').replace(/\/api(\/v\d+)?$/i, '');

    parsed.pathname = sanitizedPath || '/';
    parsed.search = '';
    parsed.hash = '';

    // Trim trailing slash for consistent concatenation
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return input.replace(/\/+$/, '').replace(/\/api(\/v\d+)?$/i, '');
  }
}

export class LogWebSocketService {
  private socket: ReturnType<typeof io> | null = null;
  private executionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private connectionAttemptTimeout: ReturnType<typeof setTimeout> | null = null;

  // Stores
  public logs: Writable<LogEntry[]> = writable([]);
  public status: Writable<ExecutionStatus> = writable('PENDING');
  public connected: Writable<boolean> = writable(false);
  public phases: Writable<PhaseInfo[]> = writable([]);
  public error: Writable<string | null> = writable(null);

  async connect(token: string, websocketUrl?: string): Promise<void> {
    if (this.socket?.connected || this.isConnecting) return;

    this.isConnecting = true;

    // Determine the correct URL based on environment
    const url = websocketUrl || PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const baseUrl = sanitizeWebsocketBaseUrl(url);
    const logsNamespace = baseUrl.endsWith('/logs') ? baseUrl : `${baseUrl}/logs`;

    console.log('Connecting to WebSocket:', logsNamespace);

    try {
      const socketOptions: {
        withCredentials: boolean;
        reconnection: boolean;
        reconnectionAttempts: number;
        reconnectionDelay: number;
        reconnectionDelayMax: number;
        timeout: number;
        transports: string[];
        auth?: { token: string };
      } = {
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000, // Add connection timeout
        transports: ['websocket', 'polling'] // Explicitly set transports
      };

      // Only add auth if token exists
      if (token) {
        socketOptions.auth = { token };
      }

      console.log(
        `🔌 [WebSocket] Attempting connection:\n` +
          `  - URL: ${logsNamespace}\n` +
          `  - Transports: ${socketOptions.transports?.join(', ')}\n` +
          `  - Reconnection: ${socketOptions.reconnection}\n` +
          `  - Token present: ${!!token}\n` +
          `  - Token length: ${token ? String(token).length : 0}`
      );

      this.socket = io(logsNamespace, socketOptions);

      this.setupEventHandlers();
      this.setupReconnectionHandlers();

      // Set a timeout for the connection attempt
      this.connectionAttemptTimeout = setTimeout(() => {
        if (!this.socket?.connected) {
          console.error(
            `❌ [WebSocket] Connection timeout:\n` +
              `  - URL: ${logsNamespace}\n` +
              `  - Socket ID: ${this.socket?.id || 'unknown'}\n` +
              `  - Transport: ${this.socket?.io?.engine?.transport?.name || 'unknown'}\n` +
              `  - Timeout: 15 seconds\n` +
              `  - Reconnect attempts: ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
          );
          this.error.set(
            'Connection timeout - unable to establish WebSocket connection within 15 seconds'
          );
          this.isConnecting = false;
          this.socket?.disconnect();
        }
      }, 15000);
    } catch (error) {
      console.error(
        `❌ [WebSocket] Failed to create connection:\n` +
          `  - URL: ${logsNamespace}\n` +
          `  - Error: ${error instanceof Error ? error.message : String(error)}\n` +
          `  - Token present: ${!!token}\n` +
          `  - Reconnect attempts: ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
        error
      );
      this.error.set(
        `Failed to create WebSocket connection: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      this.isConnecting = false;
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.connected.set(true);
      this.error.set(null);
      this.reconnectAttempts = 0;
      this.isConnecting = false;

      // Clear connection timeout
      if (this.connectionAttemptTimeout) {
        clearTimeout(this.connectionAttemptTimeout);
        this.connectionAttemptTimeout = null;
      }

      console.log(
        `✅ [WebSocket] Successfully connected:\n` +
          `  - Socket ID: ${this.socket?.id || 'unknown'}\n` +
          `  - Transport: ${this.socket?.io?.engine?.transport?.name || 'unknown'}\n` +
          `  - URL: ${this.socket?.io?.uri || 'unknown'}\n` +
          `  - Auth: ${this.socket?.auth?.token ? 'authenticated' : 'no auth'}\n` +
          `  - Previous execution ID: ${this.executionId || 'none'}`
      );

      // Re-subscribe if we were subscribed before
      if (this.executionId) {
        console.log(`🔔 [WebSocket] Auto-resubscribing to execution: ${this.executionId}`);
        this.socket!.emit('subscribe', { executionId: this.executionId });
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.connected.set(false);
      this.isConnecting = false;

      console.log(
        `🔌 [WebSocket] Disconnected:\n` +
          `  - Reason: ${reason}\n` +
          `  - Socket ID: ${this.socket?.id || 'unknown'}\n` +
          `  - Transport: ${this.socket?.io?.engine?.transport?.name || 'unknown'}\n` +
          `  - Execution ID: ${this.executionId || 'none'}\n` +
          `  - Will reconnect: ${reason !== 'io client disconnect'}`
      );

      // Clear connection timeout
      if (this.connectionAttemptTimeout) {
        clearTimeout(this.connectionAttemptTimeout);
        this.connectionAttemptTimeout = null;
      }

      if (reason !== 'io client disconnect') {
        this.error.set(`WebSocket disconnected: ${reason}. Attempting to reconnect...`);
      }
    });

    this.socket.on('connect_error', (error: Error & { data?: unknown }) => {
      console.error(
        `❌ [WebSocket] Connection error:\n` +
          `  - Error: ${error?.message || 'Unknown connection error'}\n` +
          `  - Data: ${typeof error?.data === 'string' ? error.data : JSON.stringify(error?.data) || 'none'}\n` +
          `  - Socket ID: ${this.socket?.id || 'unknown'}\n` +
          `  - Transport: ${this.socket?.io?.engine?.transport?.name || 'unknown'}\n` +
          `  - Reconnect attempt: ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
        error
      );
      const message =
        error?.message ||
        (typeof error?.data === 'string' ? error.data : 'Failed to connect to WebSocket server');
      this.error.set(`Connection error: ${message}`);
    });

    this.socket.on('connect_timeout', () => {
      console.error('WebSocket connect_timeout');
      this.error.set('WebSocket connection timed out');
    });

    this.socket.on('reconnect_error', (error: Error) => {
      console.error('WebSocket reconnect_error:', error);
      this.error.set(error.message || 'WebSocket reconnection error');
    });

    // Log events
    this.socket.on('logs:buffered', (data: LogEntry[]) => {
      console.log(
        `📦 [WebSocket] Received buffered logs:\n` +
          `  - Count: ${data.length}\n` +
          `  - Execution ID: ${this.executionId || 'none'}\n` +
          `  - Socket ID: ${this.socket?.id || 'unknown'}\n` +
          `  - Time range: ${data.length > 0 ? `${data[0]?.timestamp} to ${data[data.length - 1]?.timestamp}` : 'none'}`
      );
      this.logs.update((logs) => {
        // Merge existing logs with new buffered logs
        const allLogs = [...logs, ...data];
        const uniqueLogs = Array.from(
          new Map(allLogs.map((l) => [`${l.timestamp}-${l.message}`, l])).values()
        );
        return uniqueLogs.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    });

    this.socket.on('logs:historical', (data: LogEntry[]) => {
      this.logs.update((logs) => {
        console.log(
          `📦 [WebSocket] Received historical logs:\n` +
            `  - Count: ${data.length}\n` +
            `  - Execution ID: ${this.executionId || 'none'}\n` +
            `  - Socket ID: ${this.socket?.id || 'unknown'}\n` +
            `  - Time range: ${data.length > 0 ? `${data[0]?.timestamp} to ${data[data.length - 1]?.timestamp}` : 'none'}\n` +
            `  - Current logs count: ${logs.length}`
        );
        // Historical logs should come before existing logs (older)
        const allLogs = [...logs, ...data];
        const uniqueLogs = Array.from(
          new Map(allLogs.map((l) => [`${l.timestamp}-${l.message}`, l])).values()
        );
        return uniqueLogs.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    });

    this.socket.on('logs:new', (data: LogEntry) => {
      console.log(
        `📦 [WebSocket] Received new log:\n` +
          `  - Message: ${data.message || '[no message]'}\n` +
          `  - Phase: ${data.phase || 'unknown'}\n` +
          `  - Level: ${data.level || 'info'}\n` +
          `  - Timestamp: ${data.timestamp || 'missing'}\n` +
          `  - Execution ID: ${this.executionId || 'none'}\n` +
          `  - Socket ID: ${this.socket?.id || 'unknown'}`
      );

      // Validate log entry has required fields
      if (!data || !data.timestamp) {
        console.warn(
          `❌ [WebSocket] Invalid log entry received:\n` +
            `  - Data: ${JSON.stringify(data)}\n` +
            `  - Missing timestamp: ${!data?.timestamp}\n` +
            `  - Socket ID: ${this.socket?.id || 'unknown'}`
        );
        return;
      }

      this.logs.update((logs) => {
        // Ensure message is at least an empty string
        const validatedData = { ...data, message: data.message || '' };

        // Check if already exists
        const exists = logs.some(
          (l) => l.timestamp === validatedData.timestamp && l.message === validatedData.message
        );
        if (!exists) {
          // For real-time logs, we can add to the end if it's the newest
          const newLogs = [...logs, validatedData];
          // Only sort if the new log is not in chronological order
          const lastLogTime =
            logs.length > 0 ? new Date(logs[logs.length - 1].timestamp).getTime() : 0;
          const newLogTime = new Date(validatedData.timestamp).getTime();

          if (newLogTime < lastLogTime) {
            // Out of order, need to sort
            console.log('New log out of order, sorting...');
            return newLogs.sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          }
          // In order, just append
          return newLogs;
        }
        return logs;
      });
    });

    // Status and phase updates
    this.socket.on('status:changed', (data: { executionId: string; status: ExecutionStatus }) => {
      if (data.executionId === this.executionId) {
        // Normalize status to uppercase for consistency
        const normalizedStatus = (data.status?.toUpperCase() || 'PENDING') as ExecutionStatus;
        this.status.set(normalizedStatus);
      }
    });

    this.socket.on('phase:update', (data: PhaseInfo) => {
      console.log('Phase update received:', data);
      this.phases.update((phases) => {
        const index = phases.findIndex((p) => p.id === data.id || p.name === data.name);
        if (index >= 0) {
          phases[index] = { ...phases[index], ...data };
        } else {
          phases.push(data);
        }
        return [...phases];
      });
    });

    // Also listen for phases update event (plural)
    this.socket.on('phases:update', (data: PhaseInfo[]) => {
      console.log('Phases bulk update received:', data);
      this.phases.set(data);
    });

    // Subscription events
    this.socket.on('subscribed', (data: { executionId: string }) => {
      console.log(
        `🔔 [WebSocket] Successfully subscribed:\n` +
          `  - Execution ID: ${data.executionId}\n` +
          `  - Socket ID: ${this.socket?.id || 'unknown'}\n` +
          `  - Transport: ${this.socket?.io?.engine?.transport?.name || 'unknown'}`
      );
    });

    this.socket.on('unsubscribed', (data: { executionId: string }) => {
      console.log(
        `🔔 [WebSocket] Successfully unsubscribed:\n` +
          `  - Execution ID: ${data.executionId}\n` +
          `  - Socket ID: ${this.socket?.id || 'unknown'}\n` +
          `  - Transport: ${this.socket?.io?.engine?.transport?.name || 'unknown'}`
      );
    });

    // Error handling
    this.socket.on('error', (error: Error | { message?: string }) => {
      console.error(
        `❌ [WebSocket] Socket error:\n` +
          `  - Error: ${error instanceof Error ? error.message : error.message || 'Unknown socket error'}\n` +
          `  - Socket ID: ${this.socket?.id || 'unknown'}\n` +
          `  - Transport: ${this.socket?.io?.engine?.transport?.name || 'unknown'}\n` +
          `  - Execution ID: ${this.executionId || 'none'}\n` +
          `  - Connected: ${this.socket?.connected || false}`,
        error
      );
      const errorMessage =
        error instanceof Error ? error.message : error.message || 'WebSocket socket error occurred';
      this.error.set(`Socket error: ${errorMessage}`);
    });
  }

  private setupReconnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('reconnect_attempt', (attempt) => {
      this.reconnectAttempts = attempt;
      console.log(`Reconnection attempt ${attempt}`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnect_failed after maximum attempts');
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
    console.log(
      `🔔 [WebSocket] Subscribing to execution:\n` +
        `  - Execution ID: ${executionId}\n` +
        `  - Socket ID: ${this.socket?.id || 'unknown'}\n` +
        `  - Transport: ${this.socket?.io?.engine?.transport?.name || 'unknown'}\n` +
        `  - Connected: ${this.socket?.connected || false}`
    );

    // Request historical logs after subscribing
    // Try to request historical logs - backend might support this
    setTimeout(() => {
      if (this.socket && this.executionId === executionId) {
        console.log('Requesting historical logs for:', executionId);
        this.socket.emit('logs:request-historical', { executionId, limit: 1000 });
      }
    }, 100);
  }

  unsubscribe(): void {
    if (!this.socket || !this.executionId) return;

    console.log(
      `🔔 [WebSocket] Unsubscribing from execution:\n` +
        `  - Execution ID: ${this.executionId}\n` +
        `  - Socket ID: ${this.socket?.id || 'unknown'}\n` +
        `  - Transport: ${this.socket?.io?.engine?.transport?.name || 'unknown'}\n` +
        `  - Connected: ${this.socket?.connected || false}`
    );
    this.socket.emit('unsubscribe', { executionId: this.executionId });
    this.executionId = null;
    // Don't clear logs and phases here - let the component manage them
    // Only clear if explicitly disconnecting
  }

  disconnect(): void {
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.connectionAttemptTimeout) {
      clearTimeout(this.connectionAttemptTimeout);
      this.connectionAttemptTimeout = null;
    }

    this.unsubscribe();
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    // Clear data when disconnecting
    this.logs.set([]);
    this.phases.set([]);
    this.status.set('PENDING');
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
