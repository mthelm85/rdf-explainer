<script>
	import * as d3 from 'd3';
	import * as Plot from '@observablehq/plot';
	import Figure from '#lib/components/Figure.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { indexQuads, networkMini, SK } from '#lib/figures.js';
	import { PHRASING, sourceOf } from '#lib/data/phrasing.js';

	/** @type {{ quads: any[] }} */
	let { quads } = $props();
	const index = $derived(indexQuads(quads));

	// ── The integration explosion ────────────────────────────────────────────
	let orgs = $state(12);
	const pairwise = $derived((orgs * (orgs - 1)) / 2);
	const curve = d3.range(2, 41).flatMap((n) => [
		{ n, mappings: (n * (n - 1)) / 2, approach: 'Point-to-point' },
		{ n, mappings: n, approach: 'Shared vocabulary' }
	]);

	/** @param {number} width */
	function growthChart(width) {
		return Plot.plot({
			width,
			height: 240,
			marginLeft: 40,
			marginRight: 118,
			x: { label: 'Organizations', domain: [2, 40] },
			y: { label: 'Mappings to build', grid: true },
			color: { domain: ['Point-to-point', 'Shared vocabulary'], range: ['var(--accent-2)', 'var(--accent)'] },
			marks: [
				Plot.ruleY([0], { stroke: 'var(--faint)' }),
				Plot.ruleX([orgs], { stroke: 'var(--faint)', strokeDasharray: '3 3' }),
				Plot.line(curve, { x: 'n', y: 'mappings', stroke: 'approach', strokeWidth: 1.5 }),
				Plot.dot(curve.filter((d) => d.n === orgs), { x: 'n', y: 'mappings', fill: 'approach', r: 4 }),
				Plot.text(curve.filter((d) => d.n === 40), { x: 'n', y: 'mappings', text: 'approach', dx: 8, textAnchor: 'start', fill: 'var(--ink)' }),
				Plot.tip(curve, Plot.pointerX({ x: 'n', y: 'mappings', title: (d) => `${d.approach}\n${d.n} organizations → ${d.mappings.toLocaleString()} mappings` }))
			]
		});
	}

	// ── Keyword vs. linked matching ──────────────────────────────────────────
	let worker = $state('https://wallet.example/maria');
	const S = 'https://schema.org/';
	const out = $derived(d3.group(quads, (q) => q.s));
	/** @param {string} s @param {string} p */
	const objs = (s, p) => (out.get(s) ?? []).filter((q) => q.p === S + p).map((q) => q.o);
	/** @param {string} iri */
	const local = (iri) => iri.slice(SK.length);
	/** @param {string | undefined} s */
	const norm = (s) => (s ?? '').toLowerCase().trim();

	const matches = $derived.by(() => {
		/** @type {Map<string, string | undefined>} skill IRI → how the worker's evidence words it */
		const skills = new Map();
		for (const cred of objs(worker, 'hasCredential'))
			for (const s of objs(cred, 'competencyRequired')) skills.set(s, PHRASING[sourceOf(cred)]?.[local(s)]);
		for (const s of objs(worker, 'knowsAbout')) skills.set(s, PHRASING[sourceOf(worker)]?.[local(s)]);
		const words = new Set([...skills.values()].map(norm));
		return [...out.keys()]
			.filter((s) => index.types(s).includes(S + 'JobPosting'))
			.map((job) => {
				const req = objs(job, 'skills');
				const keyword = req.filter((s) => words.has(norm(PHRASING[sourceOf(job)]?.[local(s)]))).length;
				const linked = req.filter((s) => skills.has(s)).length;
				return { title: index.label(job), required: req.length, keyword, linked };
			})
			.sort((a, b) => b.linked / b.required - a.linked / a.required);
	});
	const totals = $derived({ keyword: d3.sum(matches, (d) => d.keyword), linked: d3.sum(matches, (d) => d.linked) });

	/** @param {number} width */
	function matchChart(width) {
		const m = matches;
		return Plot.plot({
			width,
			height: 40 + m.length * 36,
			marginLeft: Math.min(200, width * 0.42),
			marginRight: 40,
			x: { domain: [0, 1], ticks: [0, 0.5, 1], tickFormat: '%', label: 'Required skills the worker can show', labelAnchor: 'left' },
			y: { domain: m.map((d) => d.title), label: null, tickSize: 0 },
			marks: [
				Plot.ruleY(m, { y: 'title', x1: 0, x2: 1, stroke: 'var(--rule)' }),
				Plot.link(m, { y1: 'title', y2: 'title', x1: (d) => d.keyword / d.required, x2: (d) => d.linked / d.required, stroke: 'var(--accent)', strokeOpacity: 0.35, strokeWidth: 2 }),
				Plot.dot(m, { y: 'title', x: (d) => d.keyword / d.required, r: 4.5, stroke: 'var(--faint)', fill: 'var(--bg)', strokeWidth: 1.5 }),
				Plot.dot(m, { y: 'title', x: (d) => d.linked / d.required, r: 4.5, fill: 'var(--accent)' }),
				Plot.text(m, { y: 'title', x: 1, text: (d) => `${d.linked}/${d.required}`, dx: 22, fill: 'var(--muted)' }),
				Plot.tip(m, Plot.pointerY({ y: 'title', x: (d) => d.linked / d.required, title: (d) => `${d.title}\nby wording: ${d.keyword} of ${d.required}\nby shared IRI: ${d.linked} of ${d.required}` }))
			]
		});
	}
