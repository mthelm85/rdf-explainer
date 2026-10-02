<script>
	import Example from '#lib/components/Example.svelte';

	/** @type {{ examples: any[] }} */
	let { examples } = $props();
	const [job, record, skill] = $derived(examples);
</script>

<h2 id="syntax">Writing it down</h2>

<p>
	RDF is a data model, not a file format. The same graph can be written in several standard
	syntaxes. Three common formats are: <strong>Turtle</strong>, which is compact and easy to read;
	<strong>JSON-LD</strong>, which is ordinary JSON with a little context added; and
	<strong>N-Triples</strong>, which writes one triple per line with every name spelled out in full.
</p>

<p>
	The examples below are small pieces of the data used above: a job posting, a worker’s record and a
	skill. Each shows a small graph, then the same triples written all three ways. In Turtle, prefixes such as
	<code>schema:</code> are shorthand for long web addresses, declared once at the top.
</p>

<h3>A job posting</h3>

<Example
	example={job}
	reading="Acme Robotics is hiring an Automation Technician at $68,000. The job requires two skills, named by IRIs from a shared skills framework."
/>

<p>
	In Turtle, <code>;</code> means “same subject, next predicate” and <code>,</code> means “same
	predicate, next object”, so a description reads almost like a sentence. In JSON-LD, the
	<code>@context</code> says which keys are vocabulary terms, and <code>@id</code> gives the thing its
	name.
</p>

<p>
	N-Triples drops all of the shorthand. It is verbose, but it shows most plainly what an RDF graph
	is: a list of triples, each a subject, a predicate and an object, and nearly all of them IRIs. Only
	plain values such as names and salaries are not.
</p>

<h3>A worker’s record</h3>

<Example
	example={record}
	reading="Maria holds a credential recognized by Riverbend Community College. The credential describes the skills it certifies, using the same skill IRIs as the job posting."
	note="; the dashed line joins two mentions of the same credential"
/>

<p>
	JSON-LD can nest one thing inside another, which is how most APIs already shape their data.
	Setting <code>"@vocab"</code> to schema.org lets plain keys like <code>name</code> stand for full
	vocabulary terms. That is often all it takes to turn an existing JSON API into linked data.
</p>

<h3>A skill with its synonyms</h3>

<Example
	example={skill}
	reading="The skills framework defines PLC Programming once, lists the other ways people say it, and places it under a broader category."
/>

<p>
	This is what makes the four phrasings <a href="#names">above</a> line up: a skills
	framework publishes one IRI per skill, with its preferred label and its alternatives, using the
	<a href="https://www.w3.org/TR/skos-reference/">SKOS</a> vocabulary.
</p>
