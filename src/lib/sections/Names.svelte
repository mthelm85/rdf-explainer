<script>
	import Figure from '#lib/components/Figure.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { namesFigure } from '#lib/figures.js';

	let names = $state('text');
</script>

<h2 id="names">One name for one thing</h2>

<p>
	An employer, a college, an apprenticeship program and a worker can all describe the same skill in
	different words. People see the connection; software sees unrelated text.
</p>

<p>
	RDF names things with Internationalized Resource Identifiers (IRIs), web addresses such as
	<code>https://skills.riverbend.example/skill/plc-programming</code>. When everyone points to the
	same address, a match is no longer a guess.
</p>

<Toggle
	options={[
		{ value: 'text', label: 'As text' },
		{ value: 'rdf', label: 'With RDF' }
	]}
	bind:value={names}
	label="View"
/>

<figure>
	<Figure draw={namesFigure} update={(node) => node.update(names)} />
</figure>

