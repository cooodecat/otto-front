import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import api from '$lib/sdk';
import { makeFetch } from '$lib/utils/make-fetch';

export const load: PageServerLoad = async ({ url, fetch, cookies }) => {
	try {
		await api.functional.auth.refresh.authRefreshSignIn(makeFetch({ fetch }));
	} catch (err) {
		throw redirect(302, '/');
	}
	return {};
};
