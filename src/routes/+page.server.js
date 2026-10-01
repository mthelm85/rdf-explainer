import { getExamples, getQuads } from '#lib/server/data.js';

// Runs once at build time, when the page is prerendered.
export async function load() {
	return { quads: getQuads(), examples: await getExamples() };
}
