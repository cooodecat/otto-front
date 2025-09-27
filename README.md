# Otto Frontend

시각적 파이프라인 빌더와 실시간 모니터링을 제공하는 Otto 플랫폼의 프론트엔드 애플리케이션입니다.

## 프로젝트 개요

Otto Frontend는 복잡한 CI/CD 설정을 직관적인 드래그앤드롭 인터페이스로 단순화하여, 개발자와 비개발자 모두가 쉽게 배포 파이프라인을 구성할 수 있도록 지원합니다.

### 핵심 기능

- **비주얼 파이프라인 빌더**: XYFlow 기반 드래그앤드롭 CI/CD 구성
- **실시간 로그 뷰어**: WebSocket을 통한 빌드 로그 스트리밍
- **프로젝트 관리**: GitHub 리포지토리 연동 및 프로젝트 설정
- **실행 모니터링**: 빌드/배포 상태 실시간 추적

## 기술 스택

### Core Framework

- **SvelteKit 2.22.0**: 풀스택 웹 프레임워크
- **Svelte 5.0**: 최신 Runes 문법 적용 ($state, $props, $effect)
- **TypeScript 5.0**: 정적 타입 검증

### UI/UX

- **XYFlow/Svelte 1.3.0**: 노드 기반 플로우 다이어그램
- **Tailwind CSS 4.0**: 유틸리티 퍼스트 CSS 프레임워크
- **Lucide Svelte**: 아이콘 라이브러리

### API & 통신

- **Nestia SDK**: 타입 세이프 API 클라이언트 자동 생성
- **Socket.io Client 4.8.1**: 실시간 양방향 통신
- **Typia 9.7.2**: 런타임 타입 검증

### 빌드 도구

- **Vite 7.0.4**: 고속 개발 서버 및 번들러
- **@sveltejs/adapter-vercel**: Vercel 배포 어댑터

## 프로젝트 구조

```
src/
├── lib/
│   ├── sdk/                    # Nestia 자동 생성 API 클라이언트
│   ├── components/
│   │   ├── flow/               # 파이프라인 빌더 컴포넌트
│   │   ├── landing/            # 랜딩 페이지 컴포넌트  
│   │   └── ui/                 # 공통 UI 컴포넌트
│   ├── services/               # 비즈니스 로직 (로그, WebSocket)
│   ├── utils/                  # 유틸리티 함수
│   ├── types/                  # 타입 정의
│   └── server/                 # 서버사이드 유틸리티
└── routes/                     # SvelteKit 라우팅
    ├── auth/                   # 인증 관련
    ├── projects/               # 프로젝트 관리
    └── app/github/callback/    # GitHub App 설치 콜백
```

---

<img width="7016" height="9933" alt="otto-poster-final" src="https://github.com/user-attachments/assets/0f9be0cd-6853-45ca-a9a8-81637ac2196d" />

---

Otto Frontend - 누구나 쉽게 사용할 수 있는 CI/CD 파이프라인 빌더
