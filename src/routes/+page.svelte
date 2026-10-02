<script>
	import Triples from '#lib/sections/Triples.svelte';
	import Names from '#lib/sections/Names.svelte';
	import Syntax from '#lib/sections/Syntax.svelte';
	import Merging from '#lib/sections/Merging.svelte';
	import Why from '#lib/sections/Why.svelte';
	import Start from '#lib/sections/Start.svelte';

	let { data } = $props();
</script>

<header id="top">
	<h1>An Introduction to RDF</h1>
	<p class="subtitle">And how it can help reduce labor market friction</p>
</header>

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
<Start />
