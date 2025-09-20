import type { Format } from 'typia/lib/tags/Format';

export type ProjectResponseDto = {
  /**
   * 프로젝트 ID
   */
  projectId: string;

  /**
   * 사용자 ID
   */
  userId: string;

  /**
   * 프로젝트 이름
   */
  projectName: string;

  /**
   * 프로젝트 설명
   */
  projectDescription: null | string;

  /**
   * GitHub 저장소 이름
   */
  githubRepositoryName: null | string;

  /**
   * GitHub 저장소 ID
   */
  githubRepositoryId: null | string;

  /**
   * GitHub 소유자 이름
   */
  githubOwner: null | string;

  /**
   * 선택된 브랜치
   */
  selectedBranch: null | string;

  /**
   * GitHub App 설치 ID
   */
  installationId: null | string;

  /**
   * CodeBuild 프로젝트 이름
   */
  codebuildProjectName: string;

  /**
   * 빌드 이미지
   */
  buildImage: string;

  /**
   * 컴퓨트 타입
   */
  computeType: string;

  /**
   * 빌드 타임아웃 (분)
   */
  buildTimeout: number;

  /**
   * CloudWatch 로그 그룹
   */
  cloudwatchLogGroup: string;

  /**
   * CodeBuild 상태
   */
  codebuildStatus: 'FAILED' | 'CREATED' | 'SUCCESS' | 'IN_PROGRESS';

  /**
   * CodeBuild 에러 메시지
   */
  codebuildErrorMessage: null | string;

  /**
   * CodeBuild 프로젝트 ARN
   */
  codebuildProjectArn: string;

  /**
   * 생성일
   */
  createdAt: string & Format<'date-time'>;

  /**
   * 수정일
   */
  updatedAt: string & Format<'date-time'>;
};
