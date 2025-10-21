# @sveltejs/adapter-tauri-remote-node

Node.js adapter for SvelteKit that serves as a remote backend for Tauri desktop applications.

## Overview

This adapter creates a Node.js server specifically designed to work as a remote backend for Tauri apps built with `@sveltejs/adapter-tauri-static`. It includes built-in CORS support, session handling, and optional static file serving.

## Features

- Node.js server optimized for Tauri remote connections
- Built-in CORS configuration for Tauri origins
- Cookie and session support with credential forwarding
- Optional static file serving (can serve the Tauri app itself)
- Compatible with all SvelteKit server features (+page.server.ts, +server.ts, etc.)
- Environment variable configuration
- Graceful shutdown support

## Installation

```bash
npm install -D @sveltejs/adapter-tauri-remote-node
```

## Usage

Add the adapter to your `svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-tauri-remote-node';

export default {
  kit: {
    adapter: adapter({
      // Options (with defaults shown)
      out: 'build',
      precompress: true,
      envPrefix: '',
      serveStatic: false,
      cors: {
        origin: ['http://localhost:3000', 'tauri://localhost'],
        credentials: true
      }
    })
  }
};
```

## Configuration

### `out`

The directory to output the built server to. Defaults to `'build'`.

### `precompress`

Whether to precompress static files (if `serveStatic` is enabled) with gzip and brotli. Defaults to `true`.

### `envPrefix`

Prefix for environment variables. For example, if set to `'MY_APP_'`, you would use `MY_APP_HOST` instead of `HOST`.

### `serveStatic`

Whether to serve static files (client assets and prerendered pages). Enable this if you want the remote server to also serve the Tauri app as a web application. Defaults to `false`.

When `false`, the server only handles API routes and server-side logic.

### `cors`

CORS configuration object:

#### `cors.origin`

Allowed origins for CORS requests. Can be:

- A string: `'http://localhost:3000'`
- An array of strings: `['http://localhost:3000', 'tauri://localhost']`
- A RegExp: `/^https:\/\/.*\.example\.com$/`

Defaults to `['http://localhost:3000', 'tauri://localhost']`.

#### `cors.credentials`

Whether to allow credentials (cookies, authorization headers). Defaults to `true`.

#### `cors.methods`

Array of allowed HTTP methods. If not specified, defaults to `['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']`.

#### `cors.allowedHeaders`

Array of allowed headers. If not specified, the server will allow headers requested by the client.

#### `cors.exposedHeaders`

Array of headers to expose to the client.

#### `cors.maxAge`

Max age for preflight cache in seconds.

## Running the Server

After building your app with `npm run build`, run the server:

```bash
node build/index.js
```

### Environment Variables

The server supports the following environment variables:

- `HOST` - Host to bind to (default: `'0.0.0.0'`)
- `PORT` - Port to listen on (default: `3000`)
- `ORIGIN` - Public origin for the server (e.g., `'https://api.example.com'`)
- `BODY_SIZE_LIMIT` - Maximum request body size (default: `'512K'`)
- `SHUTDOWN_TIMEOUT` - Graceful shutdown timeout in seconds (default: `30`)
- `XFF_DEPTH` - Depth for X-Forwarded-For header parsing (default: `1`)
- `ADDRESS_HEADER` - Header to use for client address (e.g., `'x-forwarded-for'`)
- `PROTOCOL_HEADER` - Header to use for protocol (e.g., `'x-forwarded-proto'`)
- `HOST_HEADER` - Header to use for host (e.g., `'x-forwarded-host'`)
- `PORT_HEADER` - Header to use for port

Example:

```bash
PORT=4000 HOST=localhost node build/index.js
```

## Production Deployment

### Basic Node.js Server

```bash
# Build the app
npm run build

# Run in production
NODE_ENV=production PORT=3000 node build/index.js
```

### With PM2

```bash
pm2 start build/index.js --name "tauri-backend"
```

### Docker Example

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY build ./build

EXPOSE 3000

