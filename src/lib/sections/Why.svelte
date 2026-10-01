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
	let by = $state('wording');
	let selected = $state(0);
	const S = 'https://schema.org/';
	const out = $derived(d3.group(quads, (q) => q.s));
	/** @param {string} s @param {string} p */
	const objs = (s, p) => (out.get(s) ?? []).filter((q) => q.p === S + p).map((q) => q.o);
	/** @param {string} iri */
	const local = (iri) => iri.slice(SK.length);
	/** @param {string | undefined} s */
	const norm = (s) => (s ?? '').toLowerCase().trim();
	const firstName = $derived(index.label(worker).split(' ')[0]);

	const jobs = $derived.by(() => {
		/** @type {Map<string, string | undefined>} skill IRI → how the worker's evidence words it */
		const has = new Map();
		for (const cred of objs(worker, 'hasCredential'))
			for (const s of objs(cred, 'competencyRequired')) has.set(s, PHRASING[sourceOf(cred)]?.[local(s)]);
		for (const s of objs(worker, 'knowsAbout')) has.set(s, PHRASING[sourceOf(worker)]?.[local(s)]);
		const words = new Set([...has.values()].map(norm));
		return [...out.keys()]
			.filter((s) => index.types(s).includes(S + 'JobPosting'))
			.map((job) => {
				const skills = objs(job, 'skills').map((iri) => {
					const posting = PHRASING[sourceOf(job)]?.[local(iri)] ?? index.label(iri);
					const evidence = has.get(iri);
					return {
						iri,
						curie: `sk:${local(iri)}`,
						posting,
						evidence,
						linked: has.has(iri),
						keyword: words.has(norm(posting))
					};
				});
				return {
					title: index.label(job),
					employer: index.label(objs(job, 'hiringOrganization')[0]),
					skills,
					keyword: skills.filter((d) => d.keyword).length,
					linked: skills.filter((d) => d.linked).length
				};
			})
			.sort((a, b) => b.linked / b.skills.length - a.linked / a.skills.length);
	});
	const job = $derived(jobs[Math.min(selected, jobs.length - 1)]);
	const totals = $derived({
		required: d3.sum(jobs, (j) => j.skills.length),
		keyword: d3.sum(jobs, (j) => j.keyword),
		linked: d3.sum(jobs, (j) => j.linked)
	});
	/** @param {{ linked: boolean, keyword: boolean }} d */
	const matched = (d) => (by === 'iri' ? d.linked : d.keyword);
</script>

<h2 id="why">Why it matters</h2>

<p>
	Much of the friction in the labor market is about information. Employers can’t easily tell what a
	credential certifies. Workers struggle to prove skills learned on the job or in an apprenticeship.
	Colleges hear about changing demand slowly. And connecting their systems is expensive.
</p>

<h3 id="integration">The integration explosion</h3>

<p>
	Suppose every organization in a region exchanges data with every other one, and each describes its
	data in its own way. Then every pair needs its own <em>crosswalk</em>: a custom mapping between
	their two formats. That is the assumption behind the left-hand picture below, and it is why the
	cost grows with the <em>square</em> of the number of participants.
</p>

<p>
	With shared vocabularies and identifiers, each organization maps its data once, to the commons,
	and can then exchange data with everyone else who did the same. The number of mappings grows in
	step with the number of participants.
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
		Assuming every pair of organizations exchanges data and writes its own crosswalk, point-to-point
		mappings grow as n(n − 1)/2. Mapping once to shared vocabularies grows as n. Real ecosystems
		are rarely fully connected, so the true count sits somewhere between, but it still grows faster
		than the number of participants.
	</figcaption>
</figure>

<h3 id="matching">Fewer missed matches</h3>

<p>
	Most matching today compares words. A job posting asks for “Ladder logic”; a college credential
	certifies “PLC Programming”. To a person they are the same skill. To software comparing text, they
	are not.
</p>

<p>
	With RDF, each organization still uses its own words, but also links each skill to an IRI in a
	shared skills framework. Software can then compare the IRIs instead of the words. Pick a worker
	and a job, and compare the two methods.
</p>

<div class="controls">
	<Toggle
		options={[
			{ value: 'https://wallet.example/maria', label: 'Maria' },
			{ value: 'https://wallet.example/jordan', label: 'Jordan' },
			{ value: 'https://wallet.example/sam', label: 'Sam' }
		]}
		bind:value={worker}
		label="Worker"
	/>
</div>

