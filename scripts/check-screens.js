// Check media_screens data
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file manually
const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim();
});

// Use service role key to bypass RLS
const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkScreens() {
  console.log('Checking media_screens table...\n');
  
  // Total count
  const { count: total } = await supabase
    .from('media_screens')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total screens: ${total}`);
  
  // Screens with coordinates
  const { data: withCoords, error } = await supabase
    .from('media_screens')
    .select('id, site_url, latitude, longitude, city')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(10);
  
  console.log(`\nScreens with coordinates (first 10):`);
  if (withCoords && withCoords.length > 0) {
    withCoords.forEach(s => {
      console.log(`  ID: ${s.id}, City: ${s.city || 'N/A'}, Lat: ${s.latitude}, Lng: ${s.longitude}`);
    });
  } else {
    console.log('  No screens with coordinates found!');
  }
  
  // Count with coordinates
  const { count: withCoordsCount } = await supabase
    .from('media_screens')
    .select('*', { count: 'exact', head: true })
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);
  
  console.log(`\nScreens WITH coordinates: ${withCoordsCount}`);
  console.log(`Screens WITHOUT coordinates: ${total - withCoordsCount}`);
  
  // Sample of screens without coordinates
  const { data: noCoords } = await supabase
    .from('media_screens')
    .select('id, site_url, city')
    .is('latitude', null)
    .limit(5);
  
  console.log('\nSample screens WITHOUT coordinates:');
  if (noCoords && noCoords.length > 0) {
    noCoords.forEach(s => {
      console.log(`  ID: ${s.id}, City: ${s.city || 'N/A'}`);
      console.log(`    URL: ${s.site_url?.substring(0, 100)}...`);
    });
  }
}

checkScreens();
