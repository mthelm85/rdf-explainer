<script>
	import Triples from '#lib/sections/Triples.svelte';
	import Names from '#lib/sections/Names.svelte';
	import Syntax from '#lib/sections/Syntax.svelte';
	import Merging from '#lib/sections/Merging.svelte';
	import Why from '#lib/sections/Why.svelte';

	let { data } = $props();
</script>

<h1 id="top">RDF, briefly</h1>

<p class="lede">
	The Resource Description Framework is a simple way to write down facts so that data from
	different organizations fits together on its own. Here is how it works, and why it matters for
	connecting workers, employers and educators.
</p>

<Triples />
<Names />
<Merging quads={data.quads} />
<Why quads={data.quads} />
<Syntax examples={data.examples} />
