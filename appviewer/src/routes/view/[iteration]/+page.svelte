<script lang="ts">
	import IterationDetail from '$lib/components/IterationDetail.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Iteration {data.detail.commit.metadata?.iteration ?? data.detail.commit.shortHash} — AI Loops Viewer</title>
</svelte:head>

<div class="min-h-screen bg-zinc-900">
	<!-- Header -->
	<header class="border-b border-zinc-800 bg-zinc-900/95">
		<div class="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
			<a href="/" class="text-sm font-semibold text-zinc-300 hover:text-white">AI Loops</a>
			<span class="text-zinc-600">/</span>
			<a
				href="/view?repo={encodeURIComponent(data.repo)}&branch={encodeURIComponent(data.branch)}"
				class="text-sm text-zinc-400 hover:text-zinc-200"
			>
				{data.branch}
			</a>
			<span class="text-zinc-600">/</span>
			<span class="text-sm text-zinc-200">{data.detail.commit.metadata?.iteration ?? data.detail.commit.shortHash}</span>
		</div>
	</header>

	<!-- Content -->
	<main class="mx-auto max-w-4xl px-4 py-8">
		<IterationDetail
			detail={data.detail}
			prevIteration={data.prevIteration}
			nextIteration={data.nextIteration}
			repo={data.repo}
			branch={data.branch}
		/>
	</main>
</div>
