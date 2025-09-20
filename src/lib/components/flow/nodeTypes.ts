import PipelineStartNode from './nodes/PipelineStartNode.svelte';
import BuildWebpackNode from './nodes/cicd/BuildWebpackNode.svelte';
import ViteBuildNode from './nodes/cicd/ViteBuildNode.svelte';
import BuildCustomNode from './nodes/cicd/BuildCustomNode.svelte';
import InstallPackagesNode from './nodes/cicd/InstallPackagesNode.svelte';
import OSPackageNode from './nodes/cicd/OSPackageNode.svelte';
import NodeVersionNode from './nodes/cicd/NodeVersionNode.svelte';
import EnvironmentSetupNode from './nodes/cicd/EnvironmentSetupNode.svelte';
import TestJestNode from './nodes/cicd/TestJestNode.svelte';
import TestMochaNode from './nodes/cicd/TestMochaNode.svelte';
import TestVitestNode from './nodes/cicd/TestVitestNode.svelte';
// import TestPlaywrightNode from './nodes/cicd/TestPlaywrightNode.svelte';
import TestCustomNode from './nodes/cicd/TestCustomNode.svelte';
import NotificationSlackNode from './nodes/cicd/NotificationSlackNode.svelte';
import NotificationEmailNode from './nodes/cicd/NotificationEmailNode.svelte';
import ConditionBranchNode from './nodes/cicd/ConditionBranchNode.svelte';
import ParallelExecutionNode from './nodes/cicd/ParallelExecutionNode.svelte';
import CustomCommandNode from './nodes/cicd/CustomCommandNode.svelte';
import {
  CICDBlockType,
  CICDBlockGroup,
  CICD_BLOCK_CONFIGS,
  CICD_GROUP_COLORS as _CICD_GROUP_COLORS,
  type AnyCICDNodeData
} from '$lib/types/flow-node.types';

// 노드 타입 레지스트리
export const nodeTypes = {
  [CICDBlockType.PIPELINE_START]: PipelineStartNode,
  [CICDBlockType.OS_PACKAGE]: OSPackageNode,
  [CICDBlockType.NODE_VERSION]: NodeVersionNode,
  [CICDBlockType.ENVIRONMENT_SETUP]: EnvironmentSetupNode,
  [CICDBlockType.INSTALL_MODULE_NODE]: InstallPackagesNode,
  [CICDBlockType.BUILD_WEBPACK]: BuildWebpackNode,
  [CICDBlockType.BUILD_VITE]: ViteBuildNode,
  [CICDBlockType.BUILD_CUSTOM]: BuildCustomNode,
  [CICDBlockType.TEST_JEST]: TestJestNode,
  [CICDBlockType.TEST_MOCHA]: TestMochaNode,
  [CICDBlockType.TEST_VITEST]: TestVitestNode,
  // [CICDBlockType.TEST_PLAYWRIGHT]: TestPlaywrightNode,
  [CICDBlockType.TEST_CUSTOM]: TestCustomNode,
  [CICDBlockType.NOTIFICATION_SLACK]: NotificationSlackNode,
  [CICDBlockType.NOTIFICATION_EMAIL]: NotificationEmailNode,
  [CICDBlockType.CONDITION_BRANCH]: ConditionBranchNode,
  [CICDBlockType.PARALLEL_EXECUTION]: ParallelExecutionNode,
  [CICDBlockType.CUSTOM_COMMAND]: CustomCommandNode
};

// 노드 생성 헬퍼 함수
export function createNodeInstance(type: string, position: { x: number; y: number }) {
  const nodeId = crypto.randomUUID();
  const blockType = type as CICDBlockType;
  const config = CICD_BLOCK_CONFIGS[blockType];

  if (!config) {
    throw new Error(`Unknown block type: ${type}`);
  }

  const baseNode = {
    id: nodeId,
    type: blockType,
    position,
    selectable: true,
    dragHandle: '.drag-handle',
    data: {
      label: config.label,
      blockType,
      blockId: nodeId,
      onSuccess: null,
      onFailed: null
    } as Partial<AnyCICDNodeData>
  };

  // 타입별 기본 데이터 설정
  switch (blockType) {
    case CICDBlockType.PIPELINE_START:
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          groupType: CICDBlockGroup.START,
          triggerType: 'manual' as const
        }
      };
    case CICDBlockType.BUILD_WEBPACK:
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          groupType: CICDBlockGroup.BUILD,
          mode: 'production' as const,
          configFile: 'webpack.config.js',
          outputPath: 'dist'
        }
      };
    case CICDBlockType.INSTALL_MODULE_NODE:
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          groupType: CICDBlockGroup.BUILD,
          packageManager: 'npm' as const,
          cleanInstall: false,
          productionOnly: false
        }
      };
    case CICDBlockType.TEST_JEST:
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          groupType: CICDBlockGroup.TEST,
          configFile: 'jest.config.js',
          coverage: false,
          watchMode: false
        }
      };
    case CICDBlockType.TEST_MOCHA:
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          groupType: CICDBlockGroup.TEST,
          testDir: 'test',
          reporter: 'spec',
          timeout: 2000,
          recursive: true
        }
      };
    case CICDBlockType.TEST_VITEST:
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          groupType: CICDBlockGroup.TEST,
          configFile: 'vitest.config.ts',
          coverage: false,
          watchMode: false,
          environment: 'node'
        }
      };
    case CICDBlockType.OS_PACKAGE:
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          groupType: CICDBlockGroup.PREBUILD,
          packageManager: 'apt',
          installPackages: [],
          updatePackageList: true
        }
      };
    case CICDBlockType.NODE_VERSION:
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          groupType: CICDBlockGroup.PREBUILD,
          version: '18',
          packageManager: 'npm'
        }
      };
    case CICDBlockType.BUILD_VITE:
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          groupType: CICDBlockGroup.BUILD,
          mode: 'production',
          basePath: '',
          outputDir: 'dist'
        }
      };
    case CICDBlockType.NOTIFICATION_SLACK:
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          groupType: CICDBlockGroup.NOTIFICATION,
          channel: '',
          webhookUrlEnv: 'SLACK_WEBHOOK_URL',
          messageTemplate: 'Pipeline {status} completed'
        }
      };
    case CICDBlockType.NOTIFICATION_EMAIL:
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          groupType: CICDBlockGroup.NOTIFICATION,
          recipients: '',
          subject: 'Pipeline {status}',
          messageTemplate: 'Pipeline {status} completed',
          smtpHost: '',
          smtpPort: 587,
          smtpUser: '',
          smtpPasswordEnv: 'SMTP_PASSWORD'
        }
      };
    case CICDBlockType.CUSTOM_COMMAND:
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          groupType: CICDBlockGroup.UTILITY,
          commands: [],
          workingDirectory: ''
        }
      };
    default:
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          groupType: CICDBlockGroup.UTILITY,
          onSuccess: null,
          onFailed: null
        }
      };
  }
}

export type NodeType = keyof typeof nodeTypes;
