<script>
	/**
	 * Renders a D3/Plot node sized to the container. `draw(width)` builds the
	 * node; `update(node)` runs afterwards whenever the state it reads changes,
	 * so figures can animate between states instead of being rebuilt.
	 * @type {{ draw: (width: number) => Element, update?: (node: any) => void }}
	 */
	let { draw, update } = $props();

	let width = $state(0);
	/** @type {HTMLDivElement} */
	let container;
	/** @type {any} */
	let node = $state(null);

	$effect(() => {
		if (!width) return;
		const el = draw(width);
		container.replaceChildren(el);
		node = el;
		return () => /** @type {any} */ (el).simulation?.stop();
	});

	$effect(() => {
		if (node && update) update(node);
	});
</script>

<div class="figure" bind:this={container} bind:clientWidth={width}></div>

<style>
	.figure {
		width: 100%;
		min-height: 1px;
	}
</style>
