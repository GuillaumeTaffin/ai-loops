<script lang="ts">
	import type { OuterIteration } from '$lib/types.js';
	import SensorBadge from './SensorBadge.svelte';
	import InnerIterationCard from './InnerIterationCard.svelte';

	let { outer, repo, branch }: { outer: OuterIteration; repo: string; branch: string } = $props();

	let expanded = $state(true);

	const meta = $derived(outer.commit.metadata!);
	const targetMetColor = $derived(
		meta.targetMet === 'true'
			? 'border-emerald-500/30 bg-emerald-500/5'
			: meta.targetMet === 'pending'
				? 'border-blue-500/30 bg-blue-500/5'
				: 'border-red-500/30 bg-red-500/5'
	);
	const dotColor = $derived(
		meta.targetMet === 'true'
			? 'bg-emerald-500'
			: meta.targetMet === 'pending'
				? 'bg-blue-500'
				: 'bg-red-500'
	);
</script>

<div class="relative pl-8">
	<!-- Timeline dot -->
	<div class="absolute left-0 top-5 flex h-6 w-6 items-center justify-center rounded-full {dotColor} text-xs font-bold text-white shadow-lg">
		{outer.iterationNumber}
	</div>

	<!-- Card -->
	<div class="rounded-xl border {targetMetColor} p-4">
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				<a
					href="/view/{meta.iteration}?repo={encodeURIComponent(repo)}&branch={encodeURIComponent(branch)}"
					class="text-base font-semibold text-zinc-100 hover:text-white hover:underline"
				>
					Iteration {meta.iteration} — {outer.commit.title}
				</a>
				<p class="mt-0.5 text-xs text-zinc-400">
					{new Date(outer.commit.date).toLocaleString()}
					<span class="mx-1 text-zinc-600">|</span>
					<span class="font-mono">{outer.commit.shortHash}</span>
				</p>
			</div>
			{#if outer.innerIterations.length > 0}
				<button
					onclick={() => expanded = !expanded}
					class="shrink-0 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
				>
					{expanded ? 'Collapse' : 'Expand'} ({outer.innerIterations.length} inner)
				</button>
			{/if}
		</div>

		{#if outer.sensors.length > 0}
			<div class="mt-2 flex flex-wrap gap-1">
				{#each outer.sensors as sensor}
					<SensorBadge {sensor} />
				{/each}
			</div>
		{/if}

		{#if outer.action}
			<p class="mt-2 text-sm text-zinc-400">{outer.action}</p>
		{/if}

		<!-- Inner iterations -->
		{#if expanded && outer.innerIterations.length > 0}
			<div class="mt-3 space-y-2 border-t border-zinc-700/50 pt-3">
				<p class="text-xs font-medium tracking-wide text-zinc-500 uppercase">Inner iterations</p>
				{#each outer.innerIterations as inner}
					<InnerIterationCard {inner} {repo} {branch} />
				{/each}
			</div>
		{/if}
	</div>
</div>
