export type CreateProjectRequestDto = {
	/**
	 * 프로젝트 이름
	 */
	projectName: string;

	/**
	 * 프로젝트 설명 (선택사항)
	 */
	projectDescription?: undefined | string;

	/**
	 * GitHub 저장소 이름
	 */
	githubRepositoryName?: undefined | string;

	/**
	 * GitHub 저장소 ID
	 */
	githubRepositoryId?: undefined | string;

	/**
	 * GitHub 소유자 이름
	 */
	githubOwner?: undefined | string;

	/**
	 * 선택된 브랜치
	 */
	selectedBranch?: undefined | string;

	/**
	 * GitHub App 설치 ID
	 */
	installationId?: undefined | string;

	/**
	 * CodeBuild 프로젝트 이름
	 */
	codebuildProjectName: string;

	/**
	 * CloudWatch 로그 그룹
	 */
	cloudwatchLogGroup: string;

	/**
	 * CodeBuild 프로젝트 ARN
	 */
	codebuildProjectArn: string;
};
