// Check BidTheatre API response structure
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file
const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);
const BT_API_URL = 'https://asx-api.bidtheatre.com/v2.0/api';

async function checkAPI() {
  console.log('=== BidTheatre API Structure Check ===\n');

  // Step 1: Get credentials
  console.log('1. Fetching BidTheatre credentials...');
  const { data: creds, error: credError } = await supabase
    .from('bidtheatre_credentials')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (credError || !creds) {
    console.error('Failed to get credentials:', credError);
    return;
  }
  console.log(`   Network ID: ${creds.network_id}`);

  // Step 2: Authenticate
  console.log('\n2. Authenticating with BidTheatre...');
  const authResponse = await fetch(`${BT_API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ username: creds.username, password: creds.password }),
  });

  const authData = await authResponse.json();
  const token = authData?.auth?.token;
  
  if (!token) {
    console.error('Failed to get token');
    return;
  }
  console.log('   ✓ Authenticated successfully');

  // Step 3: Fetch sample screens
  console.log('\n3. Fetching sample DOOH screens...');
  const url = `${BT_API_URL}/${creds.network_id}/rtb-site?siteType=dooh&limit=5&offset=0`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();
  
  // Check structure
  console.log('\n4. API Response Structure:');
  console.log('   Keys in response:', Object.keys(data));
  
  let sites = [];
  if (data.rtbSites && Array.isArray(data.rtbSites)) {
    sites = data.rtbSites;
    console.log('   Sites found in: data.rtbSites');
  } else if (Array.isArray(data)) {
    sites = data;
    console.log('   Sites found in: data (array)');
  }

  if (sites.length > 0) {
    console.log(`\n5. Sample Site Structure (first site):`);
    console.log('   Available fields:', Object.keys(sites[0]).join(', '));
    
    console.log('\n6. First 3 sites full data:');
    sites.slice(0, 3).forEach((site, i) => {
      console.log(`\n   --- Site ${i + 1} ---`);
      console.log(JSON.stringify(site, null, 4).split('\n').map(l => '   ' + l).join('\n'));
    });

    // Check for coordinate-related fields
    console.log('\n7. Coordinate-related fields check:');
    const coordFields = ['lat', 'latitude', 'lng', 'longitude', 'lon', 'geo', 'location', 'coordinates', 'geoLocation', 'position'];
    coordFields.forEach(field => {
      const hasField = sites.some(s => s[field] !== undefined);
      console.log(`   ${field}: ${hasField ? '✓ EXISTS' : '✗ not found'}`);
    });

    // Check siteURL content
    console.log('\n8. Sample siteURL values:');
    sites.slice(0, 5).forEach((site, i) => {
      console.log(`   ${i + 1}. ${site.siteURL || site.site_url || 'N/A'}`);
    });
  }
}

checkAPI().catch(console.error);
