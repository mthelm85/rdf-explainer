// Build-time data: runs only on the server, which for this static site
// means once, while the pages are prerendered.
import { Parser } from 'n3';
import jsonld from 'jsonld';
import trig from '../data/ecosystem.trig?raw';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

/** The regional dataset as plain JSON quads. */
export function getQuads() {
	return new Parser({ format: 'application/trig' }).parse(trig).map((q) => ({
		s: q.subject.value,
		p: q.predicate.value,
		o: q.object.value,
		literal: q.object.termType === 'Literal',
		g: q.graph.value
	}));
}

const EXAMPLES = [
	{ id: 'job', title: 'A job posting' },
	{ id: 'record', title: 'A worker’s record' },
	{ id: 'skill', title: 'A skill with its synonyms' }
];

const sources = import.meta.glob('../data/examples/*.{ttl,jsonld}', {
	query: '?raw',
	import: 'default',
	eager: true
});
const source = (name) => /** @type {string} */ (sources[`../data/examples/${name}`]).trim();

/** @param {import('n3').Quad} q */
function nquad(q) {
	/** @param {any} t */
	const term = (t) => {
		if (t.termType === 'NamedNode') return `<${t.value}>`;
		if (t.termType === 'BlankNode') return `_:${t.value}`;
		const v = JSON.stringify(t.value);
		if (t.language) return `${v}@${t.language}`;
		return t.datatype && t.datatype.value !== XSD + 'string' ? `${v}^^<${t.datatype.value}>` : v;
	};
	return `${term(q.subject)} ${term(q.predicate)} ${term(q.object)} .`;
}

/**
 * Each example in Turtle and JSON-LD. The build fails if a pair does not
 * describe exactly the same triples.
 */
export async function getExamples() {
	const out = [];
	for (const ex of EXAMPLES) {
		const turtle = source(`${ex.id}.ttl`);
		const json = source(`${ex.id}.jsonld`);

		/** @type {Record<string, string>} */
		const prefixes = {};
		const quads = new Parser({ format: 'text/turtle' }).parse(turtle, null, (p, iri) => {
			prefixes[p] = iri.value;
		});
		const fromTurtle = new Set(quads.map(nquad));
		const nq = /** @type {string} */ (await /** @type {any} */ (jsonld).toRDF(JSON.parse(json), { format: 'application/n-quads' }));
		const fromJson = new Set(nq.trim().split('\n').map((l) => l.trim()));
		const missing = [...fromTurtle].filter((x) => !fromJson.has(x));
		const extra = [...fromJson].filter((x) => !fromTurtle.has(x));
		if (missing.length || extra.length) {
			throw new Error(
				`Example "${ex.id}": Turtle and JSON-LD differ.\nOnly in Turtle:\n${missing.join('\n')}\nOnly in JSON-LD:\n${extra.join('\n')}`
			);
		}

		const ordered = Object.entries(prefixes).sort((a, b) => b[1].length - a[1].length);
		/** @param {string} iri */
		const curie = (iri) => {
			for (const [p, ns] of ordered) if (iri.startsWith(ns)) return `${p}:${iri.slice(ns.length)}`;
			return `<${iri}>`;
		};
		out.push({
			...ex,
			turtle,
			jsonld: json,
			triples: quads.map((q) => ({
				s: curie(q.subject.value),
				p: q.predicate.value === RDF_TYPE ? 'a' : curie(q.predicate.value),
				o: q.object.termType === 'Literal' ? q.object.value : curie(q.object.value),
				literal: q.object.termType === 'Literal',
				lang: /** @type {any} */ (q.object).language || null
			}))
		});
	}
	return out;
}
