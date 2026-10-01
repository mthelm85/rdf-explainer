import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// A fully prerendered static site, deployed to GitHub Pages.
			adapter: adapter(),
			// GitHub Pages serves the site from /rdf-explainer; CI sets BASE_PATH.
			paths: { base: process.env.BASE_PATH ?? '' }
		})
	]
});
