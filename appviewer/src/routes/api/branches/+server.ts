import { json, error } from '@sveltejs/kit';
import { listAiLoopBranches } from '$lib/server/git.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ url }) => {
	const repo = url.searchParams.get('repo');
	if (!repo) {
		throw error(400, 'Missing "repo" query parameter');
	}

	try {
		const branches = await listAiLoopBranches(repo);
		return json({ branches });
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Failed to list branches';
		throw error(400, message);
	}
};
