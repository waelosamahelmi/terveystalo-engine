import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');

// Load local env file so Netlify function code can use SUPABASE/keys
dotenv.config({ path: join(repoRoot, '.env') });

const bundlePath = '/tmp/meta-ads.bundle.cjs';

console.log('Bundling netlify/functions/meta-ads.ts ...');
const bundle = spawnSync(
  'npx',
  [
    'esbuild',
    'netlify/functions/meta-ads.ts',
    '--bundle',
    '--platform=node',
    '--target=node18',
    '--format=cjs',
    `--outfile=${bundlePath}`,
  ],
  { cwd: repoRoot, stdio: 'inherit' }
);

if (bundle.status !== 0) {
  console.error('Bundle failed.');
  process.exit(bundle.status || 1);
}

const require = createRequire(import.meta.url);
const mod = require(bundlePath);
const handler = mod?.handler;

if (typeof handler !== 'function') {
  console.error('Could not load handler() from bundle');
  process.exit(1);
}

console.log('Invoking meta-ads handler with action=sync ...');
const result = await handler(
  {
    httpMethod: 'GET',
    queryStringParameters: { action: 'sync' },
    headers: {},
    rawUrl: 'http://localhost/.netlify/functions/meta-ads?action=sync',
  },
  {}
);

console.log('--- Handler result ---');
console.log('statusCode:', result?.statusCode);
console.log('headers:', result?.headers);
console.log('body:', result?.body);
