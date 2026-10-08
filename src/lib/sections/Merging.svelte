<script>
	import Figure from '#lib/components/Figure.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { indexQuads, mergeFigure } from '#lib/figures.js';

	/** @type {{ quads: any[] }} */
	let { quads } = $props();
	const index = $derived(indexQuads(quads));

	let mode = $state('separate');
	let reach = $state({ jobs: 0, skills: 0 });
	let merged = $state({ jobs: 0, skills: 0 });

	const PANELS = [
		{ graph: 'https://jobs.acme-robotics.example/graph', title: 'Employer' },
		{ graph: 'https://catalog.riverbend-cc.example/graph', title: 'College' },
		{ graph: 'https://wallet.example/maria-graph', title: 'Worker' }
	];
</script>

<h2 id="merging">Data that merges</h2>

<p>
	Because names are shared, combining datasets is seamless: their triples simply go into one graph.
	Below, an employer, a college and a worker each publish their own data. Nobody agreed on a
	database schema, only on the names.
</p>

<Toggle
	options={[
		{ value: 'separate', label: 'Separate' },
		{ value: 'merged', label: 'Merged' }
	]}
	bind:value={mode}
	label="Datasets"
/>

<figure>
	<Figure
		draw={(width) => mergeFigure({ quads: quads, index, panels: PANELS, width })}
		update={(node) => (reach = node.render(mode))}
	/>
	<figcaption class="caption">
		{#if mode === 'merged'}
			Merged: Maria now connects to <strong>{reach.jobs} job{reach.jobs === 1 ? '' : 's'}</strong>
			through <strong>{reach.skills} shared skills</strong>.
		{:else}
			Separate: no dataset on its own links Maria to a job.
		{/if}
		Links mean <em>requires</em>, <em>hiring organization</em>, <em>certifies</em>,
		<em>recognized by</em>, <em>holds credential</em> or <em>knows about</em><span class="screen-only">; hover over one to see which</span>.
	</figcaption>
</figure>

<figure class="print-only">
	<Figure
		draw={(width) => mergeFigure({ quads: quads, index, panels: PANELS, width })}
		update={(node) => (merged = node.render('merged'))}
	/>
	<figcaption class="caption">
		Merged: Maria now connects to <strong>{merged.jobs} job{merged.jobs === 1 ? '' : 's'}</strong>
		through <strong>{merged.skills} shared skills</strong>.
	</figcaption>
</figure>

<p>
	When the graphs merge, nodes with the same IRI become one node, and new paths appear. The blue
	lines in the merged graph trace Maria’s credential to the skills it certifies, and on to every job that asks for them.
	None of the three publishers held that information alone.
</p>
