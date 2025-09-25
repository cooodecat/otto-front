# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Otto Frontend - GitHub 통합 CI/CD 시스템의 SvelteKit 기반 웹 애플리케이션입니다.

### 기술 스택
- **프레임워크**: SvelteKit 2.22.0 + Svelte 5.0 (최신 runes 문법 사용)
- **스타일링**: Tailwind CSS 4.0 (Vite 플러그인 통합)
- **타입스크립트**: strict 모드 활성화
- **빌드 도구**: Vite 7.0
- **배포**: Vercel adapter (Node.js 22.x 런타임)
- **API 클라이언트**: Nestia SDK (자동 생성된 타입 세이프 클라이언트)
- **주요 라이브러리**:
  - XYFlow/Svelte: 플로우 다이어그램 구현
  - Lucide Svelte: 아이콘 시스템
  - Socket.io Client: 실시간 웹소켓 통신

## 개발 명령어

```bash
# 개발 서버 시작 (http://localhost:5173)
pnpm dev

# 프로덕션 빌드
pnpm build

# 프로덕션 빌드 미리보기
pnpm preview

# 코드 포매팅
pnpm format

# Lint + Prettier 검사
pnpm lint

# TypeScript 타입 체크
pnpm check

# TypeScript 타입 체크 (watch 모드)
pnpm check:watch

# SvelteKit 프로젝트 동기화 (git clone 후 필수)
pnpm prepare
```

## 프로젝트 구조

```
src/
├── lib/                      # 재사용 가능한 라이브러리 코드
│   ├── sdk/                  # Nestia 자동 생성 SDK
│   │   ├── functional/       # API 엔드포인트 함수들
│   │   └── structures/       # TypeScript 타입 정의
│   ├── components/
│   │   ├── flow/            # CI/CD 파이프라인 플로우 다이어그램 컴포넌트
│   │   │   ├── nodes/       # 각종 CI/CD 노드 컴포넌트 (Build, Test, Deploy 등)
│   │   │   └── edges/       # 노드 연결선 컴포넌트
│   │   └── ui/              # 공통 UI 컴포넌트
│   ├── server/
│   │   └── server-utils/    # 서버사이드 유틸리티 (인증 체크 등)
│   ├── services/            # 비즈니스 로직 서비스
│   └── utils/               # 클라이언트 유틸리티
│       └── make-fetch.ts    # Nestia connection 헬퍼
└── routes/                   # SvelteKit 라우트 구조
    ├── auth/                # 인증 관련 라우트
    │   └── callback/        # OAuth 콜백 처리
    ├── projects/            # 프로젝트 관리
    │   ├── [project_id]/    # 동적 프로젝트 라우트
    │   │   ├── logs/       # 실행 로그 뷰어
    │   │   └── pipelines/  # 파이프라인 관리
    │   └── new/            # 새 프로젝트 생성
    └── app/github/callback/ # GitHub App 설치 콜백
```

## API 통합 패턴

### Nestia SDK 사용법

백엔드 API와의 통신은 자동 생성된 Nestia SDK를 통해 이루어집니다:

```typescript
import api from '$lib/sdk';
import { makeFetch } from '$lib/utils/make-fetch';

// 서버사이드에서 API 호출 (+page.server.ts, +layout.server.ts)
export const load = async ({ fetch, cookies }) => {
  // makeFetch로 IConnection 객체 생성
  const connection = makeFetch({
    fetch,  // SvelteKit의 서버사이드 fetch
    cookie: cookies.get('auth')  // 쿠키 포워딩
  });

  // SDK를 통한 타입 세이프 API 호출
  const result = await api.functional.auth.github.authGithubSignIn(connection, {
    code: authCode,
    state: authState
  });

  return result;
};
```

### makeFetch 헬퍼 함수

