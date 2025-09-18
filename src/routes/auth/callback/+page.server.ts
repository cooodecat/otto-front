import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import api from '$lib/sdk';
import { makeFetch } from '$lib/utils/make-fetch';

export const load: PageServerLoad = async ({ url, fetch, cookies }) => {
	const code = url.searchParams.get('code') ?? '';
	const state = url.searchParams.get('state') ?? '';

	try {
		const result = await api.functional.auth.github.authGithubSignIn(makeFetch({ fetch }), {
			code,
			state: state || ''
		});

		cookies.set('access_token', result.accessToken, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: result.accessTokenExpiresIn
		});

		cookies.set('refresh_token', result.refreshToken, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: result.refreshTokenExpiresIn
		});
	} catch (err) {
		if (err instanceof Response && err.status === 302) {
			throw err;
		}
		return {
			error: '로그인 처리 중 오류가 발생했습니다.'
		};
	}
	throw redirect(302, '/projects');
};
