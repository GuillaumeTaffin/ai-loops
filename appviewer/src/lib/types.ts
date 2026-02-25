export interface ParsedSensor {
	name: string;
	status: 'pass' | 'fail' | 'partial' | 'pending' | 'unknown';
	details?: string;
}

export interface ParsedCommitMetadata {
	nodePath: string;
	level: number;
	iteration: string;
	status: string;
	targetMet: string;
	sensors: ParsedSensor[];
	action: string;
}

export interface ParsedCommit {
	hash: string;
	shortHash: string;
	date: string;
	subject: string;
	body: string;
	metadata: ParsedCommitMetadata | null;
	isAiLoop: boolean;
	title: string;
}

export interface InnerIteration {
	iterationLabel: string;
	commit: ParsedCommit;
}

export interface OuterIteration {
	iterationNumber: number;
	commit: ParsedCommit;
	innerIterations: InnerIteration[];
	sensors: ParsedSensor[];
	targetMet: string;
	action: string;
}

export interface LoopRun {
	repoPath: string;
	branch: string;
	outerIterations: OuterIteration[];
	allCommits: ParsedCommit[];
	nonLoopCommits: ParsedCommit[];
	outerNodeName: string;
	innerNodeName: string;
}

export interface DiffFileStat {
	file: string;
	insertions: number;
	deletions: number;
}

export interface CommitDetail {
	commit: ParsedCommit;
	diffStats: DiffFileStat[];
	totalInsertions: number;
	totalDeletions: number;
	filesChanged: number;
}
