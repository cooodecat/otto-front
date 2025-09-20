import api from '$lib/sdk';
import { makeFetch } from '$lib/utils/make-fetch';
import type { ServerLoadEvent } from '@sveltejs/kit';

export async function isAuthenticated({ cookies, fetch }: ServerLoadEvent) {
  try {
    const p = await api.functional.auth.refresh.authRefreshSignIn(makeFetch({ fetch }));
    cookies.set('access_token', p.accessToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: p.accessTokenExpiresIn
    });

    cookies.set('refresh_token', p.refreshToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: p.refreshTokenExpiresIn
    });
    return true;
  } catch (e) {
    return false;
  }
}
