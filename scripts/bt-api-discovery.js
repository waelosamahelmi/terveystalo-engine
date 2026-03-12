/**
 * BidTheatre API Discovery Script
 * 
 * Fetches all needed configuration data from the BT API:
 * - Advertisers (to find Suun Terveystalo ID)
 * - Campaign categories (to find "Health & Fitness - Dental care")
 * - Audiences/segments (age targeting IDs)
 * - Filter targets
 * - Optimization strategies
 * - RTB Sitelists (media lists for publishers)
 * - Ad dimensions (to find 2160x3840)
 * 
 * Usage: node scripts/bt-api-discovery.js
 */

import { readFileSync } from 'fs';

// Read .env file
const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim();
});

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);
const BT_API_URL = 'https://asx-api.bidtheatre.com/v2.0/api';

async function btGet(networkId, token, endpoint) {
  const url = `${BT_API_URL}/${networkId}/${endpoint}`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    console.error(`  ✗ GET ${endpoint} → ${response.status} ${response.statusText}`);
    return null;
  }
  return response.json();
}

async function run() {
  console.log('=== BidTheatre API Discovery ===\n');

  // 1. Get credentials
  console.log('1. Fetching BidTheatre credentials from Supabase...');
  const { data: creds, error: credError } = await supabase
    .from('bidtheatre_credentials')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (credError || !creds) {
    console.error('  ✗ Failed to get credentials:', credError?.message);
    return;
  }
  console.log(`  ✓ Network ID: ${creds.network_id}`);
  const networkId = creds.network_id;

  // 2. Authenticate
  console.log('\n2. Authenticating...');
  const authResponse = await fetch(`${BT_API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ username: creds.username, password: creds.password }),
  });
  const authData = await authResponse.json();
  const token = authData?.auth?.token;
  if (!token) {
    console.error('  ✗ Authentication failed');
    return;
  }
  console.log('  ✓ Authenticated');

  // ============================================================
  // 3. ADVERTISERS — find "Suun Terveystalo"
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('3. ADVERTISERS');
  console.log('='.repeat(60));
  const advData = await btGet(networkId, token, 'advertiser');
  if (advData) {
    const advertisers = advData.advertisers || advData;
    if (Array.isArray(advertisers)) {
      console.log(`  Found ${advertisers.length} advertisers:`);
      advertisers.forEach(a => {
        const marker = (a.name || '').toLowerCase().includes('suun') || (a.name || '').toLowerCase().includes('terveystalo') ? ' ★★★' : '';
        console.log(`    ID: ${a.id} | Name: ${a.name}${marker}`);
      });
    } else {
      console.log('  Response:', JSON.stringify(advData).substring(0, 500));
    }
  }

  // ============================================================
  // 4. CAMPAIGN CATEGORIES — find "Health & Fitness - Dental care"
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('4. CAMPAIGN CATEGORIES');
  console.log('='.repeat(60));
  const catData = await btGet(networkId, token, 'campaign-category');
  if (catData) {
    const categories = catData.campaignCategories || catData.categories || catData;
    if (Array.isArray(categories)) {
      console.log(`  Found ${categories.length} categories:`);
      categories.forEach(c => {
        const marker = (c.name || '').toLowerCase().includes('health') || (c.name || '').toLowerCase().includes('dental') ? ' ★★★' : '';
        console.log(`    ID: ${c.id} | Name: ${c.name}${marker}`);
      });
    } else {
      console.log('  Response keys:', Object.keys(catData));
      console.log('  Full response:', JSON.stringify(catData).substring(0, 1000));
    }
  }

  // ============================================================
  // 5. AUDIENCES / SEGMENTS
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('5. AUDIENCES / SEGMENTS');
  console.log('='.repeat(60));
  
  // Try multiple endpoint variants
  for (const endpoint of ['audience', 'audience-target', 'segment', 'filter-target']) {
    console.log(`\n  Trying /${endpoint}...`);
    const data = await btGet(networkId, token, endpoint);
    if (data) {
      const items = data.audiences || data.audienceTargets || data.segments || data.filterTargets || data;
      if (Array.isArray(items)) {
        console.log(`  ✓ Found ${items.length} items via /${endpoint}:`);
        items.forEach(item => {
          const marker = 
            (item.name || '').toLowerCase().includes('18-64') || 
            (item.name || '').toLowerCase().includes('18-34') ||
            (item.name || '').toLowerCase().includes('25-64') ||
            (item.name || '').toLowerCase().includes('40+') ||
            (item.name || '').toLowerCase().includes('suun') ||
            (item.name || '').toLowerCase().includes('display') ||
            (item.name || '').toLowerCase().includes('dooh') ? ' ★★★' : '';
          console.log(`    ID: ${item.id} | Name: ${item.name}${marker}`);
        });
      } else if (typeof items === 'object') {
        console.log(`  Response keys:`, Object.keys(data));
        console.log(`  First 500 chars:`, JSON.stringify(data).substring(0, 500));
      }
    }
  }

  // ============================================================
  // 6. OPTIMIZATION STRATEGIES
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('6. OPTIMIZATION STRATEGIES');
  console.log('='.repeat(60));
  for (const endpoint of ['optimization-strategy', 'optimisation-strategy']) {
    console.log(`\n  Trying /${endpoint}...`);
    const data = await btGet(networkId, token, endpoint);
    if (data) {
      const items = data.optimizationStrategies || data.optimisationStrategies || data;
      if (Array.isArray(items)) {
        console.log(`  ✓ Found ${items.length} strategies via /${endpoint}:`);
        items.forEach(item => {
          const marker = (item.name || '').toLowerCase().includes('viewability') ? ' ★★★' : '';
          console.log(`    ID: ${item.id} | Name: ${item.name}${marker}`);
        });
      } else {
        console.log(`  Response keys:`, Object.keys(data));
        console.log(`  First 500 chars:`, JSON.stringify(data).substring(0, 500));
      }
    }
  }

  // ============================================================
  // 7. RTB SITELISTS (MEDIA LISTS) — find publisher lists
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('7. RTB SITELISTS (MEDIA LISTS)');
  console.log('='.repeat(60));
  const sitelistData = await btGet(networkId, token, 'rtb-sitelist');
  if (sitelistData) {
    const sitelists = sitelistData.rtbSitelists || sitelistData;
    if (Array.isArray(sitelists)) {
      console.log(`  Found ${sitelists.length} sitelists:`);
      sitelists.forEach(s => {
        const marker = 
          (s.name || '').toLowerCase().includes('display') ||
          (s.name || '').toLowerCase().includes('mobile') ||
          (s.name || '').toLowerCase().includes('desktop') ||
          (s.name || '').toLowerCase().includes('bauer') ||
          (s.name || '').toLowerCase().includes('jcdecaux') ||
          (s.name || '').toLowerCase().includes('mediateko') ||
          (s.name || '').toLowerCase().includes('meks') ||
          (s.name || '').toLowerCase().includes('outshine') ||
          (s.name || '').toLowerCase().includes('ocean') ? ' ★★★' : '';
        console.log(`    ID: ${s.id} | Name: ${s.name}${marker}`);
      });
    } else {
      console.log('  Response:', JSON.stringify(sitelistData).substring(0, 500));
    }
  }

  // ============================================================
  // 8. AD DIMENSIONS — find 2160x3840
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('8. AD DIMENSIONS');
  console.log('='.repeat(60));
  const dimData = await btGet(networkId, token, 'ad-dimension');
  if (dimData) {
    const dimensions = dimData.adDimensions || dimData.dimensions || dimData;
    if (Array.isArray(dimensions)) {
      console.log(`  Found ${dimensions.length} dimensions:`);
      // Show all that match our sizes
      const targetSizes = ['300x300', '300x431', '300x600', '620x891', '980x400', '1080x1920', '2160x3840'];
      const matched = [];
      dimensions.forEach(d => {
        const sizeStr = `${d.width}x${d.height}`;
        const isTarget = targetSizes.includes(sizeStr);
        if (isTarget) {
          matched.push(d);
          console.log(`  ★ ID: ${d.id} | ${sizeStr} | Name: ${d.name || 'N/A'}`);
        }
      });
      // Show unmatched with possible large DOOH formats
      dimensions.forEach(d => {
        if ((d.width >= 1080 && d.height >= 1920) || (d.width >= 1920 && d.height >= 1080)) {
          const sizeStr = `${d.width}x${d.height}`;
          if (!matched.find(m => m.id === d.id)) {
            console.log(`  ? ID: ${d.id} | ${sizeStr} | Name: ${d.name || 'N/A'} (large format)`);
          }
        }
      });
      console.log(`\n  Total: ${dimensions.length} dimensions, ${matched.length} matching target sizes`);
    } else {
      console.log('  Response keys:', Object.keys(dimData));
      console.log('  First 500 chars:', JSON.stringify(dimData).substring(0, 500));
    }
  }

  // ============================================================
  // 9. CAMPAIGN KPI VALUES
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('9. CAMPAIGN KPI');
  console.log('='.repeat(60));
  const kpiData = await btGet(networkId, token, 'campaign-kpi');
  if (kpiData) {
    const kpis = kpiData.campaignKPIs || kpiData.kpis || kpiData;
    if (Array.isArray(kpis)) {
      console.log(`  Found ${kpis.length} KPI options:`);
      kpis.forEach(k => {
        console.log(`    ID: ${k.id} | Name: ${k.name}`);
      });
    } else {
      console.log('  Response:', JSON.stringify(kpiData).substring(0, 500));
    }
  }

  // ============================================================
  // 10. GEO TARGETS (existing)
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('10. EXISTING GEO TARGETS');
  console.log('='.repeat(60));
  const geoData = await btGet(networkId, token, 'geo-target');
  if (geoData) {
    const geos = geoData.geoTargets || geoData;
    if (Array.isArray(geos)) {
      console.log(`  Found ${geos.length} geo targets:`);
      geos.slice(0, 30).forEach(g => {
        console.log(`    ID: ${g.id} | Name: ${g.name}`);
      });
      if (geos.length > 30) console.log(`  ... and ${geos.length - 30} more`);
    } else {
      console.log('  Response:', JSON.stringify(geoData).substring(0, 500));
    }
  }

  // ============================================================
  // 11. CAMPAIGN MANAGERS
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('11. CAMPAIGN MANAGERS / USERS');
  console.log('='.repeat(60));
  const userData = await btGet(networkId, token, 'user');
  if (userData) {
    const users = userData.users || userData;
    if (Array.isArray(users)) {
      console.log(`  Found ${users.length} users:`);
      users.forEach(u => {
        const marker = (u.name || '').toLowerCase().includes('janne') || (u.name || '').toLowerCase().includes('savela') ? ' ★★★' : '';
        console.log(`    ID: ${u.id} | Name: ${u.name || u.username || 'N/A'} | Email: ${u.email || 'N/A'}${marker}`);
      });
    } else {
      console.log('  Response:', JSON.stringify(userData).substring(0, 500));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('DISCOVERY COMPLETE');
  console.log('='.repeat(60));
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
