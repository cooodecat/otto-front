// Execution Types
export type ExecutionType = 'BUILD' | 'DEPLOY' | 'PIPELINE';
export type ExecutionStatus = 'SUCCESS' | 'FAILED' | 'RUNNING' | 'PENDING';
export type TriggerType = 'webhook' | 'manual' | 'schedule';
export type LogLevel = 'info' | 'warning' | 'error';

// Phase Types
export type PhaseName = 'PREPARING' | 'BUILDING' | 'TESTING' | 'FINALIZING';
export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed';

// Main Interfaces
export interface ExecutionMetadata {
  // Basic info
  executionId: string;
  buildNumber: number;
  executionType: ExecutionType;
  status: ExecutionStatus;

  // Time info
  startedAt: string;
  completedAt?: string;
  duration: number; // seconds

  // Git info
  branch: string;
  commitId: string; // short hash
  commitMessage: string;
  author: string;

  // Pipeline info
  pipelineId: string;
  pipelineName: string;

  // Execution info
  triggeredBy: TriggerType;

  // Statistics
  logStats: {
    totalLines: number;
    errorCount: number;
    warningCount: number;
  };
}

export interface PhaseInfo {
  id: string;
  name: PhaseName;
  status: PhaseStatus;
  startTime?: string;
  endTime?: string;
  duration?: number;
  progress?: number; // 0-100 for running phase
  subSteps?: Array<{
    name: string;
    completed: boolean;
  }>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  phase?: PhaseName;
}

export interface ExecutionLog {
  executionId: string;
  metadata: ExecutionMetadata;
  phases: PhaseInfo[];
  logs: LogEntry[];
}

// Filter Types
export interface LogFilter {
  level?: LogLevel;
  phase?: PhaseName;
  search?: string;
}

// API Response Types
export interface ExecutionListResponse {
  executions: ExecutionMetadata[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LogStreamEvent {
  type: 'log' | 'phase' | 'status';
  data: LogEntry | PhaseInfo | { status: ExecutionStatus };
}

// Component Props Types
export interface ExecutionItemProps {
  execution: ExecutionMetadata;
  isSelected: boolean;
  onSelect: (executionId: string) => void;
}

export interface PhaseTimelineProps {
  phases: PhaseInfo[];
  currentPhase?: string;
  onPhaseClick?: (phaseId: string) => void;
}

export interface LogViewerProps {
  logs: LogEntry[];
  filter?: LogFilter;
  autoScroll?: boolean;
}

// WebSocket Event Types
export interface WebSocketEvents {
  // Client to Server
  'execution:subscribe': { executionId: string };
  'execution:unsubscribe': { executionId: string };
  'logs:request-historical': { executionId: string; limit?: number };

  // Server to Client
  'logs:buffered': LogEntry[];
  'logs:new': LogEntry;
  'logs:historical': LogEntry[];
  'status:changed': { executionId: string; status: ExecutionStatus };
  'phase:update': PhaseInfo;
}

// Utility Types
export interface DateGroup<T> {
  date: string;
  items: T[];
}

export type ExecutionGroup = DateGroup<ExecutionMetadata>;
