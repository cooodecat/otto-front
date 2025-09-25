import api from '$lib/sdk';
import { makeFetch } from '$lib/utils/make-fetch';
import type { ServerLoadEvent } from '@sveltejs/kit';

/**
 * JWT 토큰 디코딩 (서명 검증 없이 페이로드만 추출)
 */
function decodeJWT(token: string): { exp?: number; sub?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch {
    return null;
  }
}

/**
 * 토큰이 만료되었는지 확인
 * @param exp - JWT exp claim (초 단위)
 * @param bufferSeconds - 만료 전 버퍼 시간 (기본 60초)
 */
function isTokenExpired(exp: number | undefined, bufferSeconds = 60): boolean {
  if (!exp) return true;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return exp <= nowInSeconds + bufferSeconds;
}

export async function isAuthenticated({ cookies, fetch, url }: ServerLoadEvent) {
  try {
    const isSecure = url ? url.protocol === 'https:' : process.env.NODE_ENV === 'production';
    const accessToken = cookies.get('access_token');
    const refreshToken = cookies.get('refresh_token');

    // refresh token이 없으면 인증 실패
    if (!refreshToken) {
      return false;
    }

    // access token이 있고 아직 유효한 경우, refresh 건너뛰기
    if (accessToken) {
      const decoded = decodeJWT(accessToken);
      if (decoded && !isTokenExpired(decoded.exp)) {
        // access token이 아직 유효함, refresh 불필요
        return true;
      }
    }

    // access token이 없거나 만료된 경우에만 refresh 시도
    const p = await api.functional.auth.refresh.authRefreshSignIn(makeFetch({ fetch }));

    cookies.set('access_token', p.accessToken, {
      path: '/',
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: p.accessTokenExpiresIn,
      // Production에서는 도메인 전체에서 쿠키 공유
      ...(isSecure && { domain: '.codecat-otto.shop' })
    });

    cookies.set('refresh_token', p.refreshToken, {
      path: '/',
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: p.refreshTokenExpiresIn,
      // Production에서는 도메인 전체에서 쿠키 공유
      ...(isSecure && { domain: '.codecat-otto.shop' })
    });
    return true;
  } catch (_e) {
    // refresh 실패 시 인증 실패로 처리
    return false;
  }
}
