import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isAuthenticated } from '$lib/server/server-utils';

export const load: PageServerLoad = async (serverEvent) => {
	const isAuth = await isAuthenticated(serverEvent);
	if (!isAuth) throw redirect(302, '/');

	return {};
};