- **역할**: Nestia fetcher용 IConnection 객체 생성
- **기본 URL**: `PUBLIC_BACKEND_URL` 환경변수 + `/api/v1`
- **인증**: `credentials: 'include'`로 쿠키 기반 인증 자동 처리
- **SSR 지원**: SvelteKit의 서버사이드 fetch 함수 지원

## 인증 시스템

### JWT 기반 쿠키 인증

```typescript
// 인증 체크 유틸리티
import { isAuthenticated } from '$lib/server/server-utils';

export const load = async (serverEvent) => {
  const isAuth = await isAuthenticated(serverEvent);
  if (!isAuth) throw redirect(302, '/');
};
```

### 쿠키 설정
- **access_token**: 단기 액세스 토큰 (httpOnly, secure, sameSite: lax)
- **refresh_token**: 장기 리프레시 토큰 (httpOnly, secure, sameSite: lax)
- **도메인**: 프로덕션에서는 `.codecat-otto.shop` 전체 도메인 공유

### 토큰 리프레시
- 액세스 토큰 만료 시 자동 리프레시
- 리프레시 토큰이 없으면 인증 실패 처리
- 버퍼 시간: 만료 60초 전 미리 리프레시

## CI/CD 플로우 노드 시스템

프로젝트는 시각적 CI/CD 파이프라인 구성을 위한 다양한 노드 타입을 제공:

### 빌드 노드
- `BuildCustomNode`: 커스텀 빌드 명령
- `BuildWebpackNode`: Webpack 빌드
- `ViteBuildNode`: Vite 빌드

### 테스트 노드
- `TestJestNode`: Jest 테스트
- `TestVitestNode`: Vitest 테스트
- `TestPlaywrightNode`: Playwright E2E 테스트
- `TestMochaNode`: Mocha 테스트
- `TestCustomNode`: 커스텀 테스트 명령

### 배포 및 기타
- `DeployNode`: 배포 작업
- `ParallelExecutionNode`: 병렬 실행
- `ConditionBranchNode`: 조건부 분기
- `NotificationSlackNode`: Slack 알림
- `NotificationEmailNode`: 이메일 알림

## 환경 변수

`.env` 파일 설정:

```bash
# 백엔드 API URL
PUBLIC_BACKEND_URL=http://localhost:4000

# GitHub OAuth Client ID
PUBLIC_GITHUB_CLIENT_ID=your_client_id
```

## 개발 워크플로우

### 초기 설정
```bash
# 의존성 설치
pnpm install

# SvelteKit 동기화
pnpm prepare

# 개발 서버 시작
pnpm dev
```

### 백엔드 SDK 업데이트
백엔드 API가 변경되면 otto-handler 디렉토리에서:
```bash
npx nestia sdk
```
이 명령은 자동으로 `src/lib/sdk` 디렉토리를 업데이트합니다.

### 배포 전 체크
```bash
# 타입 체크
pnpm check

# Lint 실행
pnpm lint

# 프로덕션 빌드 테스트
pnpm build
pnpm preview
```

## 중요 개발 규칙

1. **Svelte 5.0 문법 사용**: 모든 컴포넌트는 최신 runes 문법(`$props`, `$state` 등) 사용
2. **타입 안전성**: Nestia SDK를 통한 완전한 타입 세이프 API 통신
3. **서버사이드 렌더링**: 민감한 데이터는 항상 `+page.server.ts`에서 처리
4. **쿠키 보안**: httpOnly, secure 플래그로 쿠키 보안 강화
5. **에러 처리**: API 에러는 적절히 캐치하고 사용자 친화적 메시지 표시

## 실시간 기능

- **WebSocket 지원**: Socket.io 클라이언트를 통한 실시간 빌드 로그 스트리밍
- **실행 상태 업데이트**: 파이프라인 실행 상태 실시간 반영
- **자동 재연결**: 연결 끊김 시 자동 재연결 처리

## 배포 설정

- **플랫폼**: Vercel
- **어댑터**: `@sveltejs/adapter-vercel`
- **런타임**: Node.js 22.x
- **도메인**: codecat-otto.shop