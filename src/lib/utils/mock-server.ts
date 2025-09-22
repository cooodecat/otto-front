import type { LogEntry, PhaseInfo, ExecutionMetadata } from '$lib/types/log.types';

/**
 * Mock WebSocket server simulator for testing real-time log streaming
 */
export class MockLogServer {
	private interval: ReturnType<typeof setInterval> | null = null;
	private phaseIndex = 0;
	private logIndex = 0;
	private onLogCallback?: (log: LogEntry) => void;
	private onPhaseCallback?: (phase: PhaseInfo) => void;
	private onStatusCallback?: (status: string) => void;
	
	private phases: PhaseInfo[] = [
		{
			id: 'phase-1',
			name: 'PREPARING' as const,
			status: 'pending',
			startTime: '',
		},
		{
			id: 'phase-2',
			name: 'BUILDING' as const,
			status: 'pending',
			startTime: '',
		},
		{
			id: 'phase-3',
			name: 'TESTING' as const,
			status: 'pending',
			startTime: '',
		},
		{
			id: 'phase-4',
			name: 'FINALIZING' as const,
			status: 'pending',
			startTime: '',
		}
	];
	
	private logTemplates: { phase: 'PREPARING' | 'BUILDING' | 'TESTING' | 'FINALIZING'; messages: string[] }[] = [
		{
			phase: 'PREPARING' as const,
			messages: [
				'Initializing build environment...',
				'Loading project configuration...',
				'Validating environment variables...',
				'Configuration loaded successfully'
			]
		},
		{
			phase: 'BUILDING' as const,
			messages: [
				'Running npm install...',
				'> added 1542 packages in 45.3s',
				'Building application...',
				'> Compiling TypeScript...',
				'> Bundling with Vite...',
				'Build completed successfully'
			]
		},
		{
			phase: 'TESTING' as const,
			messages: [
				'Running test suite...',
				'> Running unit tests...',
				'✓ 42 unit tests passed',
				'> Running integration tests...',
				'✓ 15 integration tests passed',
				'All tests completed successfully'
			]
		},
		{
			phase: 'FINALIZING' as const,
			messages: [
				'Uploading artifacts to S3...',
				'> Uploading build artifacts...',
				'> Progress: 25%',
				'> Progress: 50%',
				'> Progress: 75%',
				'> Progress: 100%',
				'> Upload completed: 34.5MB',
				'Deployment successful!'
			]
		}
	];
	
	start(interval = 1000) {
		this.stop();
		this.phaseIndex = 0;
		this.logIndex = 0;
		
		// Start first phase
		this.startPhase(this.phaseIndex);
		
		this.interval = setInterval(() => {
			this.generateLog();
		}, interval);
	}
	
	stop() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
	}
	
	private startPhase(index: number) {
		if (index >= this.phases.length) {
			this.onStatusCallback?.('SUCCESS');
			this.stop();
			return;
		}
		
		const phase = this.phases[index];
		phase.status = 'running';
		phase.startTime = new Date().toISOString();
		
		this.onPhaseCallback?.(phase);
		this.onStatusCallback?.('RUNNING');
	}
	
	private completePhase(index: number) {
		if (index >= this.phases.length) return;
		
		const phase = this.phases[index];
		phase.status = 'completed';
		phase.endTime = new Date().toISOString();
		phase.duration = 10 + Math.floor(Math.random() * 30);
		
		this.onPhaseCallback?.(phase);
		
		// Start next phase
		if (index + 1 < this.phases.length) {
			this.startPhase(index + 1);
		}
	}
	
	private generateLog() {
		if (this.phaseIndex >= this.logTemplates.length) {
			this.stop();
			return;
		}
		
		const currentPhaseTemplate = this.logTemplates[this.phaseIndex];
		
		if (this.logIndex >= currentPhaseTemplate.messages.length) {
			// Complete current phase and move to next
			this.completePhase(this.phaseIndex);
			this.phaseIndex++;
			this.logIndex = 0;
			return;
		}
		
		// Generate log entry
		const log: LogEntry = {
			timestamp: new Date().toISOString(),
			level: this.getRandomLogLevel(),
			message: `[${currentPhaseTemplate.phase}] ${currentPhaseTemplate.messages[this.logIndex]}`,
			phase: currentPhaseTemplate.phase
		};
		
		this.onLogCallback?.(log);
		this.logIndex++;
	}
	
	private getRandomLogLevel(): 'info' | 'warning' | 'error' {
		const rand = Math.random();
		if (rand < 0.05) return 'error';
		if (rand < 0.15) return 'warning';
		return 'info';
	}
	
	// Set callbacks
	onLog(callback: (log: LogEntry) => void) {
		this.onLogCallback = callback;
	}
	
	onPhase(callback: (phase: PhaseInfo) => void) {
		this.onPhaseCallback = callback;
	}
	
	onStatus(callback: (status: string) => void) {
		this.onStatusCallback = callback;
	}
	
	// Generate mock execution metadata
	static generateMockExecution(executionId: string): ExecutionMetadata {
		return {
			executionId,
			buildNumber: Math.floor(Math.random() * 1000),
			executionType: Math.random() > 0.5 ? 'BUILD' : 'DEPLOY',
			status: 'RUNNING',
			startedAt: new Date().toISOString(),
			duration: 0,
			branch: 'main',
			commitId: Math.random().toString(36).substring(2, 9),
			commitMessage: 'feat: implement new feature',
			author: 'John Doe',
			pipelineId: 'pipeline-1',
			pipelineName: 'CI/CD Pipeline',
			triggeredBy: 'webhook',
			logStats: {
				totalLines: 0,
				errorCount: 0,
				warningCount: 0
			}
		};
	}
}