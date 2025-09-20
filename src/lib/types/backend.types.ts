/**
 * 백엔드 전송용 파이프라인 데이터 타입 정의
 * 연결리스트 실행을 위한 최소한의 데이터 구조
 */

// CI/CD 블록 타입 (백엔드용)
export enum CICDBlockType {
	// PIPELINE 시작
	PIPELINE_START = 'pipeline_start',

	// PREBUILD 단계
	OS_PACKAGE = 'os_package',
	NODE_VERSION = 'node_version',
	ENVIRONMENT_SETUP = 'environment_setup',

	// BUILD 단계
	INSTALL_MODULE_NODE = 'install_module_node',
	BUILD_WEBPACK = 'build_webpack',
	BUILD_VITE = 'build_vite',
	BUILD_CUSTOM = 'build_custom',

	// TEST 단계
	TEST_JEST = 'test_jest',
	TEST_MOCHA = 'test_mocha',
	TEST_VITEST = 'test_vitest',
	TEST_PLAYWRIGHT = 'test_playwright',
	TEST_CUSTOM = 'test_custom',

	// 유틸리티 블록
	NOTIFICATION_SLACK = 'notification_slack',
	NOTIFICATION_EMAIL = 'notification_email',
	CONDITION_BRANCH = 'condition_branch',
	PARALLEL_EXECUTION = 'parallel_execution',
	CUSTOM_COMMAND = 'custom_command'
}

// CI/CD 블록 그룹 (백엔드용)
export enum CICDBlockGroup {
	START = 'start',
	PREBUILD = 'prebuild',
	BUILD = 'build',
	TEST = 'test',
	NOTIFICATION = 'notification',
	UTILITY = 'utility'
}

// ============================================================================
// 백엔드 전송용 파이프라인 노드 데이터 (기본 인터페이스)
// ============================================================================
export interface BasePipelineNodeForBackend {
	blockId: string;           // UUID
	blockType: CICDBlockType;
	label: string;
	groupType: CICDBlockGroup;
	onSuccess: string | null;  // 성공 시 다음 노드 UUID
	onFailed: string | null;   // 실패 시 다음 노드 UUID
}

// ============================================================================
// 각 블록별 타입별 노드 데이터 (config 포함)
// ============================================================================
export interface PipelineStartNodeForBackend extends BasePipelineNodeForBackend {
	blockType: CICDBlockType.PIPELINE_START;
	config: PipelineStartConfig;
}

export interface OSPackageNodeForBackend extends BasePipelineNodeForBackend {
	blockType: CICDBlockType.OS_PACKAGE;
	config: OSPackageConfig;
}

export interface NodeVersionNodeForBackend extends BasePipelineNodeForBackend {
	blockType: CICDBlockType.NODE_VERSION;
	config: NodeVersionConfig;
}

export interface EnvironmentSetupNodeForBackend extends BasePipelineNodeForBackend {
	blockType: CICDBlockType.ENVIRONMENT_SETUP;
	config: EnvironmentSetupConfig;
}

export interface InstallPackagesNodeForBackend extends BasePipelineNodeForBackend {
	blockType: CICDBlockType.INSTALL_MODULE_NODE;
	config: InstallPackagesConfig;
}

export interface BuildWebpackNodeForBackend extends BasePipelineNodeForBackend {
	blockType: CICDBlockType.BUILD_WEBPACK;
	config: BuildWebpackConfig;
}

export interface BuildViteNodeForBackend extends BasePipelineNodeForBackend {
	blockType: CICDBlockType.BUILD_VITE;
	config: BuildViteConfig;
}

export interface BuildCustomNodeForBackend extends BasePipelineNodeForBackend {
	blockType: CICDBlockType.BUILD_CUSTOM;
	config: BuildCustomConfig;
}

export interface TestJestNodeForBackend extends BasePipelineNodeForBackend {
	blockType: CICDBlockType.TEST_JEST;
	config: TestJestConfig;
}

export interface TestMochaNodeForBackend extends BasePipelineNodeForBackend {
	blockType: CICDBlockType.TEST_MOCHA;
	config: TestMochaConfig;
}

export interface TestVitestNodeForBackend extends BasePipelineNodeForBackend {
	blockType: CICDBlockType.TEST_VITEST;
	config: TestVitestConfig;
}

