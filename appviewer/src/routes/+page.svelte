<script lang="ts">
	import BranchSelector from '$lib/components/BranchSelector.svelte';
</script>

<svelte:head>
	<title>AI Loops Viewer</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-zinc-900 p-4">
	<div class="w-full max-w-xl">
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold text-zinc-100">AI Loops Viewer</h1>
			<p class="mt-2 text-sm text-zinc-400">
				Visualize structured ai-loop Git history as a navigable hierarchy.
			</p>
		</div>
		<BranchSelector />
	</div>
</div>
