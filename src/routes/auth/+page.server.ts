import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import api from '$lib/sdk';
import { makeFetch } from '$lib/utils/make-fetch';
import { PUBLIC_GITHUB_CLIENT_ID } from '$env/static/public';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	try {
		await api.functional.user.userGetMyInfo(makeFetch({ fetch, cookie: cookies.toString() }));
	} catch (error) {
		console.log(error);
		const clientId = PUBLIC_GITHUB_CLIENT_ID ?? 'your-github-client-id';
		const redirectUri = `${process.env.ORIGIN || 'http://localhost:5173'}/auth/callback`;
		const scope = 'read:user user:email';
		const state = crypto.randomUUID();

		const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;

		throw redirect(302, githubUrl);
	}

	throw redirect(302, '/projects');
};
