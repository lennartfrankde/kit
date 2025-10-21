import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

/**
 * @template T
 * @template {keyof T} K
 * @typedef {Partial<Omit<T, K>> & Required<Pick<T, K>>} PartialExcept
 */

/**
 * We use a custom `Builder` type here to support the minimum version of SvelteKit.
 * @typedef {PartialExcept<import('@sveltejs/kit').Builder, 'log' | 'rimraf' | 'mkdirp' | 'config' | 'prerendered' | 'routes' | 'createEntries' | 'findServerAssets' | 'generateFallback' | 'generateEnvModule' | 'generateManifest' | 'getBuildDirectory' | 'getClientDirectory' | 'getServerDirectory' | 'getAppPath' | 'writeClient' | 'writePrerendered' | 'writePrerendered' | 'writeServer' | 'copy' | 'compress'>} Builder2_4_0
 */

const files = fileURLToPath(new URL('./files', import.meta.url).href);

/** @type {import('./index.js').default} */
export default function (opts = {}) {
	const {
		out = 'build',
		precompress = true,
		envPrefix = '',
		serveStatic = false,
		cors = {
			origin: ['http://localhost:3000', 'tauri://localhost'],
			credentials: true
		}
	} = opts;

	return {
		name: '@sveltejs/adapter-tauri-remote-node',
		/** @param {Builder2_4_0} builder */
		async adapt(builder) {
			const tmp = builder.getBuildDirectory('adapter-tauri-remote-node');

			builder.rimraf(out);
			builder.rimraf(tmp);
			builder.mkdirp(tmp);

			if (serveStatic) {
				builder.log.minor('Copying static assets');
				builder.writeClient(`${out}/client${builder.config.kit.paths.base}`);
				builder.writePrerendered(`${out}/prerendered${builder.config.kit.paths.base}`);

				if (precompress) {
					builder.log.minor('Compressing assets');
					await Promise.all([
						builder.compress(`${out}/client`),
						builder.compress(`${out}/prerendered`)
					]);
				}
			}

			builder.log.minor('Building server');

			builder.writeServer(tmp);

			writeFileSync(
				`${tmp}/manifest.js`,
				[
					`export const manifest = ${builder.generateManifest({ relativePath: './' })};`,
					`export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});`,
					`export const base = ${JSON.stringify(builder.config.kit.paths.base)};`
				].join('\n\n')
			);

			// Write CORS configuration
			writeFileSync(`${tmp}/cors-config.js`, `export const corsConfig = ${JSON.stringify(cors)};`);

			const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

			/** @type {Record<string, string>} */
			const input = {
				index: `${tmp}/index.js`,
				manifest: `${tmp}/manifest.js`,
				'cors-config': `${tmp}/cors-config.js`
			};

			if (builder.hasServerInstrumentationFile?.()) {
				input['instrumentation.server'] = `${tmp}/instrumentation.server.js`;
			}

			// we bundle the Vite output so that deployments only need
			// their production dependencies. Anything in devDependencies
			// will get included in the bundled code
			const bundle = await rollup({
				input,
				external: [
					// dependencies could have deep exports, so we need a regex
					...Object.keys(pkg.dependencies || {}).map((d) => new RegExp(`^${d}(\\/.*)?$`))
				],
				plugins: [
					nodeResolve({
						preferBuiltins: true,
						exportConditions: ['node']
					}),
					// @ts-ignore https://github.com/rollup/plugins/issues/1329
					commonjs({ strictRequires: true }),
					// @ts-ignore https://github.com/rollup/plugins/issues/1329
					json()
				]
			});

			await bundle.write({
				dir: `${out}/server`,
				format: 'esm',
				sourcemap: true,
				chunkFileNames: 'chunks/[name]-[hash].js'
			});

			builder.copy(files, out, {
				replace: {
					ENV: './env.js',
					HANDLER: './handler.js',
					MANIFEST: './server/manifest.js',
					SERVER: './server/index.js',
					SHIMS: './shims.js',
					CORS_CONFIG: './server/cors-config.js',
					ENV_PREFIX: JSON.stringify(envPrefix),
					SERVE_STATIC: JSON.stringify(serveStatic)
				}
			});

			if (builder.hasServerInstrumentationFile?.()) {
				builder.instrument?.({
					entrypoint: `${out}/index.js`,
					instrumentation: `${out}/server/instrumentation.server.js`,
					module: {
						exports: ['path', 'host', 'port', 'server']
					}
				});
			}

			builder.log.info('Tauri remote server configured with CORS settings:');
			builder.log.info(`  - Origins: ${JSON.stringify(cors.origin)}`);
			builder.log.info(`  - Credentials: ${cors.credentials}`);
		},

		supports: {
			read: () => serveStatic,
			instrumentation: () => true
		}
	};
}
