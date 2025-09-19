/**
 * Flow 노드 타입 정의 (otto-ui에서 이식)
 * any 타입을 제거하고 타입 안전성을 높임
 */

// 기본 노드 데이터
export interface BaseNodeData {
	label: string;
	description?: string;
}

// CI/CD 블록 타입
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

// CI/CD 블록 그룹
export enum CICDBlockGroup {
	START = 'start',
	PREBUILD = 'prebuild',
	BUILD = 'build',
	TEST = 'test',
	NOTIFICATION = 'notification',
	UTILITY = 'utility'
}

// 그룹별 색상 매핑
export const CICD_GROUP_COLORS = {
	[CICDBlockGroup.START]: {
		colorClass: 'bg-purple-600',
		colorHex: '#9333ea',
		bgClass: 'bg-purple-50',
		borderClass: 'border-purple-200',
		textClass: 'text-purple-700'
	},
	[CICDBlockGroup.PREBUILD]: {
		colorClass: 'bg-blue-500',
		colorHex: '#3b82f6',
		bgClass: 'bg-blue-50',
		borderClass: 'border-blue-200',
		textClass: 'text-blue-700'
	},
	[CICDBlockGroup.BUILD]: {
		colorClass: 'bg-emerald-500',
		colorHex: '#10b981',
		bgClass: 'bg-emerald-50',
		borderClass: 'border-emerald-200',
		textClass: 'text-emerald-700'
	},
	[CICDBlockGroup.TEST]: {
		colorClass: 'bg-purple-500',
		colorHex: '#8b5cf6',
		bgClass: 'bg-purple-50',
		borderClass: 'border-purple-200',
		textClass: 'text-purple-700'
	},
	[CICDBlockGroup.NOTIFICATION]: {
		colorClass: 'bg-yellow-500',
		colorHex: '#eab308',
		bgClass: 'bg-yellow-50',
		borderClass: 'border-yellow-200',
		textClass: 'text-yellow-700'
	},
	[CICDBlockGroup.UTILITY]: {
		colorClass: 'bg-gray-500',
		colorHex: '#6b7280',
		bgClass: 'bg-gray-50',
		borderClass: 'border-gray-200',
		textClass: 'text-gray-700'
	}
} as const;

// 기본 CI/CD 노드 데이터
export interface BaseCICDNodeData extends BaseNodeData {
	blockType: CICDBlockType;
	groupType: CICDBlockGroup;
	blockId: string;
	onSuccess?: string;
	onFailed?: string;
	timeout?: number;
	retryCount?: number;
}

// PIPELINE START 블록
export interface PipelineStartNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.PIPELINE_START;
	groupType: CICDBlockGroup.START;
	triggerType?: 'manual' | 'schedule' | 'webhook' | 'push' | 'pullRequest';
	triggerConfig?: {
		schedule?: string;
		branchPatterns?: string[];
		filePatterns?: string[];
	};
}

// PREBUILD 블록들
export interface OSPackageNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.OS_PACKAGE;
	groupType: CICDBlockGroup.PREBUILD;
	packageManager: 'apt' | 'yum' | 'dnf' | 'apk' | 'zypper' | 'pacman' | 'brew';
	installPackages: string[];
	updatePackageList?: boolean;
}

export interface NodeVersionNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.NODE_VERSION;
	groupType: CICDBlockGroup.PREBUILD;
	version: string;
	packageManager?: 'npm' | 'yarn' | 'pnpm';
}

export interface EnvironmentSetupNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.ENVIRONMENT_SETUP;
	groupType: CICDBlockGroup.PREBUILD;
	environmentVariables: Record<string, string>;
	loadFromFile?: string;
}

// BUILD 블록들
export interface InstallNodePackageNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.INSTALL_MODULE_NODE;
	groupType: CICDBlockGroup.BUILD;
	packageManager: 'npm' | 'yarn' | 'pnpm';
	installPackages?: string[];
	installDevDependencies?: boolean;
	productionOnly?: boolean;
	cleanInstall?: boolean;
}

export interface BuildWebpackNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.BUILD_WEBPACK;
	groupType: CICDBlockGroup.BUILD;
	configFile?: string;
	mode: 'development' | 'production';
	outputPath?: string;
	additionalOptions?: string[];
}

export interface BuildViteNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.BUILD_VITE;
	groupType: CICDBlockGroup.BUILD;
	configFile?: string;
	mode: 'development' | 'production';
	basePath?: string;
	outputDir?: string;
}

export interface BuildCustomNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.BUILD_CUSTOM;
	groupType: CICDBlockGroup.BUILD;
	packageManager: 'npm' | 'yarn' | 'pnpm';
	scriptName?: string;
	customCommands?: string[];
	workingDirectory?: string;
}

// TEST 블록들
export interface TestJestNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.TEST_JEST;
	groupType: CICDBlockGroup.TEST;
	configFile?: string;
	testPattern?: string;
	coverage?: boolean;
	watchMode?: boolean;
	maxWorkers?: number;
	additionalOptions?: string[];
}

export interface TestMochaNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.TEST_MOCHA;
	groupType: CICDBlockGroup.TEST;
	testFiles?: string[];
	configFile?: string;
	reporter?: 'spec' | 'json' | 'html' | 'tap' | 'dot';
	timeout?: number;
	grep?: string;
}

