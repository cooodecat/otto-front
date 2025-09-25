import type { LogEntry } from '$lib/types/log.types';

// Extended LogEntry type with normalized fields
interface NormalizedLogEntry extends LogEntry {
  normalizedPhase?: string;
  normalizedStep?: string;
}

export interface LogPhaseGroup {
  phase: string;
  displayName: string;
  logs: LogEntry[];
  startTime?: string;
  endTime?: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  steps: LogStepGroup[];
  stats: {
    errorCount: number;
    warningCount: number;
    totalCount: number;
  };
}

export interface LogStepGroup {
  step: string;
  logs: LogEntry[];
  order: number;
}

export class LogGroupingService {
  private static readonly PHASE_DISPLAY_NAMES: Record<string, string> = {
    DOWNLOAD_SOURCE: 'Downloading Source',
    INSTALL: 'Installing Dependencies',
    PRE_BUILD: 'Pre-build Setup',
    BUILD: 'Building Application',
    POST_BUILD: 'Post-build Tasks',
    UPLOAD_ARTIFACTS: 'Uploading Artifacts',
    FINALIZING: 'Finalizing',
    OTHER: 'Other Tasks'
  };

  private static readonly PHASE_ORDER = [
    'DOWNLOAD_SOURCE',
    'INSTALL',
    'PRE_BUILD',
    'BUILD',
    'POST_BUILD',
    'UPLOAD_ARTIFACTS',
    'FINALIZING',
    'OTHER'
  ];

  private static readonly PHASE_MAPPING: Record<string, string> = {
    PREPARING: 'DOWNLOAD_SOURCE',
    DOWNLOADING: 'DOWNLOAD_SOURCE',
    DOWNLOAD_SOURCE: 'DOWNLOAD_SOURCE',
    INSTALL: 'INSTALL',
    PRE_BUILD: 'PRE_BUILD',
    BUILDING: 'BUILD',
    BUILD: 'BUILD',
    POST_BUILD: 'POST_BUILD',
    UPLOAD: 'UPLOAD_ARTIFACTS',
    UPLOAD_ARTIFACTS: 'UPLOAD_ARTIFACTS',
    FINALIZING: 'FINALIZING',
    OTHER: 'OTHER'
  };

  static normalizePhase(phase?: string): string {
    if (!phase) return 'OTHER';
    const upperPhase = phase.toUpperCase();
    return this.PHASE_MAPPING[upperPhase] || upperPhase;
  }

  static getPhaseDisplayName(phase: string): string {
    return this.PHASE_DISPLAY_NAMES[phase] || phase.replace(/_/g, ' ');
  }

