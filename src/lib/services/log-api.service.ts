import type {
  ExecutionMetadata,
  ExecutionListResponse,
  LogEntry,
  ExecutionLog
} from '$lib/types/log.types';
import { PUBLIC_API_URL, PUBLIC_BACKEND_URL } from '$env/static/public';

const API_BASE_URL =
  PUBLIC_API_URL || `${PUBLIC_BACKEND_URL}/api/v1` || 'http://localhost:4000/api/v1';

export class LogApiService {
  private async fetchWithAuth(
    url: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<Response> {
    // Get auth token from localStorage (if using Bearer) or rely on cookies
    const token = localStorage.getItem('auth_token') || '';

    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          credentials: 'include', // Include cookies in the request
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers
          }
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Request failed' }));
          throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  // Execution endpoints
  async getExecutions(params: {
    projectId: string;
    page?: number;
    pageSize?: number;
    type?: 'BUILD' | 'DEPLOY' | 'ALL';
    status?: string;
  }): Promise<ExecutionListResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.type && params.type !== 'ALL') queryParams.append('type', params.type);
    if (params.status) queryParams.append('status', params.status);

    const response = await this.fetchWithAuth(`${API_BASE_URL}/logs/executions?${queryParams}`);

    return response.json();
  }

  async getExecutionById(executionId: string): Promise<ExecutionMetadata> {
    const response = await this.fetchWithAuth(`${API_BASE_URL}/logs/executions/${executionId}`);

    return response.json();
  }

  async getExecutionLogs(
    executionId: string,
    params?: {
      limit?: number;
      offset?: number;
      level?: string;
      phase?: string;
    }
  ): Promise<LogEntry[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.level) queryParams.append('level', params.level);
    if (params?.phase) queryParams.append('phase', params.phase);

    const response = await this.fetchWithAuth(
      `${API_BASE_URL}/logs/executions/${executionId}/logs?${queryParams}`
    );

    return response.json();
  }

  async getArchiveUrl(executionId: string): Promise<{ url: string }> {
    const response = await this.fetchWithAuth(
      `${API_BASE_URL}/logs/executions/${executionId}/archive-url`
    );

    return response.json();
  }

  // Pipeline endpoints
  async getPipelineInfo(pipelineId: string): Promise<any> {
    const response = await this.fetchWithAuth(`${API_BASE_URL}/pipelines/${pipelineId}`);

    return response.json();
  }

  // Artifacts endpoints
  async getArtifacts(executionId: string): Promise<any[]> {
    const response = await this.fetchWithAuth(
      `${API_BASE_URL}/logs/executions/${executionId}/artifacts`
    );

    return response.json();
  }

  async downloadArtifact(executionId: string, artifactId: string): Promise<Blob> {
    const response = await this.fetchWithAuth(
      `${API_BASE_URL}/logs/executions/${executionId}/artifacts/${artifactId}/download`,
      { method: 'GET' }
    );

    return response.blob();
  }

  // Utility methods
  async downloadLogs(executionId: string): Promise<void> {
    try {
      const logs = await this.getExecutionLogs(executionId, { limit: 10000 });

      const logText = logs
        .map(
          (log) =>
            `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] ${log.message}`
        )
        .join('\n');

      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `execution-${executionId}.log`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download logs:', error);
      throw error;
    }
  }

  // Re-run execution
  async rerunExecution(executionId: string): Promise<ExecutionMetadata> {
    const response = await this.fetchWithAuth(
      `${API_BASE_URL}/logs/executions/${executionId}/rerun`,
      { method: 'POST' }
    );

    return response.json();
  }
}

// Singleton instance
export const logApiService = new LogApiService();