export interface TestVitestNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.TEST_VITEST;
	groupType: CICDBlockGroup.TEST;
	configFile?: string;
	coverage?: boolean;
	ui?: boolean;
	watchMode?: boolean;
	environment?: 'node' | 'jsdom' | 'happy-dom';
}

export interface TestPlaywrightNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.TEST_PLAYWRIGHT;
	groupType: CICDBlockGroup.TEST;
	configFile?: string;
	project?: string;
	headed?: boolean;
	debug?: boolean;
	browsers?: ('chromium' | 'firefox' | 'webkit')[];
}

export interface TestCustomNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.TEST_CUSTOM;
	groupType: CICDBlockGroup.TEST;
	packageManager: 'npm' | 'yarn' | 'pnpm';
	scriptName?: string;
	customCommands?: string[];
	generateReports?: boolean;
	coverageThreshold?: number;
}

// 유틸리티 블록들
export interface NotificationSlackNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.NOTIFICATION_SLACK;
	groupType: CICDBlockGroup.NOTIFICATION;
	webhookUrlEnv: string;
	channel?: string;
	messageTemplate: string;
	onSuccessOnly?: boolean;
	onFailureOnly?: boolean;
}

export interface NotificationEmailNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.NOTIFICATION_EMAIL;
	groupType: CICDBlockGroup.NOTIFICATION;
	smtpConfig: {
		host: string;
		port: number;
		usernameEnv: string;
		passwordEnv: string;
	};
	recipients: string[];
	subjectTemplate: string;
	bodyTemplate: string;
}

export interface ConditionBranchNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.CONDITION_BRANCH;
	groupType: CICDBlockGroup.UTILITY;
	conditionType: 'environment' | 'fileExists' | 'commandOutput' | 'custom';
	conditionConfig: {
		environmentVar?: string;
		expectedValue?: string;
		filePath?: string;
		command?: string;
		customScript?: string;
	};
	onConditionTrue: string;
	onConditionFalse: string;
}

export interface ParallelExecutionNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.PARALLEL_EXECUTION;
	groupType: CICDBlockGroup.UTILITY;
	parallelBranches: string[];
	waitForAll?: boolean;
	failFast?: boolean;
	onAllSuccess: string;
	onAnyFailure?: string;
}

export interface CustomCommandNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.CUSTOM_COMMAND;
	groupType: CICDBlockGroup.UTILITY;
	commands: string[];
	workingDirectory?: string;
	shell?: 'bash' | 'sh' | 'zsh' | 'fish';
	environmentVariables?: Record<string, string>;
	ignoreErrors?: boolean;
}

// 모든 CI/CD 노드 데이터 유니온 타입
export type AnyCICDNodeData =
	| PipelineStartNodeData
	| OSPackageNodeData
	| NodeVersionNodeData
	| EnvironmentSetupNodeData
	| InstallNodePackageNodeData
	| BuildWebpackNodeData
	| BuildViteNodeData
	| BuildCustomNodeData
	| TestJestNodeData
	| TestMochaNodeData
	| TestVitestNodeData
	| TestPlaywrightNodeData
	| TestCustomNodeData
	| NotificationSlackNodeData
	| NotificationEmailNodeData
	| ConditionBranchNodeData
	| ParallelExecutionNodeData
	| CustomCommandNodeData;

// 블록 타입별 기본 설정
export const CICD_BLOCK_CONFIGS = {
	[CICDBlockType.PIPELINE_START]: { label: 'Pipeline Start', icon: '🚀' },

	[CICDBlockType.OS_PACKAGE]: { label: 'OS Packages', icon: '📦' },
	[CICDBlockType.NODE_VERSION]: { label: 'Node Version', icon: '🟢' },
	[CICDBlockType.ENVIRONMENT_SETUP]: { label: 'Environment', icon: '🌍' },

	[CICDBlockType.INSTALL_MODULE_NODE]: { label: 'Install Packages', icon: '📥' },
	[CICDBlockType.BUILD_WEBPACK]: { label: 'Webpack Build', icon: '📦' },
	[CICDBlockType.BUILD_VITE]: { label: 'Vite Build', icon: '⚡' },
	[CICDBlockType.BUILD_CUSTOM]: { label: 'Custom Build', icon: '🔨' },

	[CICDBlockType.TEST_JEST]: { label: 'Jest Tests', icon: '🧪' },
	[CICDBlockType.TEST_MOCHA]: { label: 'Mocha Tests', icon: '☕' },
	[CICDBlockType.TEST_VITEST]: { label: 'Vitest', icon: '⚡' },
	[CICDBlockType.TEST_PLAYWRIGHT]: { label: 'Playwright', icon: '🎭' },
	[CICDBlockType.TEST_CUSTOM]: { label: 'Custom Tests', icon: '🧪' },

	[CICDBlockType.NOTIFICATION_SLACK]: { label: 'Slack Notify', icon: '💬' },
	[CICDBlockType.NOTIFICATION_EMAIL]: { label: 'Email Notify', icon: '✉️' },

	[CICDBlockType.CONDITION_BRANCH]: { label: 'Condition', icon: '🔀' },
	[CICDBlockType.PARALLEL_EXECUTION]: { label: 'Parallel', icon: '⚡' },
	[CICDBlockType.CUSTOM_COMMAND]: { label: 'Custom Command', icon: '💻' }
} as const;
