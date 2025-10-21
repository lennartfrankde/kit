// Build-time placeholders that will be replaced during the adapter build process
declare module 'HANDLER' {
	export const handler: import('polka').Middleware;
}

declare module 'ENV' {
	export function env(name: string, fallback?: any): string;
}

declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}

declare module 'MANIFEST' {
	export const manifest: any;
	export const prerendered: Set<string>;
	export const base: string;
}

declare module 'SHIMS' {}

declare module 'CORS_CONFIG' {
	export const corsConfig: {
		origin?: string | string[] | RegExp;
		credentials?: boolean;
		methods?: string[];
		allowedHeaders?: string[];
		exposedHeaders?: string[];
		maxAge?: number;
	};
}

declare const ENV_PREFIX: string;
declare const SERVE_STATIC: boolean;
