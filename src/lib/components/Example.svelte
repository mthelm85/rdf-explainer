<script>
	import Figure from './Figure.svelte';
	import Toggle from './Toggle.svelte';
	import { exampleGraph, highlight } from '#lib/figures.js';

	/** @type {{ example: any, reading: string, note?: string }} */
	let { example, reading, note = '' } = $props();

	let syntax = $state('turtle');
	let copied = $state(false);
	const text = $derived(syntax === 'turtle' ? example.turtle : example.jsonld);

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

<div class="bar">
	<Toggle
		options={[
			{ value: 'turtle', label: 'Turtle' },
			{ value: 'jsonld', label: 'JSON-LD' }
		]}
		bind:value={syntax}
		label="{example.title} syntax"
	/>
	<button type="button" class="copy" onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
</div>
<!-- highlight() escapes the source before adding token spans -->
<!-- Focusable so keyboard users can scroll long lines horizontally. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<pre tabindex="0" aria-label="{example.title} in {syntax === 'turtle' ? 'Turtle' : 'JSON-LD'}"><code
		>{@html highlight(text, syntax)}</code
	></pre>

<style>
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

	pre {
		margin-bottom: 1.5rem;
	}
</style>
