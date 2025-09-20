/**
 * Flow 노드 타입 정의 (완전 재정리)
 * 기본 타입 + 확장 방식으로 모든 블록 데이터 타입 정의
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

// ============================================================================
// 기본 CI/CD 노드 데이터 (모든 노드가 상속)
// ============================================================================
export interface BaseCICDNodeData extends BaseNodeData {
  blockType: CICDBlockType;
  groupType: CICDBlockGroup;
  blockId: string;
  onSuccess: string | null;
  onFailed: string | null;
}

// ============================================================================
// PIPELINE START 블록
// ============================================================================
export interface PipelineStartNodeData extends BaseCICDNodeData {
  blockType: CICDBlockType.PIPELINE_START;
  groupType: CICDBlockGroup.START;
  triggerType: 'manual' | 'schedule' | 'webhook' | 'push' | 'pullRequest';
  onFailed: null; // Pipeline Start는 실패 연결이 없음
}

// ============================================================================
// PREBUILD 블록들
// ============================================================================
export interface OSPackageNodeData extends BaseCICDNodeData {
  blockType: CICDBlockType.OS_PACKAGE;
  groupType: CICDBlockGroup.PREBUILD;
  packageManager: 'apt' | 'yum' | 'dnf' | 'apk' | 'zypper' | 'pacman' | 'brew';
  installPackages: string[];
  updatePackageList: boolean;
}

export interface NodeVersionNodeData extends BaseCICDNodeData {
  blockType: CICDBlockType.NODE_VERSION;
  groupType: CICDBlockGroup.PREBUILD;
  version: string;
  packageManager: 'npm' | 'yarn' | 'pnpm';
}

export interface EnvironmentSetupNodeData extends BaseCICDNodeData {
  blockType: CICDBlockType.ENVIRONMENT_SETUP;
  groupType: CICDBlockGroup.PREBUILD;
  environmentVariables: Record<string, { value: string; visible: boolean }>;
}

// ============================================================================
// BUILD 블록들
// ============================================================================
export interface InstallPackagesNodeData extends BaseCICDNodeData {
  blockType: CICDBlockType.INSTALL_MODULE_NODE;
  groupType: CICDBlockGroup.BUILD;
  packageManager: 'npm' | 'yarn' | 'pnpm';
  cleanInstall: boolean;
  productionOnly: boolean;
}

export interface BuildWebpackNodeData extends BaseCICDNodeData {
  blockType: CICDBlockType.BUILD_WEBPACK;
  groupType: CICDBlockGroup.BUILD;
  mode: 'development' | 'production';
  configFile: string;
  outputPath: string;
}

export interface BuildViteNodeData extends BaseCICDNodeData {
  blockType: CICDBlockType.BUILD_VITE;
  groupType: CICDBlockGroup.BUILD;
  mode: 'development' | 'production';
  basePath: string;
  outputDir: string;
}

export interface BuildCustomNodeData extends BaseCICDNodeData {
  blockType: CICDBlockType.BUILD_CUSTOM;
  groupType: CICDBlockGroup.BUILD;
  packageManager: 'npm' | 'yarn' | 'pnpm';
  scriptName: string;
  customCommands: string[];
  workingDirectory: string;
}

// ============================================================================
// TEST 블록들
// ============================================================================
export interface TestJestNodeData extends BaseCICDNodeData {
  blockType: CICDBlockType.TEST_JEST;
  groupType: CICDBlockGroup.TEST;
  configFile: string;
  coverage: boolean;
  watchMode: boolean;
}

export interface TestMochaNodeData extends BaseCICDNodeData {
  blockType: CICDBlockType.TEST_MOCHA;
  groupType: CICDBlockGroup.TEST;
  testDir: string;
  reporter: 'spec' | 'dot' | 'nyan' | 'tap' | 'json' | 'html' | 'xunit';
  timeout: number;
  recursive: boolean;
}

export interface TestVitestNodeData extends BaseCICDNodeData {
  blockType: CICDBlockType.TEST_VITEST;
  groupType: CICDBlockGroup.TEST;
  configFile: string;
  coverage: boolean;
  watchMode: boolean;
  environment: 'node' | 'jsdom' | 'happy-dom';
}

export interface TestCustomNodeData extends BaseCICDNodeData {
  blockType: CICDBlockType.TEST_CUSTOM;
  groupType: CICDBlockGroup.TEST;
  testCommands: string[];
  workingDirectory: string;
}

// ============================================================================
// NOTIFICATION 블록들
// ============================================================================
export interface NotificationSlackNodeData extends BaseCICDNodeData {
  blockType: CICDBlockType.NOTIFICATION_SLACK;
  groupType: CICDBlockGroup.NOTIFICATION;
  channel: string;
  webhookUrlEnv: string;
  messageTemplate: string;
}

export interface NotificationEmailNodeData extends BaseCICDNodeData {
  blockType: CICDBlockType.NOTIFICATION_EMAIL;
  groupType: CICDBlockGroup.NOTIFICATION;
  recipients: string;
  subject: string;
  messageTemplate: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPasswordEnv: string;
}

// ============================================================================
// UTILITY 블록들
// ============================================================================
/*export interface ConditionBranchNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.CONDITION_BRANCH;
	groupType: CICDBlockGroup.UTILITY;
	// TODO: 조건부 분기 구현 시 추가
}

export interface ParallelExecutionNodeData extends BaseCICDNodeData {
	blockType: CICDBlockType.PARALLEL_EXECUTION;
	groupType: CICDBlockGroup.UTILITY;
	// TODO: 병렬 실행 구현 시 추가
}*/

