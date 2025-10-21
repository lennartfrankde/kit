import { Adapter } from '@sveltejs/kit';

export interface AdapterOptions {
	/**
	 * The directory to write pages to. Defaults to `'build'`.
	 */
	pages?: string;

	/**
	 * The directory to write client-side assets to. Defaults to `pages`.
	 */
	assets?: string;

	/**
	 * The name of the fallback file. Defaults to `'index.html'`.
	 */
	fallback?: string;

	/**
	 * Whether to precompress assets and pages using gzip and brotli. Defaults to `false`.
	 */
	precompress?: boolean;

	/**
	 * The URL of the remote server to forward requests to. Defaults to `'http://localhost:3000'`.
	 */
	remoteServer?: string;

	/**
	 * Array of path prefixes to forward to the remote server. Defaults to `['/api', '/_app']`.
	 */
	forwardPaths?: string[];
}

export default function plugin(options?: AdapterOptions): Adapter;
