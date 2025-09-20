import type { IConnection } from '@nestia/fetcher';

// GitHub Actions에서 빌드 시 환경변수가 없을 수 있으므로 기본값 제공
const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:4000';

export function makeFetch({
  fetch = globalThis.fetch,
  cookie = ''
}: { fetch?: typeof window.fetch; cookie?: string } = {}): IConnection {
  return {
    host: `${BACKEND_URL}/api/v1`,
    headers: {
      cookie: cookie
    },
    options: { credentials: 'include' },
    fetch: fetch
  };
}