export interface TestCustomNodeForBackend extends BasePipelineNodeForBackend {
	blockType: CICDBlockType.TEST_CUSTOM;
	config: TestCustomConfig;
}

export interface NotificationSlackNodeForBackend extends BasePipelineNodeForBackend {
	blockType: CICDBlockType.NOTIFICATION_SLACK;
	config: NotificationSlackConfig;
}

export interface NotificationEmailNodeForBackend extends BasePipelineNodeForBackend {
	blockType: CICDBlockType.NOTIFICATION_EMAIL;
	config: NotificationEmailConfig;
}

export interface CustomCommandNodeForBackend extends BasePipelineNodeForBackend {
	blockType: CICDBlockType.CUSTOM_COMMAND;
	config: CustomCommandConfig;
}

// 모든 노드 타입 유니온
export type PipelineNodeForBackend = 
	| PipelineStartNodeForBackend
	| OSPackageNodeForBackend
	| NodeVersionNodeForBackend
	| EnvironmentSetupNodeForBackend
	| InstallPackagesNodeForBackend
	| BuildWebpackNodeForBackend
	| BuildViteNodeForBackend
	| BuildCustomNodeForBackend
	| TestJestNodeForBackend
	| TestMochaNodeForBackend
	| TestVitestNodeForBackend
	| TestCustomNodeForBackend
	| NotificationSlackNodeForBackend
	| NotificationEmailNodeForBackend
	| CustomCommandNodeForBackend;

// ============================================================================
// 각 블록별 설정 데이터 타입
// ============================================================================

// Pipeline Start 설정
export interface PipelineStartConfig {
	triggerType: 'manual' | 'schedule' | 'webhook' | 'push' | 'pullRequest';
}

// OS Package 설정
export interface OSPackageConfig {
	packageManager: 'apt' | 'yum' | 'dnf' | 'apk' | 'zypper' | 'pacman' | 'brew';
	installPackages: string[];
	updatePackageList: boolean;
}

// Node Version 설정
export interface NodeVersionConfig {
	version: string;
	packageManager: 'npm' | 'yarn' | 'pnpm';
}

// Environment Setup 설정
export interface EnvironmentSetupConfig {
	environmentVariables: Record<string, { value: string; visible: boolean }>;
}

// Install Packages 설정
export interface InstallPackagesConfig {
	packageManager: 'npm' | 'yarn' | 'pnpm';
	cleanInstall: boolean;
	productionOnly: boolean;
}

// Build Webpack 설정
export interface BuildWebpackConfig {
	mode: 'development' | 'production';
	configFile: string;
	outputPath: string;
}

// Build Vite 설정
export interface BuildViteConfig {
	mode: 'development' | 'production';
	basePath: string;
	outputDir: string;
}

// Build Custom 설정
export interface BuildCustomConfig {
	packageManager: 'npm' | 'yarn' | 'pnpm';
	scriptName: string;
	customCommands: string[];
	workingDirectory: string;
}

// Test Jest 설정
export interface TestJestConfig {
	configFile: string;
	coverage: boolean;
	watchMode: boolean;
}

// Test Mocha 설정
export interface TestMochaConfig {
	testDir: string;
	reporter: 'spec' | 'dot' | 'nyan' | 'tap' | 'json' | 'html' | 'xunit';
	timeout: number;
	recursive: boolean;
}

// Test Vitest 설정
export interface TestVitestConfig {
	configFile: string;
	coverage: boolean;
	watchMode: boolean;
	environment: 'node' | 'jsdom' | 'happy-dom';
}

// Test Custom 설정
export interface TestCustomConfig {
	testCommands: string[];
	workingDirectory: string;
}

// Notification Slack 설정
export interface NotificationSlackConfig {
	channel: string;
	webhookUrlEnv: string;
	messageTemplate: string;
}

// Notification Email 설정
export interface NotificationEmailConfig {
	recipients: string;
	subject: string;
	messageTemplate: string;
	smtpHost: string;
	smtpPort: number;
	smtpUser: string;
	smtpPasswordEnv: string;
}

// Custom Command 설정
export interface CustomCommandConfig {
	commands: string[];
	workingDirectory: string;
}


// ============================================================================
// 백엔드 전송용 파이프라인 실행 데이터
// ============================================================================
export interface PipelineExecutionData {
	nodes: PipelineNodeForBackend[];
	startNodeId: string; // Pipeline Start 노드의 UUID
}

