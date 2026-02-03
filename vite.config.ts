import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'http';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
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