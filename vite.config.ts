import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'http';
import { resolve, join } from 'path';
import { existsSync, readFileSync } from 'fs';

// Load .env into process.env for Netlify function dev execution
try {
  const envContent = readFileSync(resolve(__dirname, '.env'), 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  });
} catch {}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Dev middleware to run Netlify functions locally
    {
      name: 'netlify-functions-dev',
      configureServer(server) {
        server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const prefix = '/.netlify/functions/';
          if (!req.url?.startsWith(prefix)) return next();

          const fnName = req.url.slice(prefix.length).split('?')[0].split('/')[0];
          if (fnName === 'proxy-json') return next(); // handled by dedicated plugin below

          // Resolve function path (directory-based or single-file)
          const functionsDir = resolve(__dirname, 'netlify/functions');
          let fnPath = '';
          const dirIndex = join(functionsDir, fnName, 'index.ts');
          const singleFile = join(functionsDir, `${fnName}.ts`);
          const singleCjs = join(functionsDir, `${fnName}.cjs`);
          if (existsSync(dirIndex)) fnPath = dirIndex;
          else if (existsSync(singleFile)) fnPath = singleFile;
          else if (existsSync(singleCjs)) fnPath = singleCjs;
          else return next();

          // Read request body
          let body = '';
          await new Promise<void>((resolve) => {
            req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
            req.on('end', resolve);
          });

          console.log(`[netlify-fn-dev] ${req.method} ${fnName} — loading ${fnPath}`);

          try {
            // Use tsx to import the function module
            const mod = await (server as any).ssrLoadModule(fnPath);
            const handler = mod.handler || mod.default;
            if (typeof handler !== 'function') {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: `No handler exported from ${fnName}` }));
              return;
            }

            // Build a Netlify-like event object
            const event = {
              httpMethod: req.method || 'GET',
              headers: req.headers,
              body,
              isBase64Encoded: false,
              queryStringParameters: Object.fromEntries(new URL(req.url!, `http://${req.headers.host}`).searchParams),
            };

            const result = await handler(event, {});
            const statusCode = result?.statusCode || 200;
            const headers = { 'Content-Type': 'application/json', ...(result?.headers || {}) };
            res.writeHead(statusCode, headers);
            res.end(typeof result?.body === 'string' ? result.body : JSON.stringify(result?.body || ''));
          } catch (err: any) {
            console.error(`[netlify-fn-dev] ${fnName} error:`, err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      }
    },
    // Custom plugin to handle proxy-json requests in development
    {
      name: 'proxy-json-handler',
      configureServer(server) {
        server.middlewares.use('/.netlify/functions/proxy-json', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
          const targetUrl = urlObj.searchParams.get('url');
          
          if (!targetUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'URL parameter required' }));
            return;
          }

          try {
            const response = await fetch(targetUrl, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'Norr3-Marketing-Engine/1.0',
              },
            });
            
            if (!response.ok) {
              res.writeHead(response.status, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: `Failed to fetch: ${response.statusText}` }));
              return;
            }
            
            const data = await response.text();
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(data);
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      }
    }
  ],
  build: {
    rollupOptions: {
      output: {
        format: 'es',
        entryFileNames: '[name]-[hash].mjs',
        chunkFileNames: '[name]-[hash].mjs',
        assetFileNames: '[name]-[hash].[ext]'
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api/apartments': {
        target: 'https://vilpas.kiinteistomaailma.fi',
        changeOrigin: true,
        rewrite: (path) => '/export/km/listings/baseline.json',
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('X-Client-Info', 'norr3-marketing-dashboard');
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('Origin', 'https://vilpas.kiinteistomaailma.fi');
          });
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
            // Send a proper error response
            res.writeHead(500, {
              'Content-Type': 'application/json',
            });
            res.end(JSON.stringify({ error: 'Proxy error occurred' }));
          });
          // Handle CORS preflight
          proxy.on('proxyRes', (proxyRes, req, res) => {
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-methods'] = 'GET, OPTIONS';
            proxyRes.headers['access-control-allow-headers'] = 'X-Client-Info, Accept';
          });
        }
      },
      // Add BidTheatre API proxy
      '/bt-api': {
        target: 'https://asx-api.bidtheatre.com/v2.0/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bt-api/, ''),
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Forward all headers from the original request
            Object.keys(req.headers).forEach(key => {
              proxyReq.setHeader(key, req.headers[key]);
            });

            // Ensure content-type is set for POST/PUT requests
            if (req.method === 'POST' || req.method === 'PUT') {
              proxyReq.setHeader('Content-Type', 'application/json');
            }
          });

          proxy.on('error', (err, req, res) => {
            console.error('BidTheatre proxy error:', err);
            res.writeHead(500, {
              'Content-Type': 'application/json',
            });
            res.end(JSON.stringify({ error: 'BidTheatre proxy error occurred' }));
          });

          // Handle CORS preflight
          proxy.on('proxyRes', (proxyRes, req, res) => {
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['access-control-allow-headers'] = '*';
            proxyRes.headers['access-control-allow-credentials'] = 'true';
            proxyRes.headers['access-control-expose-headers'] = '*';
          });
        }
      }
    }
  }
});