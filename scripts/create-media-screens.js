import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qhvzpxkfboqkrnxxrzuj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFodnpweGtmYm9xa3JueHhyenVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA2MjA3MSwiZXhwIjoyMDg1NjM4MDcxfQ.ANAJzIdMm_W0QN2USJuxO2Tyejw2MhwoSdvK6NHFTxo'
);

async function createTable() {
  // First check if table exists
  const { data: existing, error: checkError } = await supabase
    .from('media_screens')
    .select('id')
    .limit(1);

  if (checkError && checkError.code === 'PGRST205') {
    console.log('Table does not exist. Please run this SQL in Supabase Dashboard SQL Editor:');
    console.log(`
-- Go to Supabase Dashboard > SQL Editor and run:

CREATE TABLE IF NOT EXISTS media_screens (
    id SERIAL PRIMARY KEY,
    site_url TEXT,
    rtb_supplier_name TEXT,
    site_type TEXT,
    daily_request INTEGER DEFAULT 0,
    floor_cpm DECIMAL(10, 4),
    avg_cpm DECIMAL(10, 4),
    dimensions TEXT,
    location TEXT,
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    city TEXT,
    network_id TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_screens_coords ON media_screens(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_media_screens_status ON media_screens(status);

ALTER TABLE media_screens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON media_screens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for service role" ON media_screens FOR ALL TO service_role USING (true);
    `);
    return;
  }

  if (existing !== null) {
    console.log('Table exists! Checking data...');
    const { count } = await supabase.from('media_screens').select('*', { count: 'exact', head: true });
    console.log('Current row count:', count);
    
    if (count === 0) {
      console.log('Table is empty. Inserting sample data...');
      await insertSampleData();
    }
  }
}

async function insertSampleData() {
  const screens = [
    // Helsinki area
    { site_url: 'Helsinki Kamppi Shopping Center', rtb_supplier_name: 'JCDecaux', site_type: 'Indoor Mall', daily_request: 50000, floor_cpm: 5.00, latitude: 60.1685, longitude: 24.9319, city: 'Helsinki', status: 'active' },
    { site_url: 'Helsinki Forum', rtb_supplier_name: 'Clear Channel', site_type: 'Indoor Mall', daily_request: 45000, floor_cpm: 4.50, latitude: 60.1693, longitude: 24.9375, city: 'Helsinki', status: 'active' },
    { site_url: 'Helsinki Central Railway Station', rtb_supplier_name: 'JCDecaux', site_type: 'Transport', daily_request: 80000, floor_cpm: 6.00, latitude: 60.1712, longitude: 24.9414, city: 'Helsinki', status: 'active' },
    { site_url: 'Itäkeskus Mall', rtb_supplier_name: 'Clear Channel', site_type: 'Indoor Mall', daily_request: 35000, floor_cpm: 4.00, latitude: 60.2098, longitude: 25.0810, city: 'Helsinki', status: 'active' },
    { site_url: 'Mall of Tripla', rtb_supplier_name: 'Clear Channel', site_type: 'Indoor Mall', daily_request: 55000, floor_cpm: 5.00, latitude: 60.1983, longitude: 24.9292, city: 'Helsinki', status: 'active' },
    // Espoo
    { site_url: 'Iso Omena', rtb_supplier_name: 'Clear Channel', site_type: 'Indoor Mall', daily_request: 38000, floor_cpm: 4.30, latitude: 60.1615, longitude: 24.7388, city: 'Espoo', status: 'active' },
    { site_url: 'Sello Shopping Center', rtb_supplier_name: 'JCDecaux', site_type: 'Indoor Mall', daily_request: 42000, floor_cpm: 4.80, latitude: 60.2181, longitude: 24.8102, city: 'Espoo', status: 'active' },
    // Vantaa
    { site_url: 'Jumbo Shopping Center', rtb_supplier_name: 'JCDecaux', site_type: 'Indoor Mall', daily_request: 48000, floor_cpm: 4.60, latitude: 60.2920, longitude: 25.0417, city: 'Vantaa', status: 'active' },
    { site_url: 'Helsinki-Vantaa Airport', rtb_supplier_name: 'JCDecaux', site_type: 'Airport', daily_request: 60000, floor_cpm: 7.00, latitude: 60.3172, longitude: 24.9633, city: 'Vantaa', status: 'active' },
    // Tampere
    { site_url: 'Ratina Shopping Center', rtb_supplier_name: 'JCDecaux', site_type: 'Indoor Mall', daily_request: 36000, floor_cpm: 4.20, latitude: 61.4932, longitude: 23.7729, city: 'Tampere', status: 'active' },
    { site_url: 'Koskikeskus', rtb_supplier_name: 'Clear Channel', site_type: 'Indoor Mall', daily_request: 28000, floor_cpm: 3.90, latitude: 61.4978, longitude: 23.7610, city: 'Tampere', status: 'active' },
    // Turku
    { site_url: 'Hansa Shopping Center', rtb_supplier_name: 'JCDecaux', site_type: 'Indoor Mall', daily_request: 26000, floor_cpm: 3.80, latitude: 60.4509, longitude: 22.2668, city: 'Turku', status: 'active' },
    // Oulu
    { site_url: 'Valkea Shopping Center', rtb_supplier_name: 'JCDecaux', site_type: 'Indoor Mall', daily_request: 24000, floor_cpm: 3.60, latitude: 65.0121, longitude: 25.4682, city: 'Oulu', status: 'active' },
    // Lahti
    { site_url: 'Karisma Shopping Center', rtb_supplier_name: 'Clear Channel', site_type: 'Indoor Mall', daily_request: 20000, floor_cpm: 3.40, latitude: 60.9831, longitude: 25.6474, city: 'Lahti', status: 'active' },
    // Other cities
    { site_url: 'Matkus Shopping Center', rtb_supplier_name: 'JCDecaux', site_type: 'Indoor Mall', daily_request: 16000, floor_cpm: 3.00, latitude: 62.8925, longitude: 27.6553, city: 'Kuopio', status: 'active' },
    { site_url: 'Seppä Shopping Center', rtb_supplier_name: 'Clear Channel', site_type: 'Indoor Mall', daily_request: 18000, floor_cpm: 3.30, latitude: 62.2426, longitude: 25.7473, city: 'Jyväskylä', status: 'active' },
    { site_url: 'IsoKristiina', rtb_supplier_name: 'JCDecaux', site_type: 'Indoor Mall', daily_request: 12000, floor_cpm: 2.75, latitude: 61.0587, longitude: 28.1887, city: 'Lappeenranta', status: 'active' },
    { site_url: 'Willa Shopping Center', rtb_supplier_name: 'JCDecaux', site_type: 'Indoor Mall', daily_request: 11000, floor_cpm: 2.70, latitude: 60.6296, longitude: 24.8584, city: 'Hyvinkää', status: 'active' },
  ];

  const { data, error } = await supabase.from('media_screens').insert(screens);
  
  if (error) {
    console.error('Error inserting:', error);
  } else {
    console.log('Inserted', screens.length, 'screens successfully!');
  }
}

createTable();
