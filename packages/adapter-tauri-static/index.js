import path from 'node:path';
import { writeFileSync } from 'node:fs';

/** @type {import('./index.js').default} */
export default function (options = {}) {
	return {
		name: '@sveltejs/adapter-tauri-static',
		/** @param {import('./internal.js').Builder2_0_0} builder */
		async adapt(builder) {
			const {
				pages = 'build',
				assets = pages,
				fallback = 'index.html',
				precompress = false,
				remoteServer = 'http://localhost:3000',
				forwardPaths = ['/api', '/_app']
			} = options;

			builder.rimraf(assets);
			builder.rimraf(pages);

			builder.log.minor('Building static Tauri app');

			builder.generateEnvModule();
			builder.writeClient(assets);
			builder.writePrerendered(pages);

			if (fallback) {
				builder.log.minor(`Generating fallback: ${fallback}`);
				await builder.generateFallback(path.join(pages, fallback));
			}

			// Generate a service worker or initialization script for request forwarding
			const forwardingScript = `
// Tauri request forwarding configuration
const REMOTE_SERVER = '${remoteServer}';
const FORWARD_PATHS = ${JSON.stringify(forwardPaths)};

// Override fetch to forward requests to remote server
const originalFetch = window.fetch;
window.fetch = async function(resource, init) {
	let url;
	if (typeof resource === 'string') {
		url = new URL(resource, window.location.origin);
	} else if (resource instanceof Request) {
		url = new URL(resource.url, window.location.origin);
	} else {
		url = new URL(resource.toString(), window.location.origin);
	}
	
	// Check if path should be forwarded
	const shouldForward = FORWARD_PATHS.some(path => url.pathname.startsWith(path));
	
	if (shouldForward) {
		// Rewrite URL to point to remote server
		const remoteUrl = new URL(url.pathname + url.search + url.hash, REMOTE_SERVER);
		
		// Forward cookies and headers
		const headers = new Headers(init?.headers || {});
		
		// Copy cookies
		if (document.cookie) {
			headers.set('Cookie', document.cookie);
		}
		
		return originalFetch(remoteUrl.toString(), {
			...init,
			headers,
			credentials: 'include'
		}).then(async response => {
			// Handle Set-Cookie headers
			const setCookie = response.headers.get('Set-Cookie');
			if (setCookie) {
				document.cookie = setCookie;
			}
			return response;
		});
	}
	
	// For non-forwarded requests, use original fetch
	return originalFetch(resource, init);
};
`;

			// Write the forwarding script to the build directory
			writeFileSync(path.join(assets, 'tauri-fetch-forward.js'), forwardingScript);

			builder.log.info(
				'Generated tauri-fetch-forward.js - include this script in your app.html to enable request forwarding'
			);

			if (precompress) {
				builder.log.minor('Compressing assets and pages');
				if (pages === assets) {
					await builder.compress(assets);
				} else {
					await Promise.all([builder.compress(assets), builder.compress(pages)]);
				}
			}

			if (pages === assets) {
				builder.log(`Wrote site to "${pages}"`);
			} else {
				builder.log(`Wrote pages to "${pages}" and assets to "${assets}"`);
			}

			builder.log.info(
				`Configured to forward requests matching [${forwardPaths.join(', ')}] to ${remoteServer}`
			);
		}
	};
}
