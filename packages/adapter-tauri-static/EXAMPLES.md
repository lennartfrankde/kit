# Tauri Adapters - Complete Example

This document provides a complete example of using both `@sveltejs/adapter-tauri-static` and `@sveltejs/adapter-tauri-remote-node` together.

## Architecture Overview

```
┌─────────────────────────────────────┐
│     Tauri Desktop Application       │
│  (adapter-tauri-static output)      │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Static HTML/CSS/JS            │ │
│  │  + tauri-fetch-forward.js      │ │
│  └────────────────────────────────┘ │
│              │                       │
│              │ Forwards /api, /_app  │
│              │ requests               │
└──────────────┼───────────────────────┘
               │
               │ HTTP/HTTPS
               ▼
┌─────────────────────────────────────┐
│    Remote Node.js Server            │
│  (adapter-tauri-remote-node)        │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Server-side routes            │ │
│  │  +page.server.ts               │ │
│  │  +server.ts endpoints          │ │
│  │  Authentication                │ │
│  │  Database access               │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Project Structure

```
my-tauri-sveltekit-app/
├── src/
│   ├── routes/
│   │   ├── +page.svelte              # Client-side (static in Tauri)
│   │   ├── +page.server.ts           # Server-side (remote)
│   │   ├── api/
│   │   │   ├── users/+server.ts      # API endpoint (remote)
│   │   │   └── auth/+server.ts       # Auth endpoint (remote)
│   │   └── dashboard/
│   │       ├── +page.svelte          # Client-side (static)
│   │       └── +page.server.ts       # Server-side (remote)
│   ├── app.html
│   └── hooks.server.ts               # Server hooks (remote)
├── src-tauri/                        # Tauri configuration
│   ├── tauri.conf.json
│   └── src/
│       └── main.rs
├── svelte.config.js                  # Client adapter config
└── package.json
```

## Step 1: Install Dependencies

```bash
npm install -D @sveltejs/adapter-tauri-static @sveltejs/adapter-tauri-remote-node
```

## Step 2: Configure the Static Adapter (Client)

**svelte.config.js:**

```js
import adapter from '@sveltejs/adapter-tauri-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false,
			// Development: point to local server
			remoteServer: process.env.REMOTE_SERVER || 'http://localhost:3000',
			// Production: point to your deployed server
			// remoteServer: 'https://api.myapp.com',
			forwardPaths: ['/api', '/_app', '/auth']
		})
	}
};

export default config;
```

## Step 3: Update app.html

**src/app.html:**

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<link rel="icon" href="%sveltekit.assets%/favicon.png" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		%sveltekit.head%
		<!-- Load the forwarding script BEFORE SvelteKit -->
		<script src="%sveltekit.assets%/tauri-fetch-forward.js"></script>
	</head>
	<body data-sveltekit-preload-data="hover">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

## Step 4: Configure the Remote Server

**Create a separate configuration for the server (optional, or reuse svelte.config.js):**

```js
// svelte.config.server.js
import adapter from '@sveltejs/adapter-tauri-remote-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			out: 'build-server',
			precompress: true,
			envPrefix: '',
			serveStatic: false, // Don't serve static files, only API
			cors: {
				origin:
					process.env.NODE_ENV === 'production'
						? ['tauri://localhost', 'https://myapp.com']
						: ['http://localhost:3000', 'tauri://localhost'],
				credentials: true,
				methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
				allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
			}
		})
	}
};

export default config;
```

## Step 5: Build Both Parts

**Add build scripts to package.json:**

```json
{
	"scripts": {
		"dev": "vite dev",
		"build:client": "vite build",
		"build:server": "SVELTE_CONFIG=svelte.config.server.js vite build",
		"build": "npm run build:client && npm run build:server",
		"preview": "vite preview",
		"server:dev": "node build-server/index.js",
		"check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
		"check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
		"tauri": "tauri"
	}
}
```

## Step 6: Configure Tauri

**src-tauri/tauri.conf.json:**

```json
{
	"build": {
		"beforeDevCommand": "npm run dev",
		"beforeBuildCommand": "npm run build:client",
		"devPath": "http://localhost:5173",
		"distDir": "../build"
	},
	"package": {
		"productName": "my-app",
		"version": "0.1.0"
	}
	// ... rest of Tauri config
}
```

## Step 7: Example Routes

**src/routes/+page.svelte** (Static in Tauri):

```svelte
<script>
	export let data;
