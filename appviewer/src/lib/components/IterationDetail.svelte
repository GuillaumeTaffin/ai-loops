<script lang="ts">
	import type { CommitDetail } from '$lib/types.js';
	import SensorBadge from './SensorBadge.svelte';
	import CommitDiffStats from './CommitDiffStats.svelte';

	let {
		detail,
		prevIteration,
		nextIteration,
		repo,
		branch
	}: {
		detail: CommitDetail;
		prevIteration: string | null;
		nextIteration: string | null;
		repo: string;
		branch: string;
	} = $props();

	const meta = $derived(detail.commit.metadata);
	const qs = $derived(`repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(branch)}`);
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<div class="flex items-center gap-2 text-xs text-zinc-500">
			{#if meta}
				<span class="rounded bg-zinc-800 px-2 py-0.5 font-mono">{meta.nodePath}</span>
				<span>|</span>
				<span>Level {meta.level}</span>
				<span>|</span>
			{/if}
			<span class="font-mono">{detail.commit.shortHash}</span>
			<span>|</span>
			<span>{new Date(detail.commit.date).toLocaleString()}</span>
		</div>
		<h2 class="mt-2 text-xl font-bold text-zinc-100">
			{#if meta}
				Iteration {meta.iteration} — {detail.commit.title}
			{:else}
				{detail.commit.subject}
			{/if}
		</h2>
	</div>

	<!-- Status & sensors -->
	{#if meta}
		<div class="grid gap-3 sm:grid-cols-3">
			<div class="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-3">
				<p class="text-xs text-zinc-500">Status</p>
				<p class="font-medium text-zinc-200">{meta.status}</p>
			</div>
			<div class="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-3">
				<p class="text-xs text-zinc-500">Target met</p>
				<p class="font-medium {meta.targetMet === 'true' ? 'text-emerald-400' : meta.targetMet === 'pending' ? 'text-blue-400' : 'text-red-400'}">
					{meta.targetMet}
				</p>
			</div>
			<div class="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-3">
				<p class="text-xs text-zinc-500">Action</p>
				<p class="text-sm text-zinc-300">{meta.action}</p>
			</div>
		</div>

		{#if meta.sensors.length > 0}
			<div>
				<p class="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">Sensors</p>
				<div class="flex flex-wrap gap-1.5">
					{#each meta.sensors as sensor}
						<SensorBadge {sensor} />
					{/each}
				</div>
			</div>
		{/if}
	{/if}

	<!-- Full commit message -->
	{#if detail.commit.body}
		<div>
			<p class="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">Commit body</p>
			<pre class="whitespace-pre-wrap rounded-lg bg-zinc-800/80 p-4 font-mono text-xs text-zinc-300">{detail.commit.body}</pre>
		</div>
	{/if}

	<!-- Diff stats -->
	{#if detail.diffStats.length > 0}
		<div>
			<p class="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
				Changes — {detail.filesChanged} file{detail.filesChanged !== 1 ? 's' : ''}
				<span class="ml-2 text-emerald-400">+{detail.totalInsertions}</span>
				<span class="ml-1 text-red-400">-{detail.totalDeletions}</span>
			</p>
			<CommitDiffStats stats={detail.diffStats} />
		</div>
	{/if}

	<!-- Navigation -->
	<div class="flex items-center justify-between border-t border-zinc-700/50 pt-4">
		{#if prevIteration}
			<a
				href="/view/{prevIteration}?{qs}"
				class="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
			>
				&larr; {prevIteration}
			</a>
		{:else}
			<div></div>
		{/if}
		{#if nextIteration}
			<a
				href="/view/{nextIteration}?{qs}"
				class="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
			>
				{nextIteration} &rarr;
			</a>
		{/if}
	</div>
</div>
