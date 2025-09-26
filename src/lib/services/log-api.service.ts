import api from '$lib/sdk';
import { makeFetch } from '$lib/utils/make-fetch';
import type {
  ExecutionMetadata,
  ExecutionListResponse as _ExecutionListResponse,
  LogEntry,
  ExecutionType,
  ExecutionStatus,
  TriggerType
} from '$lib/types/log.types';

export class LogApiService {
  // Helpers to extract commit info from varying backend schemas
  private pickString(obj: unknown, keys: string[]): string | undefined {
    if (!obj || typeof obj !== 'object') return undefined;
    const record = obj as Record<string, unknown>;
    for (const k of keys) {
      if (k in record && typeof record[k] === 'string' && record[k]) return String(record[k]);
    }
    return undefined;
  }

  private extractFromMetadataLike(exec: Record<string, unknown>): {
    commitId?: string;
    commitMessage?: string;
  } {
    const meta = exec?.metadata ?? exec?.meta ?? {};
    const commitId =
      this.pickString(meta, ['commitId', 'commit_id', 'commitSha', 'commitSHA', 'sha', 'commit']) ||
      this.pickString(exec, ['commitId', 'commit_id', 'commitSha', 'commitSHA', 'sha', 'commit']);
    const commitMessage =
      this.pickString(meta, ['commitMessage', 'commit_message', 'message']) ||
      this.pickString(exec, ['commitMessage', 'commit_message', 'message']);
    return { commitId, commitMessage };
  }

  // Standalone helpers for use below
  extractCommitId(exec: Record<string, unknown>): string | undefined {
    return this.extractFromMetadataLike(exec).commitId;
  }
  extractCommitMessage(exec: Record<string, unknown>): string | undefined {
    return this.extractFromMetadataLike(exec).commitMessage;
  }
  async getExecutions(params: {
    projectId: string;
    page?: number;
    pageSize?: number;
    type?: 'BUILD' | 'DEPLOY' | 'ALL';
    status?: string;
  }): Promise<ExecutionMetadata[]> {
    // SDK를 사용하여 executions 가져오기
    // makeFetch가 자동으로 credentials: 'include'를 설정하므로 쿠키가 전송됨
    const executions = await api.functional.logs.executions.getExecutions(
      makeFetch(),
      {
        status: params.status,
        executionType: params.type?.toLowerCase(),
        projectId: params.projectId,
        limit: params.pageSize,
        offset: params.page ? (params.page - 1) * (params.pageSize || 20) : undefined
      }
    );

    // API response to ExecutionMetadata[] 변환
    return executions.map((exec, index: number) => ({
      executionId: exec.executionId,
      buildNumber: parseInt(exec.metadata?.buildNumber as string) || executions.length - index,
      executionType: exec.executionType.toUpperCase() as ExecutionType,
      status: exec.status.toUpperCase() as ExecutionStatus,
      startedAt: exec.startedAt,
      completedAt: exec.completedAt,
      updatedAt: exec.updatedAt,
      duration: (() => {
        // First try metadata.duration
        if (
          exec.metadata?.duration &&
          typeof exec.metadata.duration === 'number' &&
          exec.metadata.duration > 0
        ) {
          return exec.metadata.duration;
        }

        // Prefer updatedAt - startedAt (always available and more reliable)
        if (exec.updatedAt && exec.startedAt) {
          const start = new Date(exec.startedAt).getTime();
          const end = new Date(exec.updatedAt).getTime();
          const seconds = Math.floor((end - start) / 1000);
          // Only return if positive
          if (seconds > 0) return seconds;
        }

        // Fallback to completedAt - startedAt if available
        if (exec.completedAt && exec.startedAt) {
          const start = new Date(exec.startedAt).getTime();
          const end = new Date(exec.completedAt).getTime();
          const seconds = Math.floor((end - start) / 1000);
          // Only return if positive
          if (seconds > 0) return seconds;
        }

        return 0;
      })(),
      branch: (exec.metadata?.branch as string) || 'main',
      commitId: this.extractCommitId(exec) || '',
      commitMessage: this.extractCommitMessage(exec) || '',
      author:
        (exec.metadata && 'author' in exec.metadata ? String(exec.metadata.author) : '') || '',
      pipelineId: exec.pipelineId,
      pipelineName:
        (exec.metadata && 'pipelineName' in exec.metadata
          ? String(exec.metadata.pipelineName)
          : '') || '',
      triggeredBy: (exec.metadata?.triggeredBy || 'manual') as TriggerType,
      logStats: {
        totalLines: exec.logCount || 0,
        errorCount: 0,
        warningCount: 0
      },
      metadata: exec.metadata
    }));
  }