export interface CustomCommandNodeData extends BaseCICDNodeData {
  blockType: CICDBlockType.CUSTOM_COMMAND;
  groupType: CICDBlockGroup.UTILITY;
  commands: string[];
  workingDirectory: string;
}

// ============================================================================
// 모든 노드 데이터 유니온 타입
// ============================================================================
export type AnyCICDNodeData =
  | PipelineStartNodeData
  | OSPackageNodeData
  | NodeVersionNodeData
  | EnvironmentSetupNodeData
  | InstallPackagesNodeData
  | BuildWebpackNodeData
  | BuildViteNodeData
  | BuildCustomNodeData
  | TestJestNodeData
  | TestMochaNodeData
  | TestVitestNodeData
  | TestCustomNodeData
  | NotificationSlackNodeData
  | NotificationEmailNodeData
  /*	| ConditionBranchNodeData
	| ParallelExecutionNodeData*/
  | CustomCommandNodeData;

// ============================================================================
// 블록 설정 정보
// ============================================================================
export interface CICDBlockConfig {
  label: string;
  description: string;
  group: CICDBlockGroup;
  icon?: string;
  disabled?: boolean;
}

export const CICD_BLOCK_CONFIGS: Record<CICDBlockType, CICDBlockConfig> = {
  [CICDBlockType.PIPELINE_START]: {
    label: 'Pipeline Start',
    description: 'Start your CI/CD pipeline',
    group: CICDBlockGroup.START
  },
  [CICDBlockType.OS_PACKAGE]: {
    label: 'OS Package',
    description: 'Install OS-level packages',
    group: CICDBlockGroup.PREBUILD
  },
  [CICDBlockType.NODE_VERSION]: {
    label: 'Node Version',
    description: 'Set Node.js version',
    group: CICDBlockGroup.PREBUILD
  },
  [CICDBlockType.ENVIRONMENT_SETUP]: {
    label: 'Environment Setup',
    description: 'Set environment variables',
    group: CICDBlockGroup.PREBUILD
  },
  [CICDBlockType.INSTALL_MODULE_NODE]: {
    label: 'Install Packages',
    description: 'Install Node.js packages',
    group: CICDBlockGroup.BUILD
  },
  [CICDBlockType.BUILD_WEBPACK]: {
    label: 'Webpack Build',
    description: 'Build with Webpack',
    group: CICDBlockGroup.BUILD
  },
  [CICDBlockType.BUILD_VITE]: {
    label: 'Vite Build',
    description: 'Build with Vite',
    group: CICDBlockGroup.BUILD
  },
  [CICDBlockType.BUILD_CUSTOM]: {
    label: 'Custom Build',
    description: 'Run custom build commands',
    group: CICDBlockGroup.BUILD
  },
  [CICDBlockType.TEST_JEST]: {
    label: 'Jest Test',
    description: 'Run Jest tests',
    group: CICDBlockGroup.TEST
  },
  [CICDBlockType.TEST_MOCHA]: {
    label: 'Mocha Test',
    description: 'Run Mocha tests',
    group: CICDBlockGroup.TEST
  },
  [CICDBlockType.TEST_VITEST]: {
    label: 'Vitest Test',
    description: 'Run Vitest tests',
    group: CICDBlockGroup.TEST
  },
  [CICDBlockType.TEST_PLAYWRIGHT]: {
    label: 'Playwright Test',
    description: 'Run Playwright tests',
    group: CICDBlockGroup.TEST,
    disabled: true
  },
  [CICDBlockType.TEST_CUSTOM]: {
    label: 'Custom Test',
    description: 'Run custom test commands',
    group: CICDBlockGroup.TEST
  },
  [CICDBlockType.NOTIFICATION_SLACK]: {
    label: 'Slack Notify',
    description: 'Send Slack notifications',
    group: CICDBlockGroup.NOTIFICATION
  },
  [CICDBlockType.NOTIFICATION_EMAIL]: {
    label: 'Email Notify',
    description: 'Send email notifications',
    group: CICDBlockGroup.NOTIFICATION
  },
  [CICDBlockType.CONDITION_BRANCH]: {
    label: 'Condition Branch',
    description: 'Conditional execution',
    group: CICDBlockGroup.UTILITY,
    disabled: true
  },
  [CICDBlockType.PARALLEL_EXECUTION]: {
    label: 'Parallel Execution',
    description: 'Run jobs in parallel',
    group: CICDBlockGroup.UTILITY,
    disabled: true
  },
  [CICDBlockType.CUSTOM_COMMAND]: {
    label: 'Custom Command',
    description: 'Run custom shell commands',
    group: CICDBlockGroup.UTILITY
  }
};
