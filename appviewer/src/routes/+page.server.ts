import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types.js';

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const repo = data.get('repo') as string;
		const branch = data.get('branch') as string;

		if (repo && branch) {
			throw redirect(303, `/view?repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(branch)}`);
		}

		return { error: 'Please select a repository and branch' };
	}
} satisfies Actions;
