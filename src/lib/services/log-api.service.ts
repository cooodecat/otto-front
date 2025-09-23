import api from '$lib/sdk';
import { makeFetch } from '$lib/utils/make-fetch';
import type {
  ExecutionMetadata,
  ExecutionListResponse,
  LogEntry
} from '$lib/types/log.types';

export class LogApiService {
  async getExecutions(params: {
    projectId: string;
    page?: number;
    pageSize?: number;
    type?: 'BUILD' | 'DEPLOY' | 'ALL';
    status?: string;
  }): Promise<ExecutionListResponse> {
    // SDK를 사용하여 executions 가져오기
    const executions = await api.functional.logs.executions.getExecutions(
      makeFetch({ fetch: window.fetch }),
      params.status as 'pending' | 'running' | 'success' | 'failed' | undefined,
      params.type?.toLowerCase() as 'build' | 'deploy' | undefined,
      undefined, // pipelineId
      params.projectId,
      params.pageSize || 20,
      ((params.page || 1) - 1) * (params.pageSize || 20) // offset 계산
    );

    // ExecutionResponseDto[] to ExecutionListResponse 변환
    const data: ExecutionMetadata[] = executions.map(exec => ({
      id: exec.executionId,
      projectId: exec.projectId,
      pipelineId: exec.pipelineId,
      type: exec.executionType.toUpperCase() as 'BUILD' | 'DEPLOY',
      status: exec.status.toUpperCase() as 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED',
      startTime: exec.startedAt,
      endTime: exec.completedAt || null,
      duration: exec.completedAt && exec.startedAt 
        ? Math.floor((new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime()) / 1000)
        : 0,
      buildNumber: exec.awsBuildId?.split(':').pop() || '0',
      branch: exec.metadata?.branch || 'main',
      commit: exec.metadata?.commitId || '',
      triggeredBy: exec.metadata?.triggeredBy || 'unknown',
      logCount: exec.logCount || 0,
      phases: [],
      metadata: exec.metadata || {}
    }));
    
    return {
      executions: data,
      total: executions.length,
      page: params.page || 1,
      pageSize: params.pageSize || 20
    };
  }

  async getExecutionById(executionId: string): Promise<ExecutionMetadata> {
    const connection = makeFetch({ fetch: window.fetch });
    const execution = await api.functional.logs.executions.getExecutionById(
      connection,
      executionId
    );

    return {
      id: execution.executionId,
      projectId: execution.projectId,
      pipelineId: execution.pipelineId,
      type: execution.executionType.toUpperCase() as 'BUILD' | 'DEPLOY',
      status: execution.status.toUpperCase() as 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED',
      startTime: execution.startedAt,
      endTime: execution.completedAt || null,
      duration: execution.completedAt && execution.startedAt 
        ? Math.floor((new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000)
        : 0,
      buildNumber: execution.awsBuildId?.split(':').pop() || '0',
      branch: execution.metadata?.branch || 'main',
      commit: execution.metadata?.commitId || '',
      triggeredBy: execution.metadata?.triggeredBy || 'unknown',
      logCount: execution.logCount || 0,
      phases: [],
      metadata: execution.metadata || {}
    };
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
    const connection = makeFetch({ fetch: window.fetch });
    const response = await api.functional.logs.executions.logs.getExecutionLogs(
      connection,
      executionId,
      {
        limit: params?.limit || 100,
        offset: params?.offset || 0
      }
    );

    // response는 any 타입이므로 적절히 처리
    if (!response || !response.logs) {
      return [];
    }

    return response.logs.map((log: any) => ({
      id: log.logId || log.id,
      timestamp: log.timestamp,
      level: log.level as 'info' | 'warning' | 'error',
      message: log.message,
      phase: log.metadata?.phase || undefined,
      metadata: log.metadata || {}
    }));
  }

  async getArchivedLogUrl(executionId: string): Promise<string> {
    const connection = makeFetch({ fetch: window.fetch });
    const response = await api.functional.logs.executions.archive_url.getArchiveUrl(
      connection,
      executionId
    );
    return response.url;
  }

  // Mock data generators for development
  generateMockExecution(id: string): ExecutionMetadata {
    const types: Array<'BUILD' | 'DEPLOY'> = ['BUILD', 'DEPLOY'];
    const statuses = ['SUCCESS', 'FAILED', 'RUNNING', 'PENDING'];
    const type = types[Math.floor(Math.random() * types.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      id,
      projectId: 'test-project-123',
      pipelineId: 'test-pipeline-456',
      type,
      status,
      startTime: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      endTime: status !== 'RUNNING' ? new Date().toISOString() : null,
      duration: Math.floor(Math.random() * 300),
      buildNumber: Math.floor(Math.random() * 1000).toString(),
      branch: 'main',
      commit: 'abc123def456',
      triggeredBy: 'john.doe',
      logCount: Math.floor(Math.random() * 1000),
      phases: [],
      metadata: {}
    };
  }

  generateMockLogs(count: number = 50): LogEntry[] {
    const logs: LogEntry[] = [];
    const levels: Array<'info' | 'warning' | 'error'> = ['info', 'warning', 'error'];
    const phases = ['PROVISIONING', 'DOWNLOAD_SOURCE', 'BUILD', 'POST_BUILD', 'UPLOAD_ARTIFACTS'];

    for (let i = 0; i < count; i++) {
      logs.push({
        id: `log-${i}`,
        timestamp: new Date(Date.now() - (count - i) * 1000).toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        message: `Mock log message ${i}: Processing task...`,
        phase: phases[Math.floor(i / (count / phases.length))],
        metadata: {}
      });
    }

    return logs;
  }
}

export const logApiService = new LogApiService();