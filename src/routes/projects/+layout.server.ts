import { redirect } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/server-utils';
import type { PageServerLoad } from "../auth/callback/$types";

export const load: PageServerLoad = async (serverEvent) => {
	const isAuth = await isAuthenticated(serverEvent);
	if (!isAuth) throw redirect(302, '/');

	return {};
};