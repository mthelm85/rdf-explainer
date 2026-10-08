<script>
	import Figure from './Figure.svelte';
	import Toggle from './Toggle.svelte';
	import { exampleGraph, highlight } from '#lib/figures.js';

	/** @type {{ example: any, reading: string, note?: string }} */
	let { example, reading, note = '' } = $props();

	let syntax = $state('turtle');
	let copied = $state(false);
	const NAMES = { turtle: 'Turtle', jsonld: 'JSON-LD', ntriples: 'N-Triples' };
	const text = $derived(example[syntax]);

	async function copy() {
		await navigator.clipboard?.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<p>{reading}</p>

<figure>
	<Figure draw={(w) => exampleGraph(example.triples, w)} />
	<figcaption class="caption">
		{example.triples.length} triples. Dots are things with IRIs; boxes are plain values{note}.
	</figcaption>
</figure>

<div class="bar screen-only">
	<Toggle
		options={[
			{ value: 'turtle', label: 'Turtle' },
			{ value: 'jsonld', label: 'JSON-LD' },
			{ value: 'ntriples', label: 'N-Triples' }
		]}
		bind:value={syntax}
		label="{example.title} syntax"
	/>
	<button type="button" class="copy" onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
</div>
<!-- highlight() escapes the source before adding token spans -->
<!-- Focusable so keyboard users can scroll long lines horizontally. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<pre class="screen-only" tabindex="0" aria-label="{example.title} in {NAMES[syntax]}"><code
		>{@html highlight(text, syntax === 'jsonld' ? 'jsonld' : 'turtle')}</code
	></pre>

<!-- On paper, all three formats in turn. -->
<div class="print-only">
	{#each Object.entries(NAMES) as [key, name] (key)}
		<p class="format">{name}</p>
		<pre><code>{@html highlight(example[key], key === 'jsonld' ? 'jsonld' : 'turtle')}</code></pre>
	{/each}
</div>

<style>
	.format {
		font: 600 0.8rem var(--sans);
		color: var(--muted);
		margin: 1rem 0 0.35rem;
	}

	.bar {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.copy {
		appearance: none;
		background: none;
		border: 0;
		padding: 0;
		font: 500 0.85rem var(--sans);
		color: var(--muted);
		cursor: pointer;
	}

	.copy:hover {
		color: var(--ink);
	}

	pre,
	.print-only {
		margin-bottom: 1.5rem;
	}

	.print-only pre {
		margin-bottom: 0;
	}
</style>
