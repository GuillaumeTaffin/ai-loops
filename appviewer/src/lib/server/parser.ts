import type { RawCommit } from './git.js';
import type {
	ParsedCommit,
	ParsedCommitMetadata,
	ParsedSensor,
	OuterIteration,
	InnerIteration,
	LoopRun
} from '$lib/types.js';

const SUBJECT_REGEX = /^ai-loop\[(.+?)\]:\s*iteration\s+(\S+)\s*(?:—|--|-)\s*(.+)$/;

function parseSensors(sensorStr: string): ParsedSensor[] {
	// Format: "verify: pass (trivial), coverage: fail (no jacoco), lint: fail (no spotless)"
	const sensors: ParsedSensor[] = [];
	// Split on ", " but be careful about parenthetical content
	const parts = sensorStr.split(/,\s+(?=\w+:)/);

	for (const part of parts) {
		const match = part.match(/^(\w[\w-]*):\s*(pass|fail|partial|pending)(?:\s*\((.+)\))?$/);
		if (match) {
			sensors.push({
				name: match[1],
				status: match[2] as ParsedSensor['status'],
				details: match[3] || undefined
			});
		} else {
			sensors.push({
				name: part.trim(),
				status: 'unknown',
				details: part.trim()
			});
		}
	}

	return sensors;
}

function parseMetadata(body: string): ParsedCommitMetadata | null {
	const lines = body.trim().split('\n');
	const data: Record<string, string> = {};

	for (const line of lines) {
		const match = line.match(/^\[(\w[\w-]*)\]\s*(.+)$/);
		if (match) {
			data[match[1]] = match[2].trim();
		}
	}

	if (!data['node-path'] || !data['iteration']) {
		return null;
	}

	return {
		nodePath: data['node-path'],
		level: parseInt(data['level'] || '0', 10),
		iteration: data['iteration'],
		status: data['status'] || 'unknown',
		targetMet: data['target-met'] || 'unknown',
		sensors: data['sensors'] ? parseSensors(data['sensors']) : [],
		action: data['action'] || ''
	};
}

export function parseCommits(rawCommits: RawCommit[]): ParsedCommit[] {
	return rawCommits.map((raw) => {
		const subjectMatch = raw.subject.match(SUBJECT_REGEX);
		const metadata = parseMetadata(raw.body);
		const isAiLoop = subjectMatch !== null && metadata !== null;

		let title = raw.subject;
		if (subjectMatch) {
			title = subjectMatch[3];
		}

		return {
			hash: raw.hash,
			shortHash: raw.shortHash,
			date: raw.date,
			subject: raw.subject,
			body: raw.body.trim(),
			metadata,
			isAiLoop,
			title
		};
	});
}

export function buildLoopRun(
	repoPath: string,
	branch: string,
	commits: ParsedCommit[]
): LoopRun {
	const outerIterationsMap = new Map<number, OuterIteration>();
	const innerCommitsMap = new Map<number, InnerIteration[]>();
	const nonLoopCommits: ParsedCommit[] = [];
	let outerNodeName = '';
	let innerNodeName = '';

	// First pass: identify outer and inner commits
	for (const commit of commits) {
		if (!commit.isAiLoop || !commit.metadata) {
			nonLoopCommits.push(commit);
			continue;
		}

		const { metadata } = commit;
		const iterParts = metadata.iteration.split('.');

		if (metadata.level === 0) {
			// Outer iteration
			if (!outerNodeName && metadata.nodePath) {
				outerNodeName = metadata.nodePath;
			}
			const outerNum = parseInt(iterParts[0], 10);
			outerIterationsMap.set(outerNum, {
				iterationNumber: outerNum,
				commit,
				innerIterations: [],
				sensors: metadata.sensors,
				targetMet: metadata.targetMet,
				action: metadata.action
			});
		} else if (metadata.level === 1) {
			// Inner iteration
			if (!innerNodeName) {
				const pathParts = metadata.nodePath.split('/');
				innerNodeName = pathParts[pathParts.length - 1];
			}
			const outerNum = parseInt(iterParts[0], 10);
			if (!innerCommitsMap.has(outerNum)) {
				innerCommitsMap.set(outerNum, []);
			}
			innerCommitsMap.get(outerNum)!.push({
				iterationLabel: metadata.iteration,
				commit
			});
		}
	}

	// Second pass: attach inner iterations to outer iterations
	for (const [outerNum, inners] of innerCommitsMap) {
		const outer = outerIterationsMap.get(outerNum);
		if (outer) {
			outer.innerIterations = inners;
		}
	}

	// Sort outer iterations by number
	const outerIterations = Array.from(outerIterationsMap.values()).sort(
		(a, b) => a.iterationNumber - b.iterationNumber
	);

	return {
		repoPath,
		branch,
		outerIterations,
		allCommits: commits,
		nonLoopCommits,
		outerNodeName,
		innerNodeName
	};
}
