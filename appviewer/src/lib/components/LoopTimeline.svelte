<script lang="ts">
	import type { LoopRun } from '$lib/types.js';
	import OuterIterationCard from './OuterIterationCard.svelte';

	let { loopRun }: { loopRun: LoopRun } = $props();

	const totalInner = $derived(
		loopRun.outerIterations.reduce((sum, o) => sum + o.innerIterations.length, 0)
	);
	const passCount = $derived(
		loopRun.outerIterations.filter((o) => o.targetMet === 'true').length
	);
</script>

<!-- Summary -->
<div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
	<div class="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-3">
		<p class="text-xs text-zinc-500">Outer iterations</p>
		<p class="text-2xl font-bold text-zinc-100">{loopRun.outerIterations.length}</p>
	</div>
	<div class="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-3">
		<p class="text-xs text-zinc-500">Inner iterations</p>
		<p class="text-2xl font-bold text-zinc-100">{totalInner}</p>
	</div>
	<div class="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-3">
		<p class="text-xs text-zinc-500">Targets met</p>
		<p class="text-2xl font-bold text-emerald-400">{passCount}</p>
	</div>
	<div class="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-3">
		<p class="text-xs text-zinc-500">Total commits</p>
		<p class="text-2xl font-bold text-zinc-100">{loopRun.allCommits.length}</p>
	</div>
</div>

{#if loopRun.nonLoopCommits.length > 0}
	<div class="mb-4 rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3">
		<p class="mb-1.5 text-xs font-medium tracking-wide text-zinc-500 uppercase">Non-loop commits</p>
		{#each loopRun.nonLoopCommits as commit}
			<div class="flex items-center gap-2 py-1 text-sm">
				<span class="font-mono text-xs text-zinc-500">{commit.shortHash}</span>
				<span class="text-zinc-400">{commit.subject}</span>
			</div>
		{/each}
	</div>
{/if}

<!-- Loop hierarchy info -->
{#if loopRun.outerNodeName || loopRun.innerNodeName}
	<div class="mb-4 flex items-center gap-2 text-xs text-zinc-500">
		<span class="rounded bg-zinc-800 px-2 py-0.5 font-mono">{loopRun.outerNodeName}</span>
		{#if loopRun.innerNodeName}
			<span class="text-zinc-600">&rarr;</span>
			<span class="rounded bg-zinc-800 px-2 py-0.5 font-mono">{loopRun.innerNodeName}</span>
		{/if}
	</div>
{/if}

<!-- Timeline -->
<div class="relative space-y-4">
	<!-- Vertical line -->
	<div class="absolute top-0 bottom-0 left-[11px] w-0.5 bg-zinc-700/50"></div>

	{#each loopRun.outerIterations as outer}
		<OuterIterationCard {outer} repo={loopRun.repoPath} branch={loopRun.branch} />
	{/each}
</div>
