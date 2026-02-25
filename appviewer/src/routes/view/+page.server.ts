import { error } from '@sveltejs/kit';
import { gitLog } from '$lib/server/git.js';
import { parseCommits, buildLoopRun } from '$lib/server/parser.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ url }) => {
	const repo = url.searchParams.get('repo');
	const branch = url.searchParams.get('branch');

	if (!repo || !branch) {
		throw error(400, 'Missing "repo" or "branch" query parameter');
	}

	try {
		const rawCommits = await gitLog(repo, branch);
		const commits = parseCommits(rawCommits);
		const loopRun = buildLoopRun(repo, branch, commits);

		return {
			loopRun
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Failed to load loop data';
		throw error(500, message);
	}
};
