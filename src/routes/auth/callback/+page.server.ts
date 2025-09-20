import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import api from '$lib/sdk';
import { makeFetch } from '$lib/utils/make-fetch';

export const load: PageServerLoad = async ({ url, fetch, cookies }) => {
  const code = url.searchParams.get('code') ?? '';
  const state = url.searchParams.get('state') ?? '';
  const isSecure = url.protocol === 'https:';

  try {
    console.log('[Auth Callback] Processing OAuth callback:', {
      code: code?.substring(0, 8) + '...',
      state: state?.substring(0, 8) + '...',
      protocol: url.protocol
    });

    const result = await api.functional.auth.github.authGithubSignIn(makeFetch({ fetch }), {
      code,
      state: state || ''
    });

    console.log('[Auth Callback] Authentication successful');

    cookies.set('access_token', result.accessToken, {
      path: '/',
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: result.accessTokenExpiresIn
    });

    cookies.set('refresh_token', result.refreshToken, {
      path: '/',
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: result.refreshTokenExpiresIn
    });
  } catch (err) {
    console.error('[Auth Callback] Authentication error:', err);

    if (err instanceof Response && err.status === 302) {
      throw err;
    }

    let errorMessage = '로그인 처리 중 오류가 발생했습니다.';

    if (err instanceof Error) {
      errorMessage = err.message || errorMessage;
    }

    return {
      error: errorMessage
    };
  }
  throw redirect(302, '/projects');
};
