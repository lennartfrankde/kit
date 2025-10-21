# @sveltejs/adapter-tauri-static

Adapter for building static SvelteKit apps for Tauri with remote server support.

## Overview

This adapter exports a static application optimized for Tauri desktop applications. It provides automatic request forwarding for server-side routes (like `/api` endpoints and `+page.server.ts` files) to a configurable remote Node.js server.

## Features

- Static site generation for Tauri desktop apps
- Automatic request forwarding to remote server
- Cookie and authentication header passthrough
- Configurable path patterns for forwarding
- Optional precompression support

## Installation

```bash
npm install -D @sveltejs/adapter-tauri-static
```

## Usage

Add the adapter to your `svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-tauri-static';

export default {
  kit: {
    adapter: adapter({
      // Options (with defaults shown)
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      remoteServer: 'http://localhost:3000',
      forwardPaths: ['/api', '/_app']
    })
  }
};
```

## Configuration

### `pages`

The directory to write page files to. Defaults to `'build'`.

### `assets`

The directory to write static assets to. If not specified, defaults to the value of `pages`.

### `fallback`

The name of the fallback HTML file. Defaults to `'index.html'`. This file will be used for client-side routing.

### `precompress`

Whether to precompress files with gzip and brotli. Defaults to `false`.

### `remoteServer`

The URL of your remote Node.js server (typically running `adapter-tauri-remote-node`). Defaults to `'http://localhost:3000'`.

### `forwardPaths`

Array of path prefixes that should be forwarded to the remote server. Defaults to `['/api', '/_app']`.

Common patterns:

- `'/api'` - API endpoints
- `'/_app'` - SvelteKit internal routes
- `/auth` - Authentication routes

## Setup Instructions

1. **Configure your SvelteKit app** with this adapter in `svelte.config.js`

2. **Include the forwarding script** in your `src/app.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
    <!-- Include the Tauri fetch forwarding script -->
    <script src="%sveltekit.assets%/tauri-fetch-forward.js"></script>
  </head>
  <body>
    <div>%sveltekit.body%</div>
  </body>
</html>
```

3. **Build your app**:

```bash
npm run build
```

4. **Configure Tauri** to use the built files. In your `tauri.conf.json`:

```json
{
  "build": {
    "distDir": "../build"
  }
}
```

## Remote Server Setup

This adapter works in conjunction with `@sveltejs/adapter-tauri-remote-node`. Set up your remote server:

```js
// svelte.config.server.js
import adapter from '@sveltejs/adapter-tauri-remote-node';

export default {
  kit: {
    adapter: adapter({
      out: 'build-server',
      cors: {
        origin: ['http://localhost:3000', 'tauri://localhost'],
        credentials: true
      }
    })
  }
};
```

## Authentication

The adapter automatically forwards cookies and authentication headers between your Tauri app and the remote server. This means:

- Session cookies work transparently
- Bearer tokens in headers are preserved
- Standard authentication flows (OAuth, JWT, etc.) work as expected

## Development vs Production

**Development:**

```js
remoteServer: 'http://localhost:3000';
```

**Production:**

```js
remoteServer: 'https://your-production-server.com';
```

## Security Considerations

1. **HTTPS in Production**: Always use HTTPS for your remote server in production
2. **CORS Configuration**: Properly configure CORS on your remote server to only accept requests from your Tauri app
3. **API Keys**: Store sensitive API keys on the remote server, not in the Tauri app
4. **Validation**: Validate all requests on the remote server

## Example Project Structure

```
my-tauri-app/
├── src/
│   ├── routes/
│   │   ├── api/
│   │   │   └── +server.ts      # Forwarded to remote server
│   │   ├── +page.svelte        # Static in Tauri
│   │   └── +page.server.ts     # Forwarded to remote server
│   └── app.html
├── src-tauri/                   # Tauri configuration
├── svelte.config.js             # Client config (this adapter)
└── svelte.config.server.js      # Server config (remote adapter)
```

## Limitations

- This adapter is designed specifically for Tauri and not for web browsers
- All routes must be prerenderable or handled by the remote server
- Real-time features (WebSockets) require additional configuration

## Troubleshooting

### Requests not being forwarded

Check that:

1. The path is included in `forwardPaths`
2. The forwarding script is loaded before your app code
3. The remote server is running and accessible

### CORS errors

Ensure your remote server (`adapter-tauri-remote-node`) has CORS properly configured to accept requests from your Tauri app origin.

### Cookies not persisting

Verify that:

1. Your remote server sends cookies with the `SameSite=None; Secure` attributes (for HTTPS)
2. The forwarding script is loaded correctly
3. The remote server's CORS configuration includes `credentials: true`

## See Also

- [@sveltejs/adapter-tauri-remote-node](../adapter-tauri-remote-node) - Remote server adapter
- [SvelteKit Adapters Documentation](https://svelte.dev/docs/kit/adapters)
- [Tauri Documentation](https://tauri.app/)

## License

MIT