CMD ["node", "build/index.js"]
```

## CORS Configuration Examples

### Development (Local Tauri App)

```js
cors: {
	origin: ['http://localhost:3000', 'tauri://localhost'],
	credentials: true
}
```

### Production (Deployed Tauri Apps)

```js
cors: {
	origin: [
		'tauri://localhost',
		'https://api.myapp.com'
	],
	credentials: true,
	maxAge: 86400 // 24 hours
}
```

### Multiple Environments

```js
cors: {
	origin: process.env.NODE_ENV === 'production'
		? ['tauri://localhost', 'https://api.myapp.com']
		: ['http://localhost:3000', 'tauri://localhost'],
	credentials: true
}
```

### Wildcard Subdomains

```js
cors: {
	origin: /^https:\/\/.*\.myapp\.com$/,
	credentials: true
}
```

## Serving Static Files

If you want one server to handle both API requests and serve your Tauri app as a web application:

```js
adapter: adapter({
  serveStatic: true,
  cors: {
    origin: '*', // Or specific origins
    credentials: true
  }
});
```

Then your server will:

1. Serve static files from `/client` for web browsers
2. Handle API requests from both Tauri and web clients
3. Support prerendered pages

## Architecture

The typical Tauri setup with these adapters:

```
Tauri App (Desktop)
├── Uses: @sveltejs/adapter-tauri-static
├── Built as static files
└── Forwards API requests to remote server

Remote Server (Node.js)
├── Uses: @sveltejs/adapter-tauri-remote-node
├── Handles API routes (+server.ts)
├── Handles server-side rendering (+page.server.ts)
└── Optional: Serves static files for web clients
```

## Authentication & Sessions

The adapter fully supports authentication:

```js
// src/routes/api/login/+server.ts
export async function POST({ request, cookies }) {
  // ... authenticate user

  cookies.set('session', sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'none', // Required for cross-origin
    secure: true, // Required for production
    maxAge: 60 * 60 * 24 // 1 day
  });

  return json({ success: true });
}
```

The CORS middleware will automatically handle cookies between the Tauri app and server.

## Security Best Practices

1. **Use HTTPS in production**

   ```js
   origin: ['https://api.myapp.com'];
   ```

2. **Whitelist specific origins**

   ```js
   origin: ['tauri://localhost']; // Not '*'
   ```

3. **Enable credentials only when needed**

   ```js
   credentials: true; // Only if using cookies/auth
   ```

4. **Validate requests on the server**

   ```js
   // Always validate input in your API routes
   export async function POST({ request }) {
     const data = await request.json();
     // Validate data before processing
   }
   ```

5. **Use environment variables for secrets**
   ```js
   // Never hardcode secrets
   const apiKey = process.env.API_KEY;
   ```

## Troubleshooting

### CORS errors

If you see CORS errors:

1. Check that the Tauri app's origin is in the `cors.origin` array
2. Ensure `credentials: true` is set if using cookies
3. Verify the remote server is running and accessible

### Cookies not working

For cookies to work across origins:

1. Server must set `credentials: true` in CORS config
2. Cookies must have `SameSite=none` and `Secure=true` (requires HTTPS)
3. Client must send `credentials: 'include'` in fetch (handled automatically by adapter-tauri-static)

### Cannot connect to remote server

Check:

1. Server is running: `node build/index.js`
2. Port is correct in Tauri app's `remoteServer` config
3. Firewall allows the connection
4. Server is bound to correct host (`0.0.0.0` for external access)

## Differences from adapter-node

- Built-in CORS middleware for Tauri apps
- Default port is 3000 (vs adapter-node which doesn't set a default)
- Optional static file serving (off by default)
- Optimized for remote API serving
- Additional logging for CORS configuration

## See Also

- [@sveltejs/adapter-tauri-static](../adapter-tauri-static) - Static adapter for Tauri apps
- [@sveltejs/adapter-node](../adapter-node) - Standard Node.js adapter
- [SvelteKit Adapters Documentation](https://svelte.dev/docs/kit/adapters)
- [Tauri Documentation](https://tauri.app/)

## License

MIT
