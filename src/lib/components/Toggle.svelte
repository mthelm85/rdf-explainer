<script>
	/** @type {{ options: { value: any, label: string }[], value: any, label?: string }} */
	let { options, value = $bindable(), label = 'Options' } = $props();
</script>

<div class="toggle" role="group" aria-label={label}>
	{#each options as o (o.label)}
		<button type="button" aria-pressed={o.value === value} onclick={() => (value = o.value)}>
			{o.label}
		</button>
	{/each}
</div>

<style>
	.toggle {
		display: flex;
		gap: 1.25rem;
		margin: 1.5rem 0 0.75rem;
	}

	button {
		appearance: none;
		background: none;
		border: 0;
		border-bottom: 1px solid transparent;
		padding: 0 0 2px;
		font: 500 0.85rem var(--sans);
		color: var(--muted);
		cursor: pointer;
	}

	button:hover {
		color: var(--ink);
	}

	button[aria-pressed='true'] {
		color: var(--ink);
		border-bottom-color: var(--ink);
	}
</style>
