<script lang="ts">
	let {
		initialRepo = '',
		initialBranch = '',
		compact = false
	}: {
		initialRepo?: string;
		initialBranch?: string;
		compact?: boolean;
	} = $props();

	let repo = $state('');
	let branch = $state('');
	let branches = $state<string[]>([]);
	let loading = $state(false);
	let errorMsg = $state('');

	$effect(() => {
		repo = initialRepo;
		branch = initialBranch;
	});

	async function loadBranches() {
		if (!repo.trim()) return;
		loading = true;
		errorMsg = '';
		branches = [];

		try {
			const res = await fetch(`/api/branches?repo=${encodeURIComponent(repo.trim())}`);
			if (!res.ok) {
				const data = await res.json();
				errorMsg = data.message || 'Failed to load branches';
				return;
			}
			const data = await res.json();
			branches = data.branches;
			if (branches.length > 0 && !branch) {
				branch = branches[0];
			}
		} catch (e) {
			errorMsg = 'Failed to connect to server';
		} finally {
			loading = false;
		}
	}
</script>

{#if compact}
	<form method="GET" action="/view" class="flex items-center gap-2">
		<input
			type="text"
			name="repo"
			bind:value={repo}
			placeholder="Repository path"
			class="h-8 rounded border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-200 placeholder:text-zinc-500"
		/>
		<button
			type="button"
			onclick={loadBranches}
			class="h-8 rounded bg-zinc-700 px-2 text-xs text-zinc-300 hover:bg-zinc-600"
		>
			{loading ? '...' : 'Load'}
		</button>
		{#if branches.length > 0}
			<select
				name="branch"
				bind:value={branch}
				class="h-8 rounded border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-200"
			>
				{#each branches as b}
					<option value={b}>{b}</option>
				{/each}
			</select>
			<button type="submit" class="h-8 rounded bg-indigo-600 px-3 text-xs font-medium text-white hover:bg-indigo-500">
				View
			</button>
		{/if}
		{#if errorMsg}
			<span class="text-xs text-red-400">{errorMsg}</span>
		{/if}
	</form>
{:else}
	<div class="mx-auto max-w-lg">
		<div class="space-y-4">
			<div>
				<label for="repo" class="mb-1 block text-sm font-medium text-zinc-300">Repository path</label>
				<div class="flex gap-2">
					<input
						id="repo"
						type="text"
						bind:value={repo}
						placeholder="/path/to/your/repo"
						class="h-10 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
					/>
					<button
						type="button"
						onclick={loadBranches}
						disabled={loading || !repo.trim()}
						class="h-10 rounded-lg bg-zinc-700 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-600 disabled:opacity-50"
					>
						{loading ? 'Loading...' : 'Load branches'}
					</button>
				</div>
			</div>

			{#if errorMsg}
				<div class="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
					{errorMsg}
				</div>
			{/if}

			{#if branches.length > 0}
				<div>
					<label for="branch" class="mb-1 block text-sm font-medium text-zinc-300">Branch</label>
					<select
						id="branch"
						bind:value={branch}
						class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
					>
						{#each branches as b}
							<option value={b}>{b}</option>
						{/each}
					</select>
				</div>

				<a
					href="/view?repo={encodeURIComponent(repo.trim())}&branch={encodeURIComponent(branch)}"
					class="block w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-500"
				>
					View loop timeline
				</a>
			{:else if !loading && repo.trim() && !errorMsg}
				<p class="text-sm text-zinc-500">Enter a repository path and click "Load branches" to find ai-loop branches.</p>
			{/if}
		</div>
	</div>
{/if}
