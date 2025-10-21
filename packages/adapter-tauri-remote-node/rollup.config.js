import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default [
	{
		input: {
			index: 'src/index.js',
			env: 'src/env.js',
			handler: 'src/handler.js',
			shims: 'src/shims.js'
		},
		output: {
			dir: 'files',
			format: 'esm',
			sourcemap: true,
			hoistTransitiveImports: false
		},
		plugins: [nodeResolve(), commonjs(), json()],
		external: [
			'ENV',
			'HANDLER',
			'MANIFEST',
			'SERVER',
			'SHIMS',
			'CORS_CONFIG',
			'../utils.js',
			...Object.keys(
				JSON.parse(
					(await import('node:fs')).readFileSync(
						new URL('./package.json', import.meta.url),
						'utf-8'
					)
				).devDependencies || {}
			)
		]
	}
];
