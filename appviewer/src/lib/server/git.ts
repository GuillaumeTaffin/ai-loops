import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access } from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const COMMIT_SEPARATOR = '---COMMIT_SEP---';
const FIELD_SEPARATOR = '---FIELD_SEP---';

function validateRepoPath(repoPath: string): string {
	const resolved = path.resolve(repoPath);
	if (resolved.includes('..') && !path.isAbsolute(repoPath)) {
		throw new Error('Invalid repository path: path traversal not allowed');
	}
	return resolved;
}

async function ensureGitRepo(repoPath: string): Promise<void> {
	const gitDir = path.join(repoPath, '.git');
	try {
		await access(gitDir);
	} catch {
		throw new Error(`Not a git repository: ${repoPath}`);
	}
}

export interface RawCommit {
	hash: string;
	shortHash: string;
	date: string;
	subject: string;
	body: string;
}

export async function gitLog(repoPath: string, branch: string): Promise<RawCommit[]> {
	const resolved = validateRepoPath(repoPath);
	await ensureGitRepo(resolved);

	const format = [
		'%H', // hash
		'%h', // short hash
		'%aI', // date ISO
		'%s', // subject
		'%b' // body
	].join(FIELD_SEPARATOR);

	const { stdout } = await execFileAsync(
		'git',
		['log', `--format=${format}${COMMIT_SEPARATOR}`, '--reverse', branch],
		{ cwd: resolved, maxBuffer: 10 * 1024 * 1024 }
	);

	return stdout
		.split(COMMIT_SEPARATOR)
		.map((chunk) => chunk.trim())
		.filter(Boolean)
		.map((chunk) => {
			const parts = chunk.split(FIELD_SEPARATOR);
			return {
				hash: parts[0],
				shortHash: parts[1],
				date: parts[2],
				subject: parts[3],
				body: parts.slice(4).join(FIELD_SEPARATOR)
			};
		});
}

export async function gitDiffStats(
	repoPath: string,
	hash: string
): Promise<{ file: string; insertions: number; deletions: number }[]> {
	const resolved = validateRepoPath(repoPath);
	await ensureGitRepo(resolved);

	const { stdout } = await execFileAsync(
		'git',
		['diff-tree', '--numstat', '--no-commit-id', '-r', hash],
		{ cwd: resolved }
	);

	return stdout
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const [ins, del, file] = line.split('\t');
			return {
				file,
				insertions: ins === '-' ? 0 : parseInt(ins, 10),
				deletions: del === '-' ? 0 : parseInt(del, 10)
			};
		});
}

export async function listAiLoopBranches(repoPath: string): Promise<string[]> {
	const resolved = validateRepoPath(repoPath);
	await ensureGitRepo(resolved);

	const { stdout } = await execFileAsync('git', ['branch', '--list', 'ai-loop/*', '--format=%(refname:short)'], {
		cwd: resolved
	});

	return stdout
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((b) => b.trim());
}