  async getExecutionById(executionId: string): Promise<ExecutionMetadata | null> {
    // Get single execution by filtering from getExecutions
    const executions = await this.getExecutions({ projectId: '', pageSize: 1000 });
    const execution = executions.find(exec => exec.executionId === executionId);
    return execution || null;
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
    interface LogResponse {
      timestamp?: unknown;
      level?: unknown;
      message?: unknown;
      phase?: unknown;
      step?: unknown;
      stepOrder?: unknown;
      metadata?: {
        phase?: string;
        step?: string;
        stepOrder?: number;
      };
    }
    const connection = makeFetch();
    const response = await api.functional.logs.executions.getExecutionLogs(
      connection,
      executionId,
      {
        limit: params?.limit || 1000,
        offset: params?.offset,
        level: params?.level
      }
    );

    console.log('Raw API response for logs:', response);

    // Check if response is an array directly
    if (Array.isArray(response)) {
      console.log('Response is array, processing directly');
      return response.map((log: LogResponse) => ({
        timestamp: String(log.timestamp || ''),
        level: (log.level || 'info') as 'info' | 'warning' | 'error',
        message: String(log.message || ''),
        phase: log.phase
          ? String(log.phase)
          : log.metadata?.phase
            ? String(log.metadata.phase)
            : undefined,
        step: log.step
          ? String(log.step)
          : log.metadata?.step
            ? String(log.metadata.step)
            : undefined,
        stepOrder: log.stepOrder
          ? Number(log.stepOrder)
          : log.metadata?.stepOrder
            ? Number(log.metadata.stepOrder)
            : undefined
      }));
    }

    // Check for logs property
    if (
      response &&
      typeof response === 'object' &&
      'logs' in response &&
      Array.isArray(response.logs)
    ) {
      console.log('Response has logs property, processing logs array');
      return (response as { logs: LogResponse[] }).logs.map((log: LogResponse) => ({
        timestamp: String(log.timestamp || ''),
        level: (log.level || 'info') as 'info' | 'warning' | 'error',
        message: String(log.message || ''),
        phase: log.phase
          ? String(log.phase)
          : log.metadata?.phase
            ? String(log.metadata.phase)
            : undefined,
        step: log.step
          ? String(log.step)
          : log.metadata?.step
            ? String(log.metadata.step)
            : undefined,
        stepOrder: log.stepOrder
          ? Number(log.stepOrder)
          : log.metadata?.stepOrder
            ? Number(log.metadata.stepOrder)
            : undefined
      }));
    }

    // Check for data property
    if (
      response &&
      typeof response === 'object' &&
      'data' in response &&
      Array.isArray(response.data)
    ) {
      console.log('Response has data property, processing data array');
      return (response as { data: LogResponse[] }).data.map((log: LogResponse) => ({
        timestamp: String(log.timestamp || ''),
        level: (log.level || 'info') as 'info' | 'warning' | 'error',
        message: String(log.message || ''),
        phase: log.phase
          ? String(log.phase)
          : log.metadata?.phase
            ? String(log.metadata.phase)
            : undefined,
        step: log.step
          ? String(log.step)
          : log.metadata?.step
            ? String(log.metadata.step)
            : undefined,
        stepOrder: log.stepOrder
          ? Number(log.stepOrder)
          : log.metadata?.stepOrder
            ? Number(log.metadata.stepOrder)
            : undefined
      }));
    }

    console.warn('Unexpected response format for logs:', response);
    return [];
  }

  async getEcsLogs(pipelineId: string, params?: {
    limit?: number;
    startTime?: string;
    endTime?: string;
  }) {
    const connection = makeFetch();
    return await api.functional.logs.ecs.getEcsLogs(connection, pipelineId, {
      limit: params?.limit,
      startTime: params?.startTime,
      endTime: params?.endTime,
    });
  }

