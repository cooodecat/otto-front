import api from '$lib/sdk';
import { makeFetch } from '$lib/utils/make-fetch';
import type {
  ExecutionMetadata,
  ExecutionListResponse as _ExecutionListResponse,
  LogEntry,
  PhaseName,
  ExecutionType,
  ExecutionStatus,
  TriggerType
} from '$lib/types/log.types';
import type { ExecutionResponseDto } from '$lib/sdk/structures/ExecutionResponseDto';

export class LogApiService {
  // Helpers to extract commit info from varying backend schemas
  private pickString(obj: unknown, keys: string[]): string | undefined {
    if (!obj) return undefined;
    for (const k of keys) {
      if (k in obj && typeof obj[k] === 'string' && obj[k]) return String(obj[k]);
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
      params.status as 'pending' | 'running' | 'success' | 'failed' | undefined,
      params.type?.toLowerCase() as 'build' | 'deploy' | undefined,
      undefined, // pipelineId
      params.projectId,
      params.pageSize, // 이제 선택적 매개변수
      params.page ? (params.page - 1) * (params.pageSize || 20) : undefined // offset 계산
    );

    // ExecutionResponseDto[] to ExecutionMetadata[] 변환
    return executions.map((exec: ExecutionResponseDto, index: number) => ({
      executionId: exec.executionId,
      buildNumber: parseInt(exec.metadata?.buildNumber as string) || executions.length - index,
      executionType: exec.executionType.toUpperCase() as ExecutionType,
      status: exec.status.toUpperCase() as ExecutionStatus,
      startedAt: exec.startedAt,
      completedAt: exec.completedAt,
      duration:
        exec.completedAt && exec.startedAt
          ? Math.floor(
              (new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime()) / 1000
            )
          : 0,
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

  async getExecutionById(executionId: string): Promise<ExecutionMetadata> {
    const connection = makeFetch();
    console.log('API Call - Getting execution by ID:', executionId);
    console.log('API Connection:', connection);

    const execution = await api.functional.logs.executions.getExecutionById(
      connection,
      executionId
    );

    console.log('API Response - Raw execution data:', execution);

    return {
      executionId: execution.executionId,
      buildNumber:
        parseInt(execution.metadata?.buildNumber as string) || Math.floor(Math.random() * 1000) + 1,
      executionType: execution.executionType.toUpperCase() as ExecutionType,
      status: execution.status.toUpperCase() as ExecutionStatus,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      duration:
        execution.completedAt && execution.startedAt
          ? Math.floor(
              (new Date(execution.completedAt).getTime() -
                new Date(execution.startedAt).getTime()) /
                1000
            )
          : 0,
      branch: (execution.metadata?.branch as string) || 'main',
      commitId: this.extractCommitId(execution) || '',
      commitMessage: this.extractCommitMessage(execution) || '',
      author:
        (execution.metadata && 'author' in execution.metadata
          ? String(execution.metadata.author)
          : '') || '',
      pipelineId: execution.pipelineId,
      pipelineName:
        (execution.metadata && 'pipelineName' in execution.metadata
          ? String(execution.metadata.pipelineName)
          : '') || '',
      triggeredBy: (execution.metadata?.triggeredBy || 'manual') as TriggerType,
      logStats: {
        totalLines: execution.logCount || 0,
        errorCount: 0,
        warningCount: 0
      },
      metadata: execution.metadata
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
    const connection = makeFetch();
    const response = await api.functional.logs.executions.logs.getExecutionLogs(
      connection,
      executionId,
      {
        limit: params?.limit || 100
      }
    );

    // response 타입 체크
    if (
      !response ||
      typeof response !== 'object' ||
      !('logs' in response) ||
      !Array.isArray(response.logs)
    ) {
      return [];
    }

    interface LogResponse {
      timestamp: string;
      level: string;
      message: string;
      metadata?: { phase?: string };
    }

    return response.logs.map((log: LogResponse) => ({
      timestamp: log.timestamp,
      level: log.level as 'info' | 'warning' | 'error',
      message: log.message,
      phase: log.metadata?.phase as PhaseName | undefined
    }));
  }

  async getArchivedLogUrl(executionId: string): Promise<string> {
    const connection = makeFetch();
    const response = await api.functional.logs.executions.archive_url.getArchiveUrl(
      connection,
      executionId
    );
    return response.url;
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
}

export const logApiService = new LogApiService();
