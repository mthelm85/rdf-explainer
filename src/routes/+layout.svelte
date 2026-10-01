<script>
	import '../app.css';
	import favicon from '#lib/assets/favicon.ico';
	import { SECTIONS } from '#lib/sections.js';

	let { children } = $props();

	// Highlight the section currently being read.
	let current = $state(SECTIONS[0].id);
	$effect(() => {
		const headings = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
		const update = () => {
			const line = window.innerHeight * 0.3;
			let active = SECTIONS[0].id;
			for (const h of headings) if (/** @type {HTMLElement} */ (h).getBoundingClientRect().top <= line) active = /** @type {HTMLElement} */ (h).id;
			if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) active = SECTIONS.at(-1).id;
			current = active;
		};
		update();
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		return () => {
			window.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>RDF, briefly</title>
	<meta
		name="description"
		content="A short explainer of RDF, and why shared, linked data matters for workers, employers and educators."
	/>
</svelte:head>

<div class="shell">
	<nav aria-label="Sections">
		<a class="site" href="#top">RDF, briefly</a>
		<ol>
			{#each SECTIONS as s (s.id)}
				<li>
					<a href="#{s.id}" aria-current={s.id === current ? 'location' : undefined}>{s.title}</a>
				</li>
			{/each}
		</ol>
	</nav>

	<main>
		{@render children()}

		<footer>
			<p class="caption">
				Organizations, people and <code>.example</code> addresses here are fictional.
				<a href="https://github.com/mthelm85/rdf-explainer">Source and data</a>.
			</p>
		</footer>
	</main>
</div>

<style>
	:global(html) {
		scroll-behavior: smooth;
		scroll-padding-top: 2rem;
	}

	@media (prefers-reduced-motion: reduce) {
		:global(html) {
			scroll-behavior: auto;
		}
	}

	.shell {
		display: grid;
		grid-template-columns: 1fr minmax(0, 680px) 1fr;
		column-gap: 40px;
		padding: 0 20px;
	}

	nav {
		grid-column: 1;
		justify-self: end;
		position: sticky;
		top: 0;
		align-self: start;
		width: 180px;
		padding-top: 5.4rem;
		font-size: 0.85rem;
	}

	main {
		grid-column: 2;
		padding: 5rem 0 4rem;
		min-width: 0;
	}

	.site {
		display: block;
		font-weight: 600;
		color: var(--ink);
		text-decoration: none;
		margin-bottom: 1rem;
	}

	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		border-left: 1px solid var(--rule);
	}

	li a {
		display: block;
		padding: 4px 0 4px 14px;
		margin-left: -1px;
		border-left: 1px solid transparent;
		color: var(--muted);
		text-decoration: none;
		line-height: 1.35;
	}

	li a:hover {
		color: var(--ink);
	}

	li a[aria-current='location'] {
		color: var(--ink);
		border-left-color: var(--ink);
	}

	footer {
		margin-top: 5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--rule);
	}

	/* Narrow screens: the menu becomes a compact list above the page */
	@media (max-width: 1000px) {
		.shell {
			grid-template-columns: minmax(0, 680px);
			justify-content: center;
		}

		nav,
		main {
			grid-column: 1;
		}

		nav {
			position: static;
			justify-self: stretch;
			width: auto;
			padding-top: 1.5rem;
		}

		.site {
			margin-bottom: 0.5rem;
		}

		ol {
			display: flex;
			flex-wrap: wrap;
			gap: 0.25rem 1.25rem;
			border-left: 0;
		}

		li a {
			padding: 2px 0;
			margin: 0;
			border-left: 0;
		}

		li a[aria-current='location'] {
			border-left: 0;
		}

		main {
			padding-top: 3rem;
		}
	}
</style>
