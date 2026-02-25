<script lang="ts">
	import BranchSelector from '$lib/components/BranchSelector.svelte';
	import LoopTimeline from '$lib/components/LoopTimeline.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.loopRun.branch} — AI Loops Viewer</title>
</svelte:head>

<div class="min-h-screen bg-zinc-900">
	<!-- Header -->
	<header class="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur">
		<div class="mx-auto flex max-w-4xl items-center gap-4 px-4 py-2">
			<a href="/" class="text-sm font-semibold text-zinc-300 hover:text-white">AI Loops</a>
			<div class="h-4 w-px bg-zinc-700"></div>
			<BranchSelector
				initialRepo={data.loopRun.repoPath}
				initialBranch={data.loopRun.branch}
				compact
			/>
		</div>
	</header>

	<!-- Content -->
	<main class="mx-auto max-w-4xl px-4 py-8">
		<div class="mb-6">
			<h1 class="text-xl font-bold text-zinc-100">{data.loopRun.branch}</h1>
			<p class="mt-1 text-xs font-mono text-zinc-500">{data.loopRun.repoPath}</p>
		</div>

		<LoopTimeline loopRun={data.loopRun} />
	</main>
</div>