// ============================================================================
// 프론트엔드 -> 백엔드 변환 함수 (타입 안전)
// ============================================================================
export function convertToBackendFormat(frontendNodes: Array<{ data: Record<string, unknown> }>): PipelineExecutionData {
	const backendNodes: PipelineNodeForBackend[] = frontendNodes.map(node => {
		const { data } = node;
		const { label, blockType, groupType, blockId, onSuccess, onFailed, ...config } = data;
		
		// 각 블록 타입별로 정확한 타입으로 변환
		const baseNode = {
			blockId: blockId as string,
			blockType: blockType as CICDBlockType,
			label: label as string,
			groupType: groupType as CICDBlockGroup,
			onSuccess: onSuccess as string | null,
			onFailed: onFailed as string | null
		};

		// blockType에 따라 적절한 config 타입으로 변환
		switch (blockType) {
			case CICDBlockType.PIPELINE_START:
				return { ...baseNode, blockType, config: config as PipelineStartConfig } as PipelineStartNodeForBackend;
			case CICDBlockType.OS_PACKAGE:
				return { ...baseNode, blockType, config: config as OSPackageConfig } as OSPackageNodeForBackend;
			case CICDBlockType.NODE_VERSION:
				return { ...baseNode, blockType, config: config as NodeVersionConfig } as NodeVersionNodeForBackend;
			case CICDBlockType.ENVIRONMENT_SETUP:
				return { ...baseNode, blockType, config: config as EnvironmentSetupConfig } as EnvironmentSetupNodeForBackend;
			case CICDBlockType.INSTALL_MODULE_NODE:
				return { ...baseNode, blockType, config: config as InstallPackagesConfig } as InstallPackagesNodeForBackend;
			case CICDBlockType.BUILD_WEBPACK:
				return { ...baseNode, blockType, config: config as BuildWebpackConfig } as BuildWebpackNodeForBackend;
			case CICDBlockType.BUILD_VITE:
				return { ...baseNode, blockType, config: config as BuildViteConfig } as BuildViteNodeForBackend;
			case CICDBlockType.BUILD_CUSTOM:
				return { ...baseNode, blockType, config: config as BuildCustomConfig } as BuildCustomNodeForBackend;
			case CICDBlockType.TEST_JEST:
				return { ...baseNode, blockType, config: config as TestJestConfig } as TestJestNodeForBackend;
			case CICDBlockType.TEST_MOCHA:
				return { ...baseNode, blockType, config: config as TestMochaConfig } as TestMochaNodeForBackend;
			case CICDBlockType.TEST_VITEST:
				return { ...baseNode, blockType, config: config as TestVitestConfig } as TestVitestNodeForBackend;
			case CICDBlockType.TEST_CUSTOM:
				return { ...baseNode, blockType, config: config as TestCustomConfig } as TestCustomNodeForBackend;
			case CICDBlockType.NOTIFICATION_SLACK:
				return { ...baseNode, blockType, config: config as NotificationSlackConfig } as NotificationSlackNodeForBackend;
			case CICDBlockType.NOTIFICATION_EMAIL:
				return { ...baseNode, blockType, config: config as NotificationEmailConfig } as NotificationEmailNodeForBackend;
			case CICDBlockType.CUSTOM_COMMAND:
				return { ...baseNode, blockType, config: config as CustomCommandConfig } as CustomCommandNodeForBackend;
			default:
				// 처리되지 않은 블록 타입의 경우 기본 처리
				return { ...baseNode, blockType, config } as PipelineNodeForBackend;
		}
	});

	// Pipeline Start 노드 찾기
	const startNode = backendNodes.find(node => node.blockType === CICDBlockType.PIPELINE_START);
	
	return {
		nodes: backendNodes,
		startNodeId: startNode?.blockId || ''
	};
}

// ============================================================================
// 파이프라인 실행 상태
// ============================================================================
export enum PipelineExecutionStatus {
	PENDING = 'pending',
	RUNNING = 'running',
	SUCCESS = 'success',
	FAILED = 'failed',
	CANCELLED = 'cancelled'
}

export interface PipelineExecutionResult {
	pipelineId: string;
	executionId: string;
	status: PipelineExecutionStatus;
	startedAt: string;
	finishedAt?: string;
	currentNodeId?: string;
	logs: string[];
	error?: string;
}