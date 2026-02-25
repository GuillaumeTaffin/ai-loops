<script lang="ts">
	import type { ParsedSensor } from '$lib/types.js';

	let { sensor }: { sensor: ParsedSensor } = $props();

	const colorMap: Record<string, string> = {
		pass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
		fail: 'bg-red-100 text-red-800 border-red-300',
		partial: 'bg-amber-100 text-amber-800 border-amber-300',
		pending: 'bg-blue-100 text-blue-800 border-blue-300',
		unknown: 'bg-zinc-100 text-zinc-600 border-zinc-300'
	};

	const iconMap: Record<string, string> = {
		pass: '\u2713',
		fail: '\u2717',
		partial: '~',
		pending: '\u25CB',
		unknown: '?'
	};
</script>

<span
	class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium {colorMap[sensor.status] ?? colorMap.unknown}"
	title={sensor.details ? `${sensor.name}: ${sensor.details}` : sensor.name}
>
	<span class="font-mono text-[10px]">{iconMap[sensor.status] ?? '?'}</span>
	{sensor.name}
	{#if sensor.details}
		<span class="max-w-24 truncate opacity-70">({sensor.details})</span>
	{/if}
</span>
