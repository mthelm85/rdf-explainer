<script>
	import Figure from '#lib/components/Figure.svelte';
	import { chainFigure } from '#lib/figures.js';
</script>

<h2 id="triples">A fact has three parts</h2>

<p>
	Every statement in RDF is a <em>triple</em>: a subject, a predicate and an object. Triples chain
	together into a graph, and following the arrows lets software answer questions nobody wrote code
	for.
</p>

<figure>
	<Figure draw={chainFigure} />
	<figcaption class="caption">
		Three triples. Read left to right: Maria holds a degree, the degree certifies a skill, and a job
		requires that skill. So Maria may fit the job.
	</figcaption>
</figure>

