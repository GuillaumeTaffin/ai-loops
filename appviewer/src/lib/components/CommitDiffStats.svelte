<script lang="ts">
	import type { DiffFileStat } from '$lib/types.js';

	let { stats }: { stats: DiffFileStat[] } = $props();

	const maxChanges = $derived(
		Math.max(1, ...stats.map((s) => s.insertions + s.deletions))
	);
</script>

<div class="space-y-1.5">
	{#each stats as stat}
		{@const total = stat.insertions + stat.deletions}
		{@const pct = (total / maxChanges) * 100}
		<div class="flex items-center gap-2 text-xs font-mono">
			<span class="w-48 truncate text-zinc-300" title={stat.file}>
				{stat.file}
			</span>
			<div class="flex h-3 flex-1 overflow-hidden rounded-sm bg-zinc-800">
				{#if stat.insertions > 0}
					<div
						class="bg-emerald-500"
						style="width: {(stat.insertions / maxChanges) * 100}%"
					></div>
				{/if}
				{#if stat.deletions > 0}
					<div
						class="bg-red-500"
						style="width: {(stat.deletions / maxChanges) * 100}%"
					></div>
				{/if}
			</div>
			<span class="w-20 text-right tabular-nums">
				{#if stat.insertions > 0}
					<span class="text-emerald-400">+{stat.insertions}</span>
				{/if}
				{#if stat.deletions > 0}
					<span class="text-red-400">-{stat.deletions}</span>
				{/if}
			</span>
		</div>
	{/each}
</div>
