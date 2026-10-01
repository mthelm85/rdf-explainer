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
					const posting = PHRASING[sourceOf(job)]?.[local(iri)];
					return {
						iri,
						name: index.label(iri),
						posting,
						evidence: has.get(iri),
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
	const totals = $derived({
		required: d3.sum(jobs, (j) => j.skills.length),
		keyword: d3.sum(jobs, (j) => j.keyword),
		linked: d3.sum(jobs, (j) => j.linked)
	});

	/** @param {{ name: string, posting?: string, evidence?: string, linked: boolean, keyword: boolean }} d */
	function why(d) {
		const posting = `Posting says “${d.posting ?? d.name}”.`;
		if (!d.linked) return `${posting} ${firstName} has no evidence of this skill.`;
		const evidence = ` ${firstName}’s record says “${d.evidence ?? d.name}”.`;
		return d.keyword ? posting + evidence + ' The words match.' : posting + evidence + ' Different words, same skill IRI.';
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
	Shared names change that. Here is the same region with the same people, jobs and skills. Each
	job lists the skills it requires; a filled skill is one the worker can show. Compare matching by
	each organization’s own wording with matching by shared skill IRIs.
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
	<Toggle
		options={[
			{ value: 'wording', label: 'Match by wording' },
			{ value: 'iri', label: 'Match by shared IRI' }
		]}
		bind:value={by}
		label="Matching method"
	/>
</div>

<figure class="jobs">
	{#each jobs as job (job.title)}
		{@const n = by === 'iri' ? job.linked : job.keyword}
		<div class="job">
			<div class="job-head">
				<span class="job-title">{job.title}</span>
				<span class="job-meta">{job.employer}</span>
				<span class="job-count">{n} of {job.skills.length}</span>
			</div>
			<ul class="skills" aria-label="Skills required for {job.title}">
				{#each job.skills as d (d.iri)}
					{@const on = by === 'iri' ? d.linked : d.keyword}
					<li
						class:on
						class:found={by === 'iri' && d.linked && !d.keyword}
						title={why(d)}
					>
						{d.name}<span class="sr-only">{on ? ': matched' : ': not matched'}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
	<figcaption class="caption">
		{#if by === 'wording'}
			Matching on wording finds <strong>{totals.keyword}</strong> of {totals.required} required skills
			for {firstName}. Switch to shared IRIs to see what it misses.
		{:else}
			Matching on shared IRIs finds <strong>{totals.linked}</strong> of {totals.required}, including
			<strong>{totals.linked - totals.keyword}</strong> that wording missed (outlined in blue). Hover a skill to
			see both phrasings.
		{/if}
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

	.jobs {
		margin-top: 0.5rem;
	}

	.job {
		padding: 0.9rem 0;
		border-top: 1px solid var(--rule);
	}

	.job-head {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
	}

	.job-title {
		font-weight: 600;
	}

	.job-meta {
		color: var(--muted);
		font-size: 0.8rem;
	}

	.job-count {
		margin-left: auto;
		font-variant-numeric: tabular-nums;
		color: var(--muted);
		font-size: 0.8rem;
	}

	.skills {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.skills li {
		font-size: 0.78rem;
		line-height: 1;
		padding: 6px 9px;
		border-radius: 999px;
		border: 1px solid var(--rule);
		color: var(--muted);
		background: var(--bg);
		cursor: default;
		transition:
			background-color 300ms ease,
			color 300ms ease,
			border-color 300ms ease,
			box-shadow 300ms ease;
	}

	.skills li.on {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}

	.skills li.found {
		box-shadow:
			0 0 0 2px var(--bg),
			0 0 0 3.5px var(--accent);
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
		.skills li {
			transition: none;
		}
	}
</style>