  static groupLogsByPhase(logs: LogEntry[]): LogPhaseGroup[] {
    // Sort logs by timestamp first
    const sortedLogs = [...logs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Track current phase as we process logs
    let currentPhase: string | undefined = undefined;
    let currentStep: string | undefined = undefined;

    // Process each log to determine its phase
    const processedLogs = sortedLogs.map((log) => {
      const msg = log.message || '';

      // Check for phase transition markers
      const phaseEnter = msg.match(/Entering phase\s+([A-Z_]+)/i);
      const phaseComplete = msg.match(/Phase complete:?\s*([A-Z_]+)/i);

      if (phaseEnter?.[1]) {
        currentPhase = this.normalizePhase(phaseEnter[1]);
      }
      if (phaseComplete?.[1]) {
        currentPhase = this.normalizePhase(phaseComplete[1]);
      }

      // Update phase from log data if available
      if (log.phase) {
        currentPhase = this.normalizePhase(log.phase);
      }

      // Detect step changes
      if (/Running command/i.test(msg)) {
        currentStep = 'Command Execution';
      } else if (/Downloading|Installing/i.test(msg)) {
        currentStep = 'Setup';
      } else if (/Building|Compiling/i.test(msg)) {
        currentStep = 'Build Process';
      }

      if (log.step) {
        currentStep = log.step;
      }

      return {
        ...log,
        normalizedPhase: currentPhase || 'OTHER',
        normalizedStep: currentStep || 'General'
      } as NormalizedLogEntry;
    });

    // Group logs by phase
    const phaseGroups = new Map<string, LogEntry[]>();

    // Initialize all known phases
    this.PHASE_ORDER.forEach((phase) => {
      phaseGroups.set(phase, []);
    });

    // Add logs to their respective phases
    processedLogs.forEach((log) => {
      const phase = log.normalizedPhase || 'OTHER';
      if (!phaseGroups.has(phase)) {
        phaseGroups.set(phase, []);
      }
      phaseGroups.get(phase)!.push(log);
    });

    // Convert to LogPhaseGroup array
    const groups: LogPhaseGroup[] = [];

    phaseGroups.forEach((phaseLogs, phase) => {
      if (phaseLogs.length === 0) return;

      // Group by steps within phase
      const stepGroups = new Map<string, LogEntry[]>();
      let stepOrder = 0;
      const stepOrderMap = new Map<string, number>();

      phaseLogs.forEach((log) => {
        const step = (log as NormalizedLogEntry).normalizedStep || 'General';
        if (!stepGroups.has(step)) {
          stepGroups.set(step, []);
          stepOrderMap.set(step, stepOrder++);
        }
        stepGroups.get(step)!.push(log);
      });

      const steps: LogStepGroup[] = Array.from(stepGroups.entries())
        .map(([step, logs]) => ({
          step,
          logs,
          order: stepOrderMap.get(step) || 999
        }))
        .sort((a, b) => a.order - b.order);

      // Calculate stats
      const errorCount = phaseLogs.filter((l) => l.level === 'error').length;
      const warningCount = phaseLogs.filter((l) => l.level === 'warning').length;

      // Determine phase status
      let status: LogPhaseGroup['status'] = 'pending';
      if (errorCount > 0) {
        status = 'failed';
      } else if (phaseLogs.some((l) => /Phase complete|Succeeded/i.test(l.message || ''))) {
        status = 'success';
      } else if (phaseLogs.length > 0) {
        // Check if a later phase has logs (meaning this one is complete)
        const phaseIndex = this.PHASE_ORDER.indexOf(phase);
        const hasLaterPhase = this.PHASE_ORDER.slice(phaseIndex + 1).some(
          (laterPhase) => phaseGroups.get(laterPhase)?.length ?? 0 > 0
        );
        status = hasLaterPhase ? 'success' : 'running';
      }

      groups.push({
        phase,
        displayName: this.getPhaseDisplayName(phase),
        logs: phaseLogs,
        startTime: phaseLogs[0]?.timestamp,
        endTime: phaseLogs[phaseLogs.length - 1]?.timestamp,
        status,
        steps,
        stats: {
          errorCount,
          warningCount,
          totalCount: phaseLogs.length
        }
      });
    });

    // Sort groups by phase order
    return groups.sort((a, b) => {
      const indexA = this.PHASE_ORDER.indexOf(a.phase);
      const indexB = this.PHASE_ORDER.indexOf(b.phase);
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // Fallback to timestamp
      const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
      const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
      return timeA - timeB;
    });
  }

  static filterLogGroups(
    groups: LogPhaseGroup[],
    searchQuery?: string,
    level?: 'all' | 'error' | 'warning' | 'info'
  ): LogPhaseGroup[] {
    if (!searchQuery?.trim() && (!level || level === 'all')) {
      return groups;
    }

    return groups
      .map((group) => {
        let filteredLogs = group.logs;

        // Filter by level
        if (level && level !== 'all') {
          filteredLogs = filteredLogs.filter((log) => log.level === level);
        }

        // Filter by search query
        if (searchQuery?.trim()) {
          const query = searchQuery.toLowerCase();
          filteredLogs = filteredLogs.filter((log) => {
            const message = (log.message || '').toLowerCase();
            const phase = group.phase.toLowerCase();
            return message.includes(query) || phase.includes(query);
          });
        }

        // Rebuild steps with filtered logs
        const stepGroups = new Map<string, LogEntry[]>();
        filteredLogs.forEach((log) => {
          const step = (log as NormalizedLogEntry).normalizedStep || 'General';
          if (!stepGroups.has(step)) {
            stepGroups.set(step, []);
          }
          stepGroups.get(step)!.push(log);
        });

        const steps = Array.from(stepGroups.entries()).map(([step, logs], index) => ({
          step,
          logs,
          order: index
        }));

        return {
          ...group,
          logs: filteredLogs,
          steps,
          stats: {
            errorCount: filteredLogs.filter((l) => l.level === 'error').length,
            warningCount: filteredLogs.filter((l) => l.level === 'warning').length,
            totalCount: filteredLogs.length
          }
        };
      })
      .filter((group) => group.logs.length > 0);
  }
}
