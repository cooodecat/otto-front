import type { IConnection } from '@nestia/fetcher';
import { PUBLIC_BACKEND_URL } from '$env/static/public';
export function makeFetch({
  fetch = globalThis.fetch,
  cookie = ''
}: { fetch?: typeof window.fetch; cookie?: string } = {}): IConnection {
  return {
    host: `${PUBLIC_BACKEND_URL}/api/v1`,
    headers: {
      cookie: cookie
    },
    options: { credentials: 'include' },
    fetch: fetch
  };
}