  async getEcsLogsByExecution(executionId: string, params?: {
    limit?: number;
  }) {
    const connection = makeFetch();
    return await api.functional.logs.ecs.execution.getEcsLogsByExecution(connection, executionId, {
      limit: params?.limit,
    });
  }

  async getEcsRuntimeLogsByExecution(executionId: string, params?: {
    limit?: number;
    containerName?: string;
    streamPrefix?: string;
    startTime?: string;
    endTime?: string;
  }) {
    const connection = makeFetch();
    return await api.functional.logs.ecs.execution.runtime.getEcsRuntimeLogsByExecution(connection, executionId, {
      limit: params?.limit,
      containerName: params?.containerName,
      streamPrefix: params?.streamPrefix,
      startTime: params?.startTime,
      endTime: params?.endTime,
    });
  }

  async getArchivedLogUrl(executionId: string): Promise<string> {
    // TODO: Implement when archive_url endpoint is available in SDK
    console.log('Archive URL requested for execution:', executionId);
    return '';
  }

  // Mock data generators for development
  generateMockExecution(id: string): ExecutionMetadata {
    const types: Array<'BUILD' | 'DEPLOY' | 'PIPELINE'> = ['BUILD', 'DEPLOY', 'PIPELINE'];
    const statuses: Array<'SUCCESS' | 'FAILED' | 'RUNNING' | 'PENDING'> = [
      'SUCCESS',
      'FAILED',
      'RUNNING',
      'PENDING'
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      executionId: id,
      buildNumber: Math.floor(Math.random() * 1000),
      executionType: type,
      status,
      startedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      completedAt: status !== 'RUNNING' ? new Date().toISOString() : undefined,
      duration: Math.floor(Math.random() * 300),
      branch: 'main',
      commitId: 'abc123def456',
      commitMessage: 'feat: add new feature',
      author: 'John Doe',
      pipelineId: 'test-pipeline-456',
      pipelineName: 'CI/CD Pipeline',
      triggeredBy: 'webhook',
      logStats: {
        totalLines: Math.floor(Math.random() * 1000),
        errorCount: Math.floor(Math.random() * 10),
        warningCount: Math.floor(Math.random() * 20)
      }
    };
  }


  generateMockLogs(count: number = 50): LogEntry[] {
    const logs: LogEntry[] = [];
    const levels: Array<'info' | 'warning' | 'error'> = ['info', 'warning', 'error'];
    const phases: Array<'PREPARING' | 'BUILDING' | 'TESTING' | 'FINALIZING'> = [
      'PREPARING',
      'BUILDING',
      'TESTING',
      'FINALIZING'
    ];

    for (let i = 0; i < count; i++) {
      logs.push({
        timestamp: new Date(Date.now() - (count - i) * 1000).toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        message: `Mock log message ${i}: Processing task...`,
        phase: phases[Math.floor(i / (count / phases.length))]
      });
    }

    return logs;
  }

  private mapStatusForUpdate(
    status: ExecutionStatus | 'PENDING'
  ): 'pending' | 'running' | 'success' | 'failed' {
    switch (status?.toUpperCase()) {
      case 'RUNNING':
        return 'running';
      case 'SUCCESS':
      case 'SUCCEEDED':
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
      case 'CANCELLED':
        return 'failed';
      case 'PENDING':
      default:
        return 'pending';
    }
  }

  async updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus,
    options: {
      errorMessage?: string;
      metadata?: Record<string, unknown>;
      archiveUrl?: string;
      completedAt?: string;
    } = {}
  ): Promise<void> {
    const payload = {
      status: this.mapStatusForUpdate(status),
      ...(options.errorMessage ? { errorMessage: options.errorMessage } : {}),
      ...(options.metadata ? { metadata: options.metadata } : {}),
      ...(options.archiveUrl ? { archiveUrl: options.archiveUrl } : {}),
      ...(options.completedAt ? { completedAt: options.completedAt } : {})
    };

    try {
      await api.functional.logs.executions.status.updateExecutionStatus(
        makeFetch(),
        executionId,
        payload as {
          status: 'pending' | 'running' | 'success' | 'failed';
          completedAt?: string;
          metadata?: Record<string, unknown>;
          errorMessage?: string;
          archiveUrl?: string;
        }
      );
    } catch (err) {
      console.error('Failed to update execution status:', err);
      throw err;
    }
  }
}

export const logApiService = new LogApiService();
