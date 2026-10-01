<script>
	import Figure from '#lib/components/Figure.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { chainFigure } from '#lib/figures.js';

	let view = $state('one');
</script>

<h2 id="triples">A fact has three parts</h2>

<p>
	Every statement in RDF is a <em>triple</em>: a subject, a predicate and an object. The subject is
	the thing being described, the predicate is the relationship, and the object is what it points to.
</p>

<Toggle
	options={[
		{ value: 'one', label: 'One triple' },
		{ value: 'chain', label: 'Linked into a graph' }
	]}
	bind:value={view}
	label="Triple view"
/>

<figure>
	<Figure draw={chainFigure} update={(node) => node.update(view)} />
	<figcaption class="caption">
		{#if view === 'one'}
			One triple: Maria (subject) holds (predicate) a degree (object).
		{:else}
			Three triples. The object of one is the subject of the next: Maria holds a degree, the degree
			certifies a skill, and a job requires that skill. Following the arrows shows Maria may fit the
			job, without anyone writing code for that question.
		{/if}
	</figcaption>
</figure>
