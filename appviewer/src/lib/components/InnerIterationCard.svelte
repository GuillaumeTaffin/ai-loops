<script lang="ts">
	import type { InnerIteration } from '$lib/types.js';
	import SensorBadge from './SensorBadge.svelte';

	let { inner, repo, branch }: { inner: InnerIteration; repo: string; branch: string } = $props();

	const meta = $derived(inner.commit.metadata!);
	const targetMetColor = $derived(
		meta.targetMet === 'true'
			? 'text-emerald-400'
			: meta.targetMet === 'pending'
				? 'text-blue-400'
				: 'text-red-400'
	);
</script>

<a
	href="/view/{inner.iterationLabel}?repo={encodeURIComponent(repo)}&branch={encodeURIComponent(branch)}"
	class="group block rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-3 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
>
	<div class="flex items-start justify-between gap-2">
		<div class="min-w-0">
			<div class="flex items-center gap-2">
				<span class="font-mono text-xs text-zinc-400">{inner.iterationLabel}</span>
				<span class={`text-xs ${targetMetColor}`}>
					{meta.targetMet === 'true' ? 'target met' : meta.targetMet === 'pending' ? 'pending' : 'not met'}
				</span>
			</div>
			<p class="mt-0.5 text-sm text-zinc-200 group-hover:text-white">
				{inner.commit.title}
			</p>
		</div>
		<span class="shrink-0 font-mono text-[10px] text-zinc-500">{inner.commit.shortHash}</span>
	</div>

	{#if meta.sensors.length > 0}
		<div class="mt-2 flex flex-wrap gap-1">
			{#each meta.sensors as sensor}
				<SensorBadge {sensor} />
			{/each}
		</div>
	{/if}

	{#if meta.action}
		<p class="mt-1.5 text-xs text-zinc-500 italic">{meta.action}</p>
	{/if}
</a>
