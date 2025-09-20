import api from '$lib/sdk';
import { makeFetch } from '$lib/utils/make-fetch';
import type { ServerLoadEvent } from '@sveltejs/kit';

export async function isAuthenticated({ cookies, fetch, url }: ServerLoadEvent) {
  try {
    const isSecure = url ? url.protocol === 'https:' : process.env.NODE_ENV === 'production';
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
    return false;
  }
}
