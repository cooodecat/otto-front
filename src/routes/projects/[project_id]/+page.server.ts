import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (serverEvent) => {
  throw redirect(307, './pipelines');
};