<table class="summary">
	<thead>
		<tr>
			<th scope="col">Job</th>
			<th scope="col" class="num">Matched by wording</th>
			<th scope="col" class="num">Matched by IRI</th>
		</tr>
	</thead>
	<tbody>
		{#each jobs as j, i (j.title)}
			<tr class:current={i === selected}>
				<td>
					<button type="button" onclick={() => (selected = i)} aria-pressed={i === selected}>
						{j.title}
					</button>
					<span class="muted">{j.employer}</span>
				</td>
				<td class="num">{j.keyword} of {j.skills.length}</td>
				<td class="num strong">{j.linked} of {j.skills.length}</td>
			</tr>
		{/each}
	</tbody>
	<tfoot>
		<tr>
			<td>All jobs</td>
			<td class="num">{totals.keyword} of {totals.required}</td>
			<td class="num strong">{totals.linked} of {totals.required}</td>
		</tr>
	</tfoot>
</table>

<Toggle
	options={[
		{ value: 'wording', label: 'Compare wording' },
		{ value: 'iri', label: 'Compare IRIs' }
	]}
	bind:value={by}
	label="Matching method"
/>

<figure class="compare" data-by={by}>
	<div class="row head">
		<div>{job.title} asks for</div>
		<div></div>
		<div>{firstName}’s record shows</div>
	</div>
	{#each job.skills as d (d.iri)}
		<div class="row" class:match={matched(d)}>
			<div class="term">
				<span class="words">“{d.posting}”</span>
				<code class="iri">{d.curie}</code>
			</div>
			<div class="link" aria-hidden="true"><span></span></div>
			<div class="term">
				{#if d.linked}
					<span class="words">“{d.evidence ?? d.posting}”</span>
					<code class="iri">{d.curie}</code>
				{:else}
					<span class="none">no evidence</span>
				{/if}
			</div>
			<span class="sr-only">{matched(d) ? 'Match' : 'No match'}</span>
		</div>
	{/each}
	<figcaption class="caption">
		{#if by === 'wording'}
			Comparing wording finds <strong>{job.keyword} of {job.skills.length}</strong> skills for this
			job. Only identical text counts, so “Ladder logic” and “PLC Programming” don’t match.
		{:else}
			Comparing IRIs finds <strong>{job.linked} of {job.skills.length}</strong>. Different words that
			point to the same IRI now match, with no guessing.
			{#if job.linked < job.skills.length}
				The rest are skills {firstName} genuinely can’t show yet.
			{/if}
		{/if}
		IRIs are shortened: <code>sk:</code> stands for <code>https://skills.riverbend.example/skill/</code>.
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

	.controls {
		display: flex;
		flex-wrap: wrap;
		column-gap: 2.5rem;
	}

	/* Summary table */
	.summary {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
		margin: 0.5rem 0 1rem;
	}

	.summary th {
		text-align: left;
		font-weight: 500;
		color: var(--muted);
		border-bottom: 1px solid var(--rule);
		padding: 0 0 6px;
	}

	.summary td {
		padding: 6px 0;
		border-bottom: 1px solid var(--rule);
	}

	.summary tfoot td {
		border-bottom: 0;
		color: var(--muted);
	}

	.summary .num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		padding-left: 1rem;
	}

	.summary .strong {
		color: var(--accent);
		font-weight: 600;
	}

	.summary .muted {
		color: var(--muted);
		font-size: 0.78rem;
		margin-left: 0.4rem;
	}

	.summary button {
		appearance: none;
		background: none;
		border: 0;
		padding: 0;
		font: inherit;
		color: var(--ink);
		cursor: pointer;
		text-decoration: underline;
		text-decoration-color: var(--rule);
		text-underline-offset: 3px;
		text-align: left;
	}

	@media (max-width: 560px) {
		.summary .muted {
			display: block;
			margin-left: 0;
		}
	}

	.summary tr.current button {
		font-weight: 600;
		text-decoration-color: var(--ink);
	}

	/* Side-by-side comparison */
	.compare {
		margin-top: 0.5rem;
	}

	.row {
		display: grid;
		grid-template-columns: 1fr minmax(48px, 0.5fr) 1fr;
		align-items: center;
		padding: 8px 0;
		border-top: 1px solid var(--rule);
		position: relative;
	}

	.row.head {
		border-top: 0;
		font-size: 0.8rem;
		color: var(--muted);
		padding-bottom: 6px;
	}

	.row > .term:last-of-type,
	.row.head > div:last-child {
		text-align: left;
		padding-left: 4px;
	}

	.row > .term:first-child,
	.row.head > div:first-child {
		text-align: right;
		padding-right: 4px;
	}

	.term {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.row > .term:first-child {
		align-items: flex-end;
	}

	.words,
	.iri {
		transition:
			color 250ms ease,
			opacity 250ms ease;
	}

	.words {
		font-size: 0.92rem;
	}

	.iri {
		font-size: 0.76rem;
		overflow-wrap: anywhere;
	}

	.none {
		font-size: 0.85rem;
		color: var(--muted);
		font-style: italic;
	}

	/* Emphasize whatever is being compared */
	[data-by='wording'] .words {
		color: var(--ink);
	}
	[data-by='wording'] .iri {
		color: var(--muted);
		opacity: 0.6;
	}
	[data-by='iri'] .words {
		color: var(--muted);
	}
	[data-by='iri'] .iri {
		color: var(--accent);
		opacity: 1;
		font-weight: 600;
	}

	/* The connector between the two sides */
	.link {
		height: 2px;
		margin: 0 8px;
		position: relative;
	}

	.link span {
		position: absolute;
		inset: 0;
		background: var(--accent);
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 400ms cubic-bezier(0.2, 0, 0, 1);
		border-radius: 2px;
	}

	.row.match .link span {
		transform: scaleX(1);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.link span,
		.words,
		.iri {
			transition: none;
		}
	}

	@media (max-width: 560px) {
		.row {
			grid-template-columns: 1fr 28px 1fr;
		}

		.words {
			font-size: 0.82rem;
		}

		.iri {
			font-size: 0.7rem;
		}
	}
</style>
