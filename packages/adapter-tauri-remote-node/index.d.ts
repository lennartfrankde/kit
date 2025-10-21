import { Adapter } from '@sveltejs/kit';

export interface CorsOptions {
	/**
	 * Allowed origins for CORS. Can be a string, array of strings, or RegExp.
	 * Defaults to `['http://localhost:3000', 'tauri://localhost']`.
	 */
	origin?: string | string[] | RegExp;

	/**
	 * Whether to allow credentials (cookies, authorization headers, etc.).
	 * Defaults to `true`.
	 */
	credentials?: boolean;

	/**
	 * Allowed HTTP methods.
	 */
	methods?: string[];

	/**
	 * Allowed headers.
	 */
	allowedHeaders?: string[];

	/**
	 * Exposed headers.
	 */
	exposedHeaders?: string[];

	/**
	 * Max age for preflight cache (in seconds).
	 */
	maxAge?: number;
}

export interface AdapterOptions {
	/**
	 * The directory to output the server to. Defaults to `'build'`.
	 */
	out?: string;

	/**
	 * Whether to precompress static files. Defaults to `true`.
	 */
	precompress?: boolean;

	/**
	 * Prefix for environment variables. Defaults to `''`.
	 */
	envPrefix?: string;

	/**
	 * Whether to serve static files (client assets).
	 * Enable this if you want the remote server to also serve the Tauri app.
	 * Defaults to `false`.
	 */
	serveStatic?: boolean;

	/**
	 * CORS configuration for accepting requests from Tauri apps.
	 */
	cors?: CorsOptions;
}

export default function plugin(options?: AdapterOptions): Adapter;