</script>

<h1>Welcome to {data.appName}</h1>
<p>User: {data.username}</p>

<a href="/dashboard">Go to Dashboard</a>
```

**src/routes/+page.server.ts** (Runs on remote server):

```ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const username = cookies.get('username') || 'Guest';

	return {
		appName: 'My Tauri App',
		username
	};
};
```

**src/routes/api/users/+server.ts** (API endpoint on remote server):

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	// This runs on the remote server
	const users = await fetchUsersFromDatabase();

	return json({ users });
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	const data = await request.json();

	// Authentication check
	const session = cookies.get('session');
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Create user in database
	const user = await createUser(data);

	return json({ user }, { status: 201 });
};
```

## Step 8: Development Workflow

### Start the Remote Server

```bash
# Build the server
npm run build:server

# Start the server
npm run server:dev
```

The server will be available at http://localhost:3000

### Develop the Tauri App

```bash
# In a separate terminal, start Tauri dev mode
npm run tauri dev
```

This will:

1. Build the static app with adapter-tauri-static
2. Generate the fetch forwarding script
3. Launch the Tauri app
4. Forward all `/api`, `/_app`, and `/auth` requests to localhost:3000

## Step 9: Production Deployment

### Deploy the Remote Server

```bash
# Build the server
npm run build:server

# Deploy to your hosting provider (e.g., VPS, Cloud Run, etc.)
# Example with PM2:
pm2 start build-server/index.js --name "myapp-server"
```

### Build the Tauri App for Production

Update `svelte.config.js` to point to your production server:

```js
remoteServer: 'https://api.myapp.com';
```

Then build:

```bash
npm run build:client
npm run tauri build
```

## Authentication Example

**src/routes/auth/login/+server.ts:**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { username, password } = await request.json();

	// Verify credentials (implement your logic)
	const user = await verifyCredentials(username, password);

	if (user) {
		// Set cookie (will be forwarded by tauri-fetch-forward.js)
		cookies.set('session', user.sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'none', // Required for cross-origin
			secure: true, // Required in production
			maxAge: 60 * 60 * 24 // 1 day
		});

		return json({ success: true, user });
	}

	return json({ error: 'Invalid credentials' }, { status: 401 });
};
```

**Client-side login:**

```svelte
<script>
	async function login() {
		const response = await fetch('/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});

		if (response.ok) {
			// Cookie is automatically handled
			goto('/dashboard');
		}
	}
</script>

<form on:submit|preventDefault={login}>
	<input bind:value={username} placeholder="Username" />
	<input bind:value={password} type="password" placeholder="Password" />
	<button type="submit">Login</button>
</form>
```

## Environment Variables

**Development (.env):**

```env
REMOTE_SERVER=http://localhost:3000
DATABASE_URL=postgresql://localhost/myapp_dev
```

**Production (.env.production):**

```env
REMOTE_SERVER=https://api.myapp.com
DATABASE_URL=postgresql://production/myapp
```

## Tips

1. **Keep sensitive operations on the server**: Don't expose API keys or database credentials in the Tauri app
2. **Use the remote server for data processing**: Keep the Tauri app lightweight
3. **Handle offline mode**: Implement fallbacks for when the remote server is unreachable
4. **Cache responses**: Use SvelteKit's built-in caching strategies
5. **Secure your API**: Always validate and sanitize inputs on the remote server

## Troubleshooting

### Requests not being forwarded

- Check that paths are in `forwardPaths` array
- Verify the forwarding script is loaded before SvelteKit
- Check browser console for errors

### CORS errors

- Ensure `cors.origin` includes your Tauri app origin
- Set `credentials: true` if using cookies
- Check that the remote server is running

### Authentication not working

- Verify cookies have `SameSite=none` and `Secure=true`
- Check that `credentials: true` is set in both adapters
- Ensure the forwarding script is passing cookies correctly

## Support

For issues or questions:

- [SvelteKit Documentation](https://svelte.dev/docs/kit)
- [Tauri Documentation](https://tauri.app/)
- [GitHub Issues](https://github.com/sveltejs/kit/issues)
