<script>
	import '../app.css';
	import favicon from '#lib/assets/favicon.ico';
	import { SECTIONS } from '#lib/sections.js';

	let { children } = $props();

	// Highlight the section currently being read: the last heading that has
	// scrolled past a line near the top of the window. After a menu click,
	// the clicked section stays highlighted until the reader scrolls again.
	let current = $state(SECTIONS[0].id);
	let pinned = false;
	$effect(() => {
		const headings = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
		const update = () => {
			if (pinned) return;
			const line = Math.min(140, window.innerHeight * 0.25);
			let active = SECTIONS[0].id;
			for (const h of headings) if (/** @type {HTMLElement} */ (h).getBoundingClientRect().top <= line) active = /** @type {HTMLElement} */ (h).id;
			current = active;
		};
		const release = () => (pinned = false);
		update();
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		for (const ev of ['wheel', 'touchstart', 'keydown']) window.addEventListener(ev, release, { passive: true });
		return () => {
			window.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
			for (const ev of ['wheel', 'touchstart', 'keydown']) window.removeEventListener(ev, release);
		};
	});

	/** @param {string} id */
	function go(id) {
		current = id;
		pinned = true;
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>A Primer on the Resource Description Framework</title>
	<meta
		name="description"
		content="A primer on the Resource Description Framework (RDF), and how shared, linked data can help reduce labor market friction."
	/>
</svelte:head>

<div class="shell">
	<nav aria-label="Sections">
		<a class="site" href="#top">An RDF primer</a>
		<ol>
			{#each SECTIONS as s (s.id)}
				<li>
					<a href="#{s.id}" aria-current={s.id === current ? 'location' : undefined} onclick={() => go(s.id)}>{s.title}</a>
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