</script>

<h2 id="why">Why it matters</h2>

<p>
	Much of the friction in the labor market is about information. Employers can’t easily tell what a
	credential certifies. Workers struggle to prove skills learned on the job or in an apprenticeship.
	Colleges hear about changing demand slowly. And connecting their systems is expensive.
</p>

<h3 id="integration">The integration explosion</h3>

<p>
	Without shared names, every pair of organizations that wants to exchange data needs its own custom
	mapping. That cost grows with the <em>square</em> of the number of participants. With shared
	vocabularies and identifiers, each organization maps its data once, to the commons, and can then
	exchange data with everyone else.
</p>

<label class="slider">
	<span>Organizations</span>
	<input type="range" min="2" max="40" step="1" bind:value={orgs} />
	<output>{orgs}</output>
</label>

<figure>
	<div class="pair">
		<div>
			<Figure draw={(w) => networkMini(orgs, 'p2p', Math.min(220, w))} />
			<p class="stat"><b style="color: var(--accent-2)">{pairwise.toLocaleString()}</b> custom mappings, point-to-point</p>
		</div>
		<div>
			<Figure draw={(w) => networkMini(orgs, 'hub', Math.min(220, w))} />
			<p class="stat"><b style="color: var(--accent)">{orgs}</b> mappings to a shared vocabulary</p>
		</div>
	</div>
	<Figure draw={growthChart} />
	<figcaption class="caption">
		Point-to-point mappings grow as n(n − 1)/2; mapping once to shared vocabularies grows as n. Real
		ecosystems are never fully connected, but the shape holds: every new participant adds value and,
		without a commons, adds cost.
	</figcaption>
</figure>

<h3 id="matching">Fewer missed matches</h3>

<p>
	Shared names change that. Here is the same region with the same people, jobs and skills, matched
	two ways: by comparing each organization’s own wording, and by comparing shared skill IRIs.
</p>

<Toggle
	options={[
		{ value: 'https://wallet.example/maria', label: 'Maria' },
		{ value: 'https://wallet.example/jordan', label: 'Jordan' },
		{ value: 'https://wallet.example/sam', label: 'Sam' }
	]}
	bind:value={worker}
	label="Worker"
/>

<figure>
	<Figure draw={matchChart} />
	<figcaption class="caption">
		<span class="key hollow"></span> by wording &nbsp; <span class="key"></span> by shared IRI. Across
		all {matches.length} jobs, wording finds {totals.keyword} skill matches; shared IRIs find
		{totals.linked}.
	</figcaption>
</figure>

<p>
	Nothing about the people changed, only how the data names things. The same idea lets a college
	check its courses against live demand, lets an apprenticeship count as evidence alongside a degree,
	and lets each organization map its data once, to a shared vocabulary, instead of once per partner.
</p>

<h2 id="start">Where to start</h2>

<p>
	Standards for this already exist: <a href="https://schema.org/JobPosting">schema.org</a> for job
	postings, <a href="https://credreg.net/ctdl/handbook">CTDL</a> for credentials,
	<a href="https://www.imsglobal.org/spec/ob/v3p0/">Open Badges 3.0</a> for verifiable achievements,
	and <a href="https://www.w3.org/TR/skos-reference/">SKOS</a> for skill frameworks. All of them can
	be published as ordinary JSON with one extra line, an <code>@context</code>, which is often the
	first step.
</p>

<style>
	.slider {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 1.5rem 0 0.5rem;
		font-size: 0.85rem;
		color: var(--muted);
	}

	.slider input {
		flex: 1;
		max-width: 280px;
		accent-color: var(--accent);
	}

	.slider output {
		min-width: 2ch;
		font-variant-numeric: tabular-nums;
		color: var(--ink);
		font-weight: 600;
	}

	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
		margin-bottom: 1.5rem;
	}

	.stat {
		font-size: 0.85rem;
		color: var(--muted);
		margin: 0.25rem 0 0;
	}

	.stat b {
		display: block;
		font-size: 1.6rem;
		font-weight: 600;
		line-height: 1.2;
	}

	.key {
		display: inline-block;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--accent);
	}

	.key.hollow {
		background: transparent;
		box-shadow: inset 0 0 0 1.5px var(--faint);
	}
</style>
