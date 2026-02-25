import { error } from '@sveltejs/kit';
import { gitLog, gitDiffStats } from '$lib/server/git.js';
import { parseCommits, buildLoopRun } from '$lib/server/parser.js';
import type { PageServerLoad } from './$types.js';
import type { CommitDetail } from '$lib/types.js';

export const load: PageServerLoad = async ({ params, url }) => {
	const repo = url.searchParams.get('repo');
	const branch = url.searchParams.get('branch');
	const iteration = params.iteration;

	if (!repo || !branch) {
		throw error(400, 'Missing "repo" or "branch" query parameter');
	}

	try {
		const rawCommits = await gitLog(repo, branch);
		const commits = parseCommits(rawCommits);
		const loopRun = buildLoopRun(repo, branch, commits);

		// Find the commit matching the iteration label
		const commit = commits.find(
			(c) => c.metadata?.iteration === iteration
		);

		if (!commit) {
			throw error(404, `Iteration "${iteration}" not found`);
		}

		const diffStats = await gitDiffStats(repo, commit.hash);
		const totalInsertions = diffStats.reduce((sum, d) => sum + d.insertions, 0);
		const totalDeletions = diffStats.reduce((sum, d) => sum + d.deletions, 0);

		const detail: CommitDetail = {
			commit,
			diffStats,
			totalInsertions,
			totalDeletions,
			filesChanged: diffStats.length
		};

		// Find prev/next iterations for navigation
		const allIterations: string[] = [];
		for (const outer of loopRun.outerIterations) {
			for (const inner of outer.innerIterations) {
				allIterations.push(inner.iterationLabel);
			}
			allIterations.push(outer.commit.metadata!.iteration);
		}

		const currentIdx = allIterations.indexOf(iteration);
		const prevIteration = currentIdx > 0 ? allIterations[currentIdx - 1] : null;
		const nextIteration = currentIdx < allIterations.length - 1 ? allIterations[currentIdx + 1] : null;

		return {
			detail,
			prevIteration,
			nextIteration,
			repo,
			branch
		};
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		const message = e instanceof Error ? e.message : 'Failed to load iteration detail';
		throw error(500, message);
	}
};
