-- ============================================================================
-- CREATE MEDIA_SCREENS TABLE
-- Stores DOOH screen data from BidTheatre for campaign targeting
-- ============================================================================

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

-- Create index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_media_screens_coords ON media_screens(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_media_screens_status ON media_screens(status);
CREATE INDEX IF NOT EXISTS idx_media_screens_city ON media_screens(city);

-- Enable RLS
ALTER TABLE media_screens ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow read access for authenticated users" ON media_screens
    FOR SELECT TO authenticated USING (true);

-- Allow all access for service role
CREATE POLICY "Allow all access for service role" ON media_screens
    FOR ALL TO service_role USING (true);

-- Insert sample screens in major Finnish cities for testing
INSERT INTO media_screens (site_url, rtb_supplier_name, site_type, daily_request, floor_cpm, latitude, longitude, city, status) VALUES
-- Helsinki area
('Helsinki Kamppi Shopping Center', 'JCDecaux', 'Indoor Mall', 50000, 5.00, 60.1685, 24.9319, 'Helsinki', 'active'),
('Helsinki Forum', 'Clear Channel', 'Indoor Mall', 45000, 4.50, 60.1693, 24.9375, 'Helsinki', 'active'),
('Helsinki Central Railway Station', 'JCDecaux', 'Transport', 80000, 6.00, 60.1712, 24.9414, 'Helsinki', 'active'),
('Itäkeskus Mall', 'Clear Channel', 'Indoor Mall', 35000, 4.00, 60.2098, 25.0810, 'Helsinki', 'active'),
('Helsinki Stockmann', 'JCDecaux', 'Retail', 40000, 5.50, 60.1688, 24.9413, 'Helsinki', 'active'),
('Pasila Station', 'JCDecaux', 'Transport', 30000, 4.00, 60.1989, 24.9338, 'Helsinki', 'active'),
('Mall of Tripla', 'Clear Channel', 'Indoor Mall', 55000, 5.00, 60.1983, 24.9292, 'Helsinki', 'active'),
('Redi Shopping Center', 'JCDecaux', 'Indoor Mall', 32000, 4.20, 60.1877, 24.9798, 'Helsinki', 'active'),

-- Espoo
('Iso Omena', 'Clear Channel', 'Indoor Mall', 38000, 4.30, 60.1615, 24.7388, 'Espoo', 'active'),
('Sello Shopping Center', 'JCDecaux', 'Indoor Mall', 42000, 4.80, 60.2181, 24.8102, 'Espoo', 'active'),
('Tapiola Center', 'Clear Channel', 'Indoor Mall', 25000, 3.80, 60.1762, 24.8053, 'Espoo', 'active'),

-- Vantaa
('Jumbo Shopping Center', 'JCDecaux', 'Indoor Mall', 48000, 4.60, 60.2920, 25.0417, 'Vantaa', 'active'),
('Aviapolis', 'Clear Channel', 'Transport', 22000, 3.50, 60.2989, 24.9636, 'Vantaa', 'active'),
('Helsinki-Vantaa Airport', 'JCDecaux', 'Airport', 60000, 7.00, 60.3172, 24.9633, 'Vantaa', 'active'),

-- Tampere
('Ratina Shopping Center', 'JCDecaux', 'Indoor Mall', 36000, 4.20, 61.4932, 23.7729, 'Tampere', 'active'),
('Koskikeskus', 'Clear Channel', 'Indoor Mall', 28000, 3.90, 61.4978, 23.7610, 'Tampere', 'active'),
('Tampere Railway Station', 'JCDecaux', 'Transport', 25000, 4.00, 61.4988, 23.7731, 'Tampere', 'active'),
('Ideapark Lempäälä', 'Clear Channel', 'Indoor Mall', 30000, 3.70, 61.3145, 23.7513, 'Lempäälä', 'active'),

-- Turku
('Hansa Shopping Center', 'JCDecaux', 'Indoor Mall', 26000, 3.80, 60.4509, 22.2668, 'Turku', 'active'),
('Skanssi Shopping Center', 'Clear Channel', 'Indoor Mall', 22000, 3.50, 60.4361, 22.2847, 'Turku', 'active'),
('Turku Market Square', 'JCDecaux', 'Outdoor', 18000, 3.20, 60.4519, 22.2690, 'Turku', 'active'),

-- Oulu
('Valkea Shopping Center', 'JCDecaux', 'Indoor Mall', 24000, 3.60, 65.0121, 25.4682, 'Oulu', 'active'),
('Ideapark Oulu', 'Clear Channel', 'Indoor Mall', 20000, 3.30, 64.9997, 25.4885, 'Oulu', 'active'),
('Oulu Airport', 'JCDecaux', 'Airport', 15000, 4.50, 64.9281, 25.3546, 'Oulu', 'active'),

-- Lahti
('Karisma Shopping Center', 'Clear Channel', 'Indoor Mall', 20000, 3.40, 60.9831, 25.6474, 'Lahti', 'active'),
('Trio Shopping Center', 'JCDecaux', 'Indoor Mall', 18000, 3.20, 60.9838, 25.6558, 'Lahti', 'active'),

-- Kuopio
('Matkus Shopping Center', 'JCDecaux', 'Indoor Mall', 16000, 3.00, 62.8925, 27.6553, 'Kuopio', 'active'),

-- Jyväskylä
('Seppä Shopping Center', 'Clear Channel', 'Indoor Mall', 18000, 3.30, 62.2426, 25.7473, 'Jyväskylä', 'active'),
('Forum Jyväskylä', 'JCDecaux', 'Indoor Mall', 15000, 3.10, 62.2416, 25.7441, 'Jyväskylä', 'active'),

-- Pori
('Puuvilla Shopping Center', 'Clear Channel', 'Indoor Mall', 14000, 2.90, 61.4863, 21.7967, 'Pori', 'active'),

-- Joensuu
('Iso Myy Shopping Center', 'JCDecaux', 'Indoor Mall', 12000, 2.80, 62.6010, 29.7636, 'Joensuu', 'active'),

-- Hämeenlinna
('Goodman Shopping Center', 'Clear Channel', 'Indoor Mall', 14000, 2.90, 60.9957, 24.4644, 'Hämeenlinna', 'active'),

-- Vaasa
('Rewell Center', 'JCDecaux', 'Indoor Mall', 13000, 2.85, 63.0960, 21.6169, 'Vaasa', 'active'),

-- Rovaniemi
('Sampokeskus', 'Clear Channel', 'Indoor Mall', 10000, 2.70, 66.5039, 25.7294, 'Rovaniemi', 'active'),
('Revontuli Shopping Center', 'JCDecaux', 'Indoor Mall', 11000, 2.80, 66.5010, 25.7206, 'Rovaniemi', 'active'),

-- Seinäjoki  
('Ideapark Seinäjoki', 'Clear Channel', 'Indoor Mall', 16000, 3.00, 62.7903, 22.8403, 'Seinäjoki', 'active'),

-- Kotka
('Pasaati Shopping Center', 'JCDecaux', 'Indoor Mall', 11000, 2.70, 60.4667, 26.9458, 'Kotka', 'active'),

-- Kouvola
('Veturi Shopping Center', 'Clear Channel', 'Indoor Mall', 12000, 2.75, 60.8681, 26.7043, 'Kouvola', 'active'),

-- Mikkeli
('Stella Shopping Center', 'JCDecaux', 'Indoor Mall', 9000, 2.60, 61.6876, 27.2721, 'Mikkeli', 'active'),

-- Porvoo
('Lundi Shopping Center', 'Clear Channel', 'Indoor Mall', 10000, 2.65, 60.3931, 25.6649, 'Porvoo', 'active'),

-- Hyvinkää
('Willa Shopping Center', 'JCDecaux', 'Indoor Mall', 11000, 2.70, 60.6296, 24.8584, 'Hyvinkää', 'active'),

-- Järvenpää
('Prisma Järvenpää', 'Clear Channel', 'Retail', 9000, 2.55, 60.4720, 25.0893, 'Järvenpää', 'active'),

-- Kerava
('Karuselli Shopping Center', 'JCDecaux', 'Indoor Mall', 10000, 2.65, 60.4033, 25.1028, 'Kerava', 'active'),

-- Lohja
('Lohi Shopping Center', 'Clear Channel', 'Indoor Mall', 8000, 2.50, 60.2506, 24.0656, 'Lohja', 'active'),

-- Rauma
('Kanalikeskus', 'JCDecaux', 'Indoor Mall', 8000, 2.50, 61.1278, 21.5122, 'Rauma', 'active'),

-- Imatra
('Imatran Prisma', 'Clear Channel', 'Retail', 7000, 2.40, 61.1722, 28.7722, 'Imatra', 'active'),

-- Lappeenranta
('IsoKristiina', 'JCDecaux', 'Indoor Mall', 12000, 2.75, 61.0587, 28.1887, 'Lappeenranta', 'active'),

-- Kajaani
('Kajaanin Prisma', 'Clear Channel', 'Retail', 7000, 2.40, 64.2270, 27.7285, 'Kajaani', 'active'),

-- Savonlinna
('Savonlinnan Prisma', 'JCDecaux', 'Retail', 6000, 2.30, 61.8690, 28.8780, 'Savonlinna', 'active');
