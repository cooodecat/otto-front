import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import api from '$lib/sdk';
import { makeFetch } from '$lib/utils/make-fetch';
import { PUBLIC_BACKEND_URL } from '$env/static/public';

export const load: PageServerLoad = async ({ url, fetch, cookies }) => {
  const code = url.searchParams.get('code') ?? '';
  const state = url.searchParams.get('state') ?? '';
  const isSecure = url.protocol === 'https:';

  try {
    const backendUrl = PUBLIC_BACKEND_URL || 'http://localhost:4000';
    console.log('[Auth Callback] Processing OAuth callback:', {
      code: code?.substring(0, 8) + '...',
      state: state?.substring(0, 8) + '...',
      protocol: url.protocol,
      backendUrl,
      apiEndpoint: `${backendUrl}/api/v1/auth/github`
    });

    // Try direct fetch as fallback for debugging
    const connection = makeFetch({ fetch });
    console.log('[Auth Callback] Connection details:', {
      host: connection.host,
      headers: connection.headers
    });

    const result = await api.functional.auth.github.authGithubSignIn(connection, {
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
    console.error('[Auth Callback] Error type:', typeof err);
    console.error('[Auth Callback] Error details:', {
      message: err instanceof Error ? err.message : 'Unknown',
      stack: err instanceof Error ? err.stack : undefined,
      cause: err instanceof Error ? err.cause : undefined
    });

    if (err instanceof Response && err.status === 302) {
      throw err;
    }

    let errorMessage = '로그인 처리 중 오류가 발생했습니다.';
    let errorDetails = '';

    if (err instanceof Error) {
      errorMessage = err.message || errorMessage;
      // Check for fetch-specific errors
      if (err.message.includes('fetch failed')) {
        errorDetails = `Network error: Cannot connect to ${import.meta.env.PUBLIC_BACKEND_URL || 'backend'}`;
      }
      errorDetails = errorDetails || err.stack || '';
    }

    return {
      error: errorMessage,
      details: errorDetails
    };
  }
  throw redirect(302, '/projects');
};
