import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (_serverEvent) => {
  throw redirect(307, './pipelines');
};
