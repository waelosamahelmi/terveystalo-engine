-- ============================================================================
-- SUUN TERVEYSTALO PLATFORM - COMPLETE DATABASE SCHEMA
-- Version: 1.0.0
-- Date: 2026-02-03
-- Description: Complete SQL migration for dental health marketing platform
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. APP SETTINGS (SQL-driven configuration - no hardcoding)
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    category TEXT,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_app_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS app_settings_updated_at ON app_settings;
CREATE TRIGGER app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_timestamp();

-- Insert default application settings
INSERT INTO app_settings (key, value, category, description) VALUES
-- Branding
('brand_name', '"Suun Terveystalo"', 'branding', 'Application brand name'),
('brand_tagline', '"Hymyile huoletta"', 'branding', 'Brand tagline'),
('brand_colors', '{
    "primary": "#00A5B5",
    "primary_dark": "#008B99",
    "secondary": "#E31E24",
    "accent": "#1B365D",
    "background": "#F8FAFB",
    "text": "#1A1A1A",
    "text_light": "#6B7280",
    "success": "#10B981",
    "warning": "#F59E0B",
    "error": "#EF4444"
}', 'branding', 'Brand color scheme'),
('brand_logo_url', '"https://supabase-storage-url/suun-terveystalo/logo.png"', 'branding', 'Main logo URL'),
('brand_logo_white_url', '"https://supabase-storage-url/suun-terveystalo/logo-white.png"', 'branding', 'White logo URL'),
('brand_favicon_url', '"https://supabase-storage-url/suun-terveystalo/favicon.ico"', 'branding', 'Favicon URL'),

-- Campaign settings
('default_radius_options', '[1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 25000, 30000]', 'campaigns', 'Default radius options in meters'),
('budget_settings', '{
    "media_spend_percentage": 85,
    "min_budget": 500,
    "max_budget": 100000,
    "default_budget": 2000,
    "currency": "EUR",
    "currency_symbol": "€"
}', 'campaigns', 'Budget configuration'),
('channel_defaults', '{
    "meta": {"enabled": true, "default_percentage": 25, "min_budget": 100},
    "display": {"enabled": true, "default_percentage": 30, "min_budget": 100},
    "pdooh": {"enabled": true, "default_percentage": 35, "min_budget": 200},
    "audio": {"enabled": true, "default_percentage": 10, "min_budget": 100}
}', 'campaigns', 'Channel configuration and defaults'),
('campaign_durations', '[7, 14, 30, 60, 90, 180, 365]', 'campaigns', 'Preset campaign duration options in days'),

-- Feature flags
('features', '{
    "ai_enabled": true,
    "ai_insights": true,
    "export_pdf": true,
    "export_excel": true,
    "export_csv": true,
    "audio_channel": true,
    "multi_branch_campaigns": true,
    "creative_approval_workflow": true,
    "scheduled_reports": true,
    "dark_mode": true,
    "notifications": true
}', 'features', 'Feature flags'),

-- Integration settings
('integrations', '{
    "bidtheatre": {"enabled": true},
    "google_sheets": {"enabled": true},
    "meta_ads": {"enabled": true},
    "spotify_ads": {"enabled": false}
}', 'integrations', 'Third-party integration settings'),

-- UI settings
('ui_settings', '{
    "items_per_page": 25,
    "default_date_range": 30,
    "chart_animation": true,
    "table_density": "comfortable",
    "sidebar_collapsed_default": false
}', 'ui', 'UI configuration settings')

ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- ============================================================================
-- 2. AI CONFIGURATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_config (
    id SERIAL PRIMARY KEY,
    provider TEXT DEFAULT 'openrouter',
    api_key TEXT,
    model TEXT DEFAULT 'anthropic/claude-3.5-sonnet',
    fallback_model TEXT DEFAULT 'openai/gpt-4-turbo',
    max_tokens INT DEFAULT 4096,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    system_prompt TEXT DEFAULT 'You are an AI assistant for Suun Terveystalo dental marketing platform. You have access to campaign analytics, branch data, and performance metrics. Help users understand their data, optimize campaigns, and provide actionable insights. Always be helpful, accurate, and professional. Respond in Finnish when the user writes in Finnish.',
    context_window INT DEFAULT 128000,
    rate_limit_per_minute INT DEFAULT 60,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS ai_config_updated_at ON ai_config;
CREATE TRIGGER ai_config_updated_at
    BEFORE UPDATE ON ai_config
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_timestamp();

-- Insert default AI config
INSERT INTO ai_config (provider, model, system_prompt) VALUES
('openrouter', 'anthropic/claude-3.5-sonnet', 
'You are an AI assistant for Suun Terveystalo dental marketing platform. You have access to:
- Campaign performance data (impressions, clicks, conversions, spend)
- Branch information (locations, services, performance)
- Analytics and trends
- Budget optimization suggestions

Your capabilities:
1. Answer questions about campaign performance
2. Provide insights and recommendations
3. Help optimize budget allocation
4. Generate reports and summaries
5. Predict trends based on historical data

Always be helpful, accurate, and professional. Respond in Finnish when the user writes in Finnish, and in English otherwise.
Format numbers with proper separators and currency symbols.')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. SERVICES (Dental services offered)
-- ============================================================================
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name_fi TEXT NOT NULL,
    name_en TEXT,
    description_fi TEXT,
    description_en TEXT,
    default_offer_fi TEXT,
    default_offer_en TEXT,
    default_price TEXT,
    icon TEXT,
    color TEXT,
    image_url TEXT,
    meta_keywords TEXT[],
    active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS services_updated_at ON services;
CREATE TRIGGER services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_timestamp();

-- Insert default services
INSERT INTO services (code, name_fi, name_en, description_fi, default_offer_fi, default_price, icon, color, sort_order) VALUES
('hammastarkastus', 'Hammastarkastus', 'Dental Checkup', 
 'Kattava hammastarkastus sisältäen suun terveydentilan arvioinnin ja hoitosuunnitelman.',
 'Hammastarkastus', '59€', 'tooth', '#00A5B5', 1),
('suuhygienistikäynti', 'Suuhygienistikäynti', 'Dental Hygienist Visit',
 'Ammattimainen suun puhdistus ja ennaltaehkäisevä hoito.',
 'Suuhygienistikäynti', '89€', 'sparkles', '#E31E24', 2)
ON CONFLICT (code) DO UPDATE SET
    name_fi = EXCLUDED.name_fi,
    description_fi = EXCLUDED.description_fi,
    default_offer_fi = EXCLUDED.default_offer_fi,
    default_price = EXCLUDED.default_price,
    updated_at = NOW();

-- ============================================================================
-- 4. BRANCHES (Toimipisteet/Pisteet)
-- ============================================================================
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE,
    name TEXT NOT NULL UNIQUE,
    short_name TEXT,
    address TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    city TEXT NOT NULL,
    region TEXT,
    country TEXT DEFAULT 'Finland',
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    phone TEXT,
    email TEXT,
    website_url TEXT,
    booking_url TEXT,
    opening_hours JSONB DEFAULT '{
        "monday": {"open": "08:00", "close": "18:00"},
        "tuesday": {"open": "08:00", "close": "18:00"},
        "wednesday": {"open": "08:00", "close": "18:00"},
        "thursday": {"open": "08:00", "close": "18:00"},
        "friday": {"open": "08:00", "close": "16:00"},
        "saturday": {"open": null, "close": null},
        "sunday": {"open": null, "close": null}
    }',
    services TEXT[] DEFAULT ARRAY['hammastarkastus', 'suuhygienistikäynti'],
    features JSONB DEFAULT '{"parking": false, "wheelchair_accessible": true, "children_friendly": true}',
    image_url TEXT,
    manager_name TEXT,
    manager_email TEXT,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branches_city ON branches(city);
CREATE INDEX IF NOT EXISTS idx_branches_region ON branches(region);
CREATE INDEX IF NOT EXISTS idx_branches_coordinates ON branches(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(active);

DROP TRIGGER IF EXISTS branches_updated_at ON branches;
CREATE TRIGGER branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_timestamp();

-- ============================================================================
-- 5. SEED BRANCHES DATA (Suun Terveystalo locations from PDF)
-- ============================================================================
INSERT INTO branches (name, short_name, address, postal_code, city, region, latitude, longitude, phone, services) VALUES
-- HELSINKI REGION
('Suun Terveystalo Helsinki Centrum', 'Helsinki Centrum', 'Keskuskatu 1', '00100', 'Helsinki', 'Uusimaa', 60.1699, 24.9384, '+358 10 400 3000', ARRAY['hammastarkastus', 'suuhygienistikäynti']),
('Suun Terveystalo Helsinki Kamppi', 'Helsinki Kamppi', 'Urho Kekkosen katu 1', '00100', 'Helsinki', 'Uusimaa', 60.1688, 24.9327, '+358 10 400 3001', ARRAY['hammastarkastus', 'suuhygienistikäynti']),
('Suun Terveystalo Helsinki Itäkeskus', 'Helsinki Itäkeskus', 'Itäkatu 1-5', '00930', 'Helsinki', 'Uusimaa', 60.2108, 25.0828, '+358 10 400 3002', ARRAY['hammastarkastus', 'suuhygienistikäynti']),
('Suun Terveystalo Helsinki Pasila', 'Helsinki Pasila', 'Pasilankatu 2', '00240', 'Helsinki', 'Uusimaa', 60.1989, 24.9333, '+358 10 400 3003', ARRAY['hammastarkastus', 'suuhygienistikäynti']),
('Suun Terveystalo Helsinki Malmi', 'Helsinki Malmi', 'Malmin kauppatie 14', '00700', 'Helsinki', 'Uusimaa', 60.2514, 25.0106, '+358 10 400 3004', ARRAY['hammastarkastus', 'suuhygienistikäynti']),
('Suun Terveystalo Helsinki Munkkivuori', 'Helsinki Munkkivuori', 'Munkkivuoren puistotie 4', '00330', 'Helsinki', 'Uusimaa', 60.2046, 24.8756, '+358 10 400 3005', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- ESPOO
('Suun Terveystalo Espoo Leppävaara', 'Espoo Leppävaara', 'Leppävaarankatu 3-9', '02600', 'Espoo', 'Uusimaa', 60.2195, 24.8132, '+358 10 400 3010', ARRAY['hammastarkastus', 'suuhygienistikäynti']),
('Suun Terveystalo Espoo Tapiola', 'Espoo Tapiola', 'Länsituulentie 1', '02100', 'Espoo', 'Uusimaa', 60.1756, 24.8047, '+358 10 400 3011', ARRAY['hammastarkastus', 'suuhygienistikäynti']),
('Suun Terveystalo Espoo Matinkylä', 'Espoo Matinkylä', 'Piispansilta 11', '02230', 'Espoo', 'Uusimaa', 60.1600, 24.7400, '+358 10 400 3012', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- VANTAA
('Suun Terveystalo Vantaa Tikkurila', 'Vantaa Tikkurila', 'Asematie 4', '01300', 'Vantaa', 'Uusimaa', 60.2928, 25.0418, '+358 10 400 3020', ARRAY['hammastarkastus', 'suuhygienistikäynti']),
('Suun Terveystalo Vantaa Myyrmäki', 'Vantaa Myyrmäki', 'Iskoskuja 3', '01600', 'Vantaa', 'Uusimaa', 60.2611, 24.8547, '+358 10 400 3021', ARRAY['hammastarkastus', 'suuhygienistikäynti']),
('Suun Terveystalo Vantaa Jumbo', 'Vantaa Jumbo', 'Vantaanportinkatu 3', '01510', 'Vantaa', 'Uusimaa', 60.2920, 24.9631, '+358 10 400 3022', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- TAMPERE
('Suun Terveystalo Tampere Keskusta', 'Tampere Keskusta', 'Hämeenkatu 14', '33100', 'Tampere', 'Pirkanmaa', 61.4978, 23.7610, '+358 10 400 3030', ARRAY['hammastarkastus', 'suuhygienistikäynti']),
('Suun Terveystalo Tampere Lielahti', 'Tampere Lielahti', 'Harjuntausta 7', '33400', 'Tampere', 'Pirkanmaa', 61.5150, 23.6700, '+358 10 400 3031', ARRAY['hammastarkastus', 'suuhygienistikäynti']),
('Suun Terveystalo Tampere Hervanta', 'Tampere Hervanta', 'Insinöörinkatu 23', '33720', 'Tampere', 'Pirkanmaa', 61.4500, 23.8500, '+358 10 400 3032', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- TURKU
('Suun Terveystalo Turku Keskusta', 'Turku Keskusta', 'Yliopistonkatu 22', '20100', 'Turku', 'Varsinais-Suomi', 60.4518, 22.2666, '+358 10 400 3040', ARRAY['hammastarkastus', 'suuhygienistikäynti']),
('Suun Terveystalo Turku Skanssi', 'Turku Skanssi', 'Skanssinkatu 10', '20730', 'Turku', 'Varsinais-Suomi', 60.4350, 22.2200, '+358 10 400 3041', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- OULU
('Suun Terveystalo Oulu Keskusta', 'Oulu Keskusta', 'Isokatu 23', '90100', 'Oulu', 'Pohjois-Pohjanmaa', 65.0121, 25.4651, '+358 10 400 3050', ARRAY['hammastarkastus', 'suuhygienistikäynti']),
('Suun Terveystalo Oulu Ideapark', 'Oulu Ideapark', 'Ritaportti 1', '90400', 'Oulu', 'Pohjois-Pohjanmaa', 64.9850, 25.5100, '+358 10 400 3051', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- LAHTI
('Suun Terveystalo Lahti Keskusta', 'Lahti Keskusta', 'Aleksanterinkatu 18', '15110', 'Lahti', 'Päijät-Häme', 60.9827, 25.6612, '+358 10 400 3060', ARRAY['hammastarkastus', 'suuhygienistikäynti']),
('Suun Terveystalo Lahti Karisma', 'Lahti Karisma', 'Karismankatu 2', '15100', 'Lahti', 'Päijät-Häme', 60.9750, 25.6550, '+358 10 400 3061', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- KUOPIO
('Suun Terveystalo Kuopio', 'Kuopio', 'Kauppakatu 41', '70100', 'Kuopio', 'Pohjois-Savo', 62.8924, 27.6782, '+358 10 400 3070', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- JYVÄSKYLÄ
('Suun Terveystalo Jyväskylä', 'Jyväskylä', 'Kauppakatu 31', '40100', 'Jyväskylä', 'Keski-Suomi', 62.2426, 25.7473, '+358 10 400 3080', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- PORI
('Suun Terveystalo Pori', 'Pori', 'Yrjönkatu 17', '28100', 'Pori', 'Satakunta', 61.4851, 21.7974, '+358 10 400 3090', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- LAPPEENRANTA
('Suun Terveystalo Lappeenranta', 'Lappeenranta', 'Valtakatu 30', '53100', 'Lappeenranta', 'Etelä-Karjala', 61.0587, 28.1887, '+358 10 400 3100', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- VAASA
('Suun Terveystalo Vaasa', 'Vaasa', 'Hovioikeudenpuistikko 13', '65100', 'Vaasa', 'Pohjanmaa', 63.0951, 21.6165, '+358 10 400 3110', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- JOENSUU
('Suun Terveystalo Joensuu', 'Joensuu', 'Kauppakatu 32', '80100', 'Joensuu', 'Pohjois-Karjala', 62.6010, 29.7636, '+358 10 400 3120', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- HÄMEENLINNA
('Suun Terveystalo Hämeenlinna', 'Hämeenlinna', 'Raatihuoneenkatu 17', '13100', 'Hämeenlinna', 'Kanta-Häme', 60.9945, 24.4614, '+358 10 400 3130', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- KOTKA
('Suun Terveystalo Kotka', 'Kotka', 'Keskuskatu 10', '48100', 'Kotka', 'Kymenlaakso', 60.4660, 26.9458, '+358 10 400 3140', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- SEINÄJOKI
('Suun Terveystalo Seinäjoki', 'Seinäjoki', 'Kauppakatu 1', '60100', 'Seinäjoki', 'Etelä-Pohjanmaa', 62.7876, 22.8402, '+358 10 400 3150', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- ROVANIEMI
('Suun Terveystalo Rovaniemi', 'Rovaniemi', 'Koskikatu 25', '96200', 'Rovaniemi', 'Lappi', 66.5039, 25.7294, '+358 10 400 3160', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- KOUVOLA
('Suun Terveystalo Kouvola', 'Kouvola', 'Kauppalankatu 13', '45100', 'Kouvola', 'Kymenlaakso', 60.8681, 26.7043, '+358 10 400 3170', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- HYVINKÄÄ
('Suun Terveystalo Hyvinkää', 'Hyvinkää', 'Hämeenkatu 7', '05800', 'Hyvinkää', 'Uusimaa', 60.6306, 24.8611, '+358 10 400 3180', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- PORVOO
('Suun Terveystalo Porvoo', 'Porvoo', 'Lundinkatu 8', '06100', 'Porvoo', 'Uusimaa', 60.3928, 25.6648, '+358 10 400 3190', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- JÄRVENPÄÄ
('Suun Terveystalo Järvenpää', 'Järvenpää', 'Sibeliuksenkatu 18', '04400', 'Järvenpää', 'Uusimaa', 60.4739, 25.0891, '+358 10 400 3200', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- KERAVA
('Suun Terveystalo Kerava', 'Kerava', 'Kauppakaari 11', '04200', 'Kerava', 'Uusimaa', 60.4033, 25.1064, '+358 10 400 3210', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- RAUMA
('Suun Terveystalo Rauma', 'Rauma', 'Nortamonkatu 14', '26100', 'Rauma', 'Satakunta', 61.1285, 21.5115, '+358 10 400 3220', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- MIKKELI
('Suun Terveystalo Mikkeli', 'Mikkeli', 'Porrassalmenkatu 19', '50100', 'Mikkeli', 'Etelä-Savo', 61.6886, 27.2723, '+358 10 400 3230', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- NOKIA
('Suun Terveystalo Nokia', 'Nokia', 'Välikatu 24', '37100', 'Nokia', 'Pirkanmaa', 61.4785, 23.5080, '+358 10 400 3240', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- YLÖJÄRVI
('Suun Terveystalo Ylöjärvi', 'Ylöjärvi', 'Kuruntie 14', '33470', 'Ylöjärvi', 'Pirkanmaa', 61.5536, 23.5953, '+358 10 400 3250', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- KAJAANI
('Suun Terveystalo Kajaani', 'Kajaani', 'Kauppakatu 21', '87100', 'Kajaani', 'Kainuu', 64.2270, 27.7285, '+358 10 400 3260', ARRAY['hammastarkastus', 'suuhygienistikäynti']),

-- SAVONLINNA
('Suun Terveystalo Savonlinna', 'Savonlinna', 'Olavinkatu 35', '57130', 'Savonlinna', 'Etelä-Savo', 61.8687, 28.8789, '+358 10 400 3270', ARRAY['hammastarkastus', 'suuhygienistikäynti'])

ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 6. USERS TABLE (Modified for Suun Terveystalo)
-- ============================================================================

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'partner',
    image_url TEXT,
    advertiser_id INT,
    branch_id UUID,
    assigned_branches UUID[],
    permissions JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{"theme": "light", "language": "fi", "notifications": true}',
    phone TEXT,
    title TEXT,
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Add foreign key for branch_id after branches table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_branch_id_fkey' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_branch_id_fkey 
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Add columns if they don't exist (for existing installations)
DO $$
BEGIN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id UUID;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_branches UUID[];
    ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"theme": "light", "language": "fi", "notifications": true}';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS title TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS advertiser_id INT;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Update role check constraint safely
DO $$
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'partner', 'viewer'));
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create user policies
-- Allow users to read their own data
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- Allow admins and managers to read all users
DROP POLICY IF EXISTS "Admins can read all users" ON users;
CREATE POLICY "Admins can read all users" ON users
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- Allow admins to update any user
DROP POLICY IF EXISTS "Admins can update users" ON users;
CREATE POLICY "Admins can update users" ON users
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Allow users to insert their own record (for auth signup flow)
DROP POLICY IF EXISTS "Users can insert own data" ON users;
CREATE POLICY "Users can insert own data" ON users
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- Allow admins to insert any user
DROP POLICY IF EXISTS "Admins can insert users" ON users;
CREATE POLICY "Admins can insert users" ON users
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Allow service role full access to users (for signup triggers)
DROP POLICY IF EXISTS "Service role can insert users" ON users;
DROP POLICY IF EXISTS "Service role can manage users" ON users;
CREATE POLICY "Service role can manage users" ON users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow admins to delete users
DROP POLICY IF EXISTS "Admins can delete users" ON users;
CREATE POLICY "Admins can delete users" ON users
    FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Allow users to update their own data
DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- Create trigger for updated_at on users
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_timestamp();

-- Function to handle new user signup from auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'partner')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users.name),
        updated_at = NOW();
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log the error but don't fail the auth
        RAISE WARNING 'handle_new_user error: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

-- Create trigger on auth.users for new signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 7. CAMPAIGNS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS dental_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic info
    name TEXT NOT NULL,
    description TEXT,
    
    -- Service and branch
    service_id UUID REFERENCES services(id) NOT NULL,
    branch_id UUID REFERENCES branches(id) NOT NULL,
    
    -- Location targeting
    campaign_address TEXT,
    campaign_postal_code TEXT,
    campaign_city TEXT,
    campaign_radius INT DEFAULT 5000,
    campaign_coordinates JSONB,
    target_screens_count INT DEFAULT 0,
    
    -- Creative type
    creative_type TEXT CHECK (creative_type IN ('nationwide', 'local', 'both')) DEFAULT 'local',
    
    -- Dates
    campaign_start_date DATE NOT NULL,
    campaign_end_date DATE,
    is_ongoing BOOLEAN DEFAULT false,
    
    -- Total budget
    total_budget DECIMAL(10,2) NOT NULL,
    
    -- Channel configuration
    channel_meta BOOLEAN DEFAULT false,
    channel_display BOOLEAN DEFAULT false,
    channel_pdooh BOOLEAN DEFAULT false,
    channel_audio BOOLEAN DEFAULT false,
    
    -- Channel budgets
    budget_meta DECIMAL(10,2) DEFAULT 0,
    budget_display DECIMAL(10,2) DEFAULT 0,
    budget_pdooh DECIMAL(10,2) DEFAULT 0,
    budget_audio DECIMAL(10,2) DEFAULT 0,
    
    -- Daily budgets (calculated)
    budget_meta_daily DECIMAL(10,2) DEFAULT 0,
    budget_display_daily DECIMAL(10,2) DEFAULT 0,
    budget_pdooh_daily DECIMAL(10,2) DEFAULT 0,
    budget_audio_daily DECIMAL(10,2) DEFAULT 0,
    
    -- Campaign content
    headline TEXT,
    subheadline TEXT,
    offer_text TEXT,
    cta_text TEXT DEFAULT 'Varaa aika',
    landing_url TEXT,
    
    -- Status
    status TEXT CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'paused', 'completed', 'cancelled')) DEFAULT 'draft',
    
    -- BidTheatre integration
    bt_campaign_id_display TEXT,
    bt_campaign_id_pdooh TEXT,
    bt_sync_status TEXT CHECK (bt_sync_status IN ('pending', 'syncing', 'synced', 'failed')),
    bt_last_sync TIMESTAMPTZ,
    bt_sync_error TEXT,
    
    -- Meta integration
    meta_campaign_id TEXT,
    meta_sync_status TEXT,
    
    -- Google Sheets
    sheet_row_id TEXT,
    sheet_last_sync TIMESTAMPTZ,
    
    -- Approval workflow
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Metadata
    tags TEXT[],
    notes TEXT,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dental_campaigns_branch ON dental_campaigns(branch_id);
CREATE INDEX IF NOT EXISTS idx_dental_campaigns_service ON dental_campaigns(service_id);
CREATE INDEX IF NOT EXISTS idx_dental_campaigns_status ON dental_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_dental_campaigns_dates ON dental_campaigns(campaign_start_date, campaign_end_date);
CREATE INDEX IF NOT EXISTS idx_dental_campaigns_created_by ON dental_campaigns(created_by);

DROP TRIGGER IF EXISTS dental_campaigns_updated_at ON dental_campaigns;
CREATE TRIGGER dental_campaigns_updated_at
    BEFORE UPDATE ON dental_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_timestamp();

-- ============================================================================
-- 8. CREATIVES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS creatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES dental_campaigns(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    
    -- Creative info
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('display', 'meta', 'pdooh', 'audio')) NOT NULL,
    format TEXT CHECK (format IN ('image', 'video', 'html', 'audio')) DEFAULT 'html',
    size TEXT NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    
    -- Content
    headline TEXT,
    subheadline TEXT,
    offer_text TEXT,
    cta_text TEXT,
    background_image_url TEXT,
    logo_url TEXT,
    
    -- Generated assets
    html_content TEXT,
    image_url TEXT,
    video_url TEXT,
    audio_url TEXT,
    preview_url TEXT,
    
    -- Template reference
    template_id UUID,
    template_variables JSONB,
    
    -- BidTheatre
    bt_creative_id TEXT,
    bt_ad_id TEXT,
    
    -- Status
    status TEXT CHECK (status IN ('draft', 'generating', 'ready', 'pending_approval', 'approved', 'rejected', 'archived')) DEFAULT 'draft',
    
    -- Approval
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Metadata
    file_size INT,
    duration INT,
    hash TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creatives_campaign ON creatives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_creatives_type ON creatives(type);
CREATE INDEX IF NOT EXISTS idx_creatives_status ON creatives(status);

DROP TRIGGER IF EXISTS creatives_updated_at ON creatives;
CREATE TRIGGER creatives_updated_at
    BEFORE UPDATE ON creatives
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_timestamp();

-- ============================================================================
-- 9. CREATIVE TEMPLATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS creative_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('display', 'meta', 'pdooh', 'audio')) NOT NULL,
    size TEXT NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    
    -- Template content
    html_template TEXT NOT NULL,
    css_styles TEXT,
    js_scripts TEXT,
    
    -- Placeholders
    placeholders JSONB DEFAULT '[
        {"key": "headline", "label": "Headline", "type": "text", "required": true},
        {"key": "subheadline", "label": "Subheadline", "type": "text", "required": false},
        {"key": "offer_text", "label": "Offer Text", "type": "text", "required": true},
        {"key": "cta_text", "label": "CTA Text", "type": "text", "required": true},
        {"key": "background_image", "label": "Background Image", "type": "image", "required": false},
        {"key": "branch_address", "label": "Branch Address", "type": "text", "required": false}
    ]',
    
    -- Default values
    default_values JSONB DEFAULT '{}',
    
    -- Metadata
    preview_url TEXT,
    thumbnail_url TEXT,
    tags TEXT[],
    
    active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS creative_templates_updated_at ON creative_templates;
CREATE TRIGGER creative_templates_updated_at
    BEFORE UPDATE ON creative_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_timestamp();

-- ============================================================================
-- 10. BRAND ASSETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS brand_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('logo', 'font', 'color', 'image', 'icon', 'video', 'audio')) NOT NULL,
    category TEXT,
    
    -- Asset data
    value TEXT NOT NULL,
    url TEXT,
    file_path TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    file_size INT,
    mime_type TEXT,
    dimensions JSONB,
    
    -- Usage
    usage_guidelines TEXT,
    tags TEXT[],
    
    active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS brand_assets_updated_at ON brand_assets;
CREATE TRIGGER brand_assets_updated_at
    BEFORE UPDATE ON brand_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_timestamp();

-- Insert default brand assets for Suun Terveystalo
INSERT INTO brand_assets (name, type, category, value, metadata) VALUES
('Primary Color', 'color', 'colors', '#00A5B5', '{"name": "Teal", "usage": "Primary brand color, headers, buttons"}'),
('Secondary Color', 'color', 'colors', '#E31E24', '{"name": "Red", "usage": "Accent color, CTAs, highlights"}'),
('Dark Color', 'color', 'colors', '#1B365D', '{"name": "Navy", "usage": "Text, dark backgrounds"}'),
('Background Color', 'color', 'colors', '#F8FAFB', '{"name": "Light Gray", "usage": "Page backgrounds"}'),
('White', 'color', 'colors', '#FFFFFF', '{"name": "White", "usage": "Cards, clean backgrounds"}'),
('Main Logo', 'logo', 'logos', 'suun-terveystalo-logo.png', '{"format": "PNG", "background": "transparent"}'),
('Logo White', 'logo', 'logos', 'suun-terveystalo-logo-white.png', '{"format": "PNG", "background": "transparent", "usage": "Dark backgrounds"}'),
('Logo Icon', 'logo', 'logos', 'suun-terveystalo-icon.png', '{"format": "PNG", "usage": "Favicon, small spaces"}'),
('Primary Font', 'font', 'typography', 'Inter', '{"weights": [400, 500, 600, 700], "usage": "Body text, UI"}'),
('Heading Font', 'font', 'typography', 'Poppins', '{"weights": [500, 600, 700], "usage": "Headlines, titles"}'),
('Background Image - Male', 'image', 'backgrounds', 'mies.jpg', '{"description": "Male patient smiling"}'),
('Background Image - Female', 'image', 'backgrounds', 'nainen.jpg', '{"description": "Female patient smiling"}')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 11. CAMPAIGN ANALYTICS
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaign_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES dental_campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    channel TEXT CHECK (channel IN ('meta', 'display', 'pdooh', 'audio')),
    
    -- Core metrics
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    conversions INT DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    
    -- Calculated metrics
    ctr DECIMAL(8,6),
    cpc DECIMAL(10,4),
    cpm DECIMAL(10,4),
    conversion_rate DECIMAL(8,6),
    roas DECIMAL(10,4),
    
    -- Engagement
    video_views INT DEFAULT 0,
    video_completions INT DEFAULT 0,
    engagement_rate DECIMAL(8,6),
    
    -- Viewability
    viewable_impressions BIGINT DEFAULT 0,
    viewable_rate DECIMAL(8,6),
    
    -- Detailed breakdowns (JSONB for flexibility)
    device_stats JSONB DEFAULT '[]',
    geo_stats JSONB DEFAULT '[]',
    hourly_stats JSONB DEFAULT '[]',
    site_stats JSONB DEFAULT '[]',
    audience_stats JSONB DEFAULT '[]',
    
    -- Sync info
    last_sync_at TIMESTAMPTZ,
    sync_source TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(campaign_id, date, channel)
);

CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign ON campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_date ON campaign_analytics(date);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_channel ON campaign_analytics(channel);

DROP TRIGGER IF EXISTS campaign_analytics_updated_at ON campaign_analytics;
CREATE TRIGGER campaign_analytics_updated_at
    BEFORE UPDATE ON campaign_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_timestamp();

-- ============================================================================
-- 12. AI CHAT HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    
    role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
    content TEXT NOT NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tool_calls JSONB,
    tokens_used INT,
    model_used TEXT,
    response_time_ms INT,
    
    -- Feedback
    feedback TEXT CHECK (feedback IN ('positive', 'negative', NULL)),
    feedback_comment TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_user ON ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_session ON ai_chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_created ON ai_chat_history(created_at);

-- ============================================================================
-- 13. AI INSIGHTS (Cached AI-generated insights)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Context
    insight_type TEXT CHECK (insight_type IN ('campaign', 'branch', 'overall', 'trend', 'recommendation')) NOT NULL,
    entity_id UUID,
    entity_type TEXT,
    
    -- Content
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    details JSONB,
    
    -- Metrics
    impact_score DECIMAL(3,2),
    confidence_score DECIMAL(3,2),
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Actions
    suggested_actions JSONB DEFAULT '[]',
    
    -- Status
    status TEXT CHECK (status IN ('active', 'dismissed', 'actioned', 'expired')) DEFAULT 'active',
    dismissed_by UUID REFERENCES users(id),
    dismissed_at TIMESTAMPTZ,
    
    -- Validity
    valid_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_entity ON ai_insights(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_status ON ai_insights(status);

-- ============================================================================
-- 14. ACTIVITY LOGS (Enhanced)
-- ============================================================================

-- Create activity_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    details TEXT,
    entity_type TEXT,
    entity_id UUID,
    changes JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist (for existing installations)
DO $$
BEGIN
    ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
    ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS entity_id UUID;
    ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS changes JSONB;
    ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
    ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
EXCEPTION
    WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

-- ============================================================================
-- 15. NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'success', 'warning', 'error', 'campaign', 'approval', 'system')) DEFAULT 'info',
    
    -- Link
    action_url TEXT,
    action_label TEXT,
    
    -- Entity reference
    entity_type TEXT,
    entity_id UUID,
    
    -- Status
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- Delivery
    email_sent BOOLEAN DEFAULT false,
    push_sent BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- ============================================================================
-- 16. SCHEDULED REPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Report config
    name TEXT NOT NULL,
    description TEXT,
    report_type TEXT CHECK (report_type IN ('campaign', 'branch', 'overall', 'custom')) NOT NULL,
    
    -- Filters
    filters JSONB DEFAULT '{}',
    date_range TEXT CHECK (date_range IN ('last_7_days', 'last_30_days', 'last_90_days', 'last_month', 'last_quarter', 'custom')),
    custom_date_start DATE,
    custom_date_end DATE,
    
    -- Format
    format TEXT CHECK (format IN ('pdf', 'excel', 'csv')) DEFAULT 'pdf',
    template_id UUID,
    
    -- Schedule
    schedule_type TEXT CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'quarterly')) NOT NULL,
    schedule_day INT,
    schedule_time TIME DEFAULT '08:00',
    timezone TEXT DEFAULT 'Europe/Helsinki',
    
    -- Recipients
    recipients TEXT[] NOT NULL,
    cc_recipients TEXT[],
    
    -- Status
    active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    last_run_status TEXT,
    next_run_at TIMESTAMPTZ,
    
    -- Ownership
    created_by UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS scheduled_reports_updated_at ON scheduled_reports;
CREATE TRIGGER scheduled_reports_updated_at
    BEFORE UPDATE ON scheduled_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_timestamp();

-- ============================================================================
-- 17. EXPORT HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS export_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    
    -- Export info
    export_type TEXT CHECK (export_type IN ('campaign', 'analytics', 'creatives', 'report', 'custom')) NOT NULL,
    format TEXT CHECK (format IN ('pdf', 'excel', 'csv', 'png', 'jpg', 'zip')) NOT NULL,
    
    -- Filters applied
    filters JSONB,
    
    -- File info
    file_name TEXT,
    file_url TEXT,
    file_size INT,
    
    -- Status
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    error_message TEXT,
    
    -- Timestamps
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_history_user ON export_history(user_id);

-- ============================================================================
-- 18. CAMPAIGN QUEUE (for background processing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaign_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES dental_campaigns(id) ON DELETE CASCADE,
    
    -- Operation
    operation TEXT CHECK (operation IN ('create', 'update', 'pause', 'resume', 'delete', 'sync')) NOT NULL,
    channel TEXT,
    
    -- Payload
    payload JSONB,
    
    -- Status
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')) DEFAULT 'pending',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    
    -- Timestamps
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_queue_status ON campaign_queue(status);
CREATE INDEX IF NOT EXISTS idx_campaign_queue_scheduled ON campaign_queue(scheduled_at) WHERE status = 'pending';

-- ============================================================================
-- 19. BIDTHEATRE CREDENTIALS (Keep existing, just ensure it exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bidtheatre_credentials (
    id SERIAL PRIMARY KEY,
    network_id TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    advertiser_id INT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 20. BIDTHEATRE BID STRATEGIES (Keep existing structure)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bidtheatre_bid_strategies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    channel TEXT CHECK (channel IN ('DISPLAY', 'PDOOH')) NOT NULL,
    rtb_sitelist INT,
    adgroup_name TEXT,
    max_cpm DECIMAL(10,2),
    target_share DECIMAL(5,2),
    filter_target INT,
    paused BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 21. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Activity Logs: Anyone can insert, admins/managers can read
DROP POLICY IF EXISTS "anyone_can_insert_activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "admins_can_read_activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "managers_can_read_activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "anyone_insert_activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "admins_read_all_activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_admin_read_all" ON activity_logs;

CREATE POLICY "Anyone can insert activity logs" ON activity_logs FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can read all activity logs" ON activity_logs FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- App Settings: Admins can manage, all authenticated can read
DROP POLICY IF EXISTS "Anyone can read app settings" ON app_settings;
CREATE POLICY "Anyone can read app settings" ON app_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage app settings" ON app_settings;
CREATE POLICY "Admins can manage app settings" ON app_settings FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- AI Config: Admins only
DROP POLICY IF EXISTS "Admins can manage AI config" ON ai_config;
CREATE POLICY "Admins can manage AI config" ON ai_config FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Services: All can read, admins can manage
DROP POLICY IF EXISTS "Anyone can read services" ON services;
CREATE POLICY "Anyone can read services" ON services FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage services" ON services;
CREATE POLICY "Admins can manage services" ON services FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Branches: All can read, admins/managers can manage
DROP POLICY IF EXISTS "Anyone can read branches" ON branches;
CREATE POLICY "Anyone can read branches" ON branches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins and managers can manage branches" ON branches;
CREATE POLICY "Admins and managers can manage branches" ON branches FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- Campaigns: Based on role and branch assignment
DROP POLICY IF EXISTS "Users can read their campaigns" ON dental_campaigns;
CREATE POLICY "Users can read their campaigns" ON dental_campaigns FOR SELECT TO authenticated
    USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')) OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND branch_id = dental_campaigns.branch_id)
    );

DROP POLICY IF EXISTS "Users can create campaigns" ON dental_campaigns;
CREATE POLICY "Users can create campaigns" ON dental_campaigns FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'partner'))
    );

DROP POLICY IF EXISTS "Users can update their campaigns" ON dental_campaigns;
CREATE POLICY "Users can update their campaigns" ON dental_campaigns FOR UPDATE TO authenticated
    USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

-- Creatives: Same as campaigns
DROP POLICY IF EXISTS "Users can read creatives" ON creatives;
CREATE POLICY "Users can read creatives" ON creatives FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM dental_campaigns dc 
            WHERE dc.id = creatives.campaign_id 
            AND (dc.created_by = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')))
        )
    );

DROP POLICY IF EXISTS "Users can manage creatives" ON creatives;
CREATE POLICY "Users can manage creatives" ON creatives FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'partner'))
    );

-- Templates: All can read, admins can manage
DROP POLICY IF EXISTS "Anyone can read templates" ON creative_templates;
CREATE POLICY "Anyone can read templates" ON creative_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage templates" ON creative_templates;
CREATE POLICY "Admins can manage templates" ON creative_templates FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Brand Assets: All can read, admins can manage
DROP POLICY IF EXISTS "Anyone can read brand assets" ON brand_assets;
CREATE POLICY "Anyone can read brand assets" ON brand_assets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage brand assets" ON brand_assets;
CREATE POLICY "Admins can manage brand assets" ON brand_assets FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Analytics: Based on campaign access
DROP POLICY IF EXISTS "Users can read analytics" ON campaign_analytics;
CREATE POLICY "Users can read analytics" ON campaign_analytics FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM dental_campaigns dc 
            WHERE dc.id = campaign_analytics.campaign_id 
            AND (dc.created_by = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')))
        )
    );

-- AI Chat: Users can only see their own
DROP POLICY IF EXISTS "Users can manage own chat history" ON ai_chat_history;
CREATE POLICY "Users can manage own chat history" ON ai_chat_history FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Insights: Based on role
DROP POLICY IF EXISTS "Users can read insights" ON ai_insights;
CREATE POLICY "Users can read insights" ON ai_insights FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "System can manage insights" ON ai_insights;
CREATE POLICY "System can manage insights" ON ai_insights FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Notifications: Users can only see their own
DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;
CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Scheduled Reports: Based on ownership
DROP POLICY IF EXISTS "Users can manage own reports" ON scheduled_reports;
CREATE POLICY "Users can manage own reports" ON scheduled_reports FOR ALL TO authenticated
    USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Export History: Users can only see their own
DROP POLICY IF EXISTS "Users can manage own exports" ON export_history;
CREATE POLICY "Users can manage own exports" ON export_history FOR ALL TO authenticated
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Campaign Queue: Admins and system
DROP POLICY IF EXISTS "Admins can manage queue" ON campaign_queue;
CREATE POLICY "Admins can manage queue" ON campaign_queue FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- 22. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate campaign daily budgets
CREATE OR REPLACE FUNCTION calculate_daily_budgets()
RETURNS TRIGGER AS $$
DECLARE
    campaign_days INT;
BEGIN
    -- Calculate campaign duration
    IF NEW.is_ongoing OR NEW.campaign_end_date IS NULL THEN
        campaign_days := 30; -- Default to 30 days for ongoing
    ELSE
        campaign_days := GREATEST(1, NEW.campaign_end_date - NEW.campaign_start_date + 1);
    END IF;
    
    -- Calculate daily budgets
    NEW.budget_meta_daily := CASE WHEN NEW.channel_meta THEN ROUND(NEW.budget_meta / campaign_days, 2) ELSE 0 END;
    NEW.budget_display_daily := CASE WHEN NEW.channel_display THEN ROUND(NEW.budget_display / campaign_days, 2) ELSE 0 END;
    NEW.budget_pdooh_daily := CASE WHEN NEW.channel_pdooh THEN ROUND(NEW.budget_pdooh / campaign_days, 2) ELSE 0 END;
    NEW.budget_audio_daily := CASE WHEN NEW.channel_audio THEN ROUND(NEW.budget_audio / campaign_days, 2) ELSE 0 END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_campaign_daily_budgets ON dental_campaigns;
CREATE TRIGGER calculate_campaign_daily_budgets
    BEFORE INSERT OR UPDATE OF budget_meta, budget_display, budget_pdooh, budget_audio, 
                             campaign_start_date, campaign_end_date, is_ongoing,
                             channel_meta, channel_display, channel_pdooh, channel_audio
    ON dental_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION calculate_daily_budgets();

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_action TEXT,
    p_details TEXT DEFAULT NULL,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_changes JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO activity_logs (user_id, user_email, action, details, entity_type, entity_id, changes)
    SELECT p_user_id, email, p_action, p_details, p_entity_type, p_entity_id, p_changes
    FROM users WHERE id = p_user_id
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_action_url TEXT DEFAULT NULL,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, action_url, entity_type, entity_id)
    VALUES (p_user_id, p_title, p_message, p_type, p_action_url, p_entity_type, p_entity_id)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get campaign statistics
CREATE OR REPLACE FUNCTION get_campaign_stats(p_campaign_id UUID)
RETURNS TABLE (
    total_impressions BIGINT,
    total_clicks BIGINT,
    total_conversions INT,
    total_spend DECIMAL(10,2),
    avg_ctr DECIMAL(8,6),
    avg_cpm DECIMAL(10,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(impressions), 0)::BIGINT,
        COALESCE(SUM(clicks), 0)::BIGINT,
        COALESCE(SUM(conversions), 0)::INT,
        COALESCE(SUM(spend), 0)::DECIMAL(10,2),
        CASE WHEN SUM(impressions) > 0 
            THEN (SUM(clicks)::DECIMAL / SUM(impressions))
            ELSE 0 
        END::DECIMAL(8,6),
        CASE WHEN SUM(impressions) > 0 
            THEN (SUM(spend) / SUM(impressions) * 1000)
            ELSE 0 
        END::DECIMAL(10,4)
    FROM campaign_analytics
    WHERE campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get branch performance
CREATE OR REPLACE FUNCTION get_branch_performance(p_branch_id UUID, p_days INT DEFAULT 30)
RETURNS TABLE (
    campaign_count INT,
    total_spend DECIMAL(10,2),
    total_impressions BIGINT,
    total_clicks BIGINT,
    avg_ctr DECIMAL(8,6)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT dc.id)::INT,
        COALESCE(SUM(ca.spend), 0)::DECIMAL(10,2),
        COALESCE(SUM(ca.impressions), 0)::BIGINT,
        COALESCE(SUM(ca.clicks), 0)::BIGINT,
        CASE WHEN SUM(ca.impressions) > 0 
            THEN (SUM(ca.clicks)::DECIMAL / SUM(ca.impressions))
            ELSE 0 
        END::DECIMAL(8,6)
    FROM dental_campaigns dc
    LEFT JOIN campaign_analytics ca ON dc.id = ca.campaign_id AND ca.date >= CURRENT_DATE - p_days
    WHERE dc.branch_id = p_branch_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get app setting
CREATE OR REPLACE FUNCTION get_app_setting(p_key TEXT)
RETURNS JSONB AS $$
DECLARE
    setting_value JSONB;
BEGIN
    SELECT value INTO setting_value FROM app_settings WHERE key = p_key;
    RETURN setting_value;
END;
$$ LANGUAGE plpgsql;

-- Function to set app setting
CREATE OR REPLACE FUNCTION set_app_setting(p_key TEXT, p_value JSONB, p_user_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO app_settings (key, value, updated_by)
    VALUES (p_key, p_value, p_user_id)
    ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 23. VIEWS FOR REPORTING
-- ============================================================================

-- Campaign summary view
CREATE OR REPLACE VIEW campaign_summary AS
SELECT 
    dc.id,
    dc.name,
    dc.status,
    dc.campaign_start_date,
    dc.campaign_end_date,
    dc.total_budget,
    s.name_fi AS service_name,
    b.name AS branch_name,
    b.city AS branch_city,
    COALESCE(SUM(ca.impressions), 0) AS total_impressions,
    COALESCE(SUM(ca.clicks), 0) AS total_clicks,
    COALESCE(SUM(ca.spend), 0) AS total_spend,
    CASE WHEN SUM(ca.impressions) > 0 
        THEN ROUND((SUM(ca.clicks)::DECIMAL / SUM(ca.impressions)) * 100, 2)
        ELSE 0 
    END AS ctr_percentage,
    dc.created_at,
    u.name AS created_by_name
FROM dental_campaigns dc
LEFT JOIN services s ON dc.service_id = s.id
LEFT JOIN branches b ON dc.branch_id = b.id
LEFT JOIN campaign_analytics ca ON dc.id = ca.campaign_id
LEFT JOIN users u ON dc.created_by = u.id
GROUP BY dc.id, s.name_fi, b.name, b.city, u.name;

-- Branch performance view
CREATE OR REPLACE VIEW branch_performance AS
SELECT 
    b.id,
    b.name,
    b.city,
    b.region,
    COUNT(DISTINCT dc.id) AS campaign_count,
    COUNT(DISTINCT CASE WHEN dc.status = 'active' THEN dc.id END) AS active_campaigns,
    COALESCE(SUM(dc.total_budget), 0) AS total_budget,
    COALESCE(SUM(ca.impressions), 0) AS total_impressions,
    COALESCE(SUM(ca.clicks), 0) AS total_clicks,
    COALESCE(SUM(ca.spend), 0) AS total_spend
FROM branches b
LEFT JOIN dental_campaigns dc ON b.id = dc.branch_id
LEFT JOIN campaign_analytics ca ON dc.id = ca.campaign_id
GROUP BY b.id;

-- Daily spend view
CREATE OR REPLACE VIEW daily_spend AS
SELECT 
    ca.date,
    ca.channel,
    SUM(ca.impressions) AS impressions,
    SUM(ca.clicks) AS clicks,
    SUM(ca.spend) AS spend,
    COUNT(DISTINCT ca.campaign_id) AS campaigns
FROM campaign_analytics ca
GROUP BY ca.date, ca.channel
ORDER BY ca.date DESC;

-- ============================================================================
-- 24. INSERT DEFAULT CREATIVE TEMPLATES
-- ============================================================================

-- Display 300x600 Template
INSERT INTO creative_templates (name, description, type, size, width, height, html_template, default_values, sort_order) VALUES
('Suun Terveystalo 300x600', 'Standard display banner 300x600', 'display', '300x600', 300, 600, 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: "Inter", "Poppins", sans-serif;
            width: 300px;
            height: 600px;
            overflow: hidden;
        }
        .container {
            width: 100%;
            height: 100%;
            background: linear-gradient(180deg, {{primary_color}} 0%, {{primary_dark}} 100%);
            position: relative;
            display: flex;
            flex-direction: column;
        }
        .logo {
            padding: 20px;
            text-align: center;
        }
        .logo img {
            height: 40px;
            width: auto;
        }
        .image-section {
            flex: 1;
            background-image: url({{background_image}});
            background-size: cover;
            background-position: center;
            position: relative;
        }
        .content {
            padding: 20px;
            background: white;
            text-align: center;
        }
        .headline {
            font-size: 24px;
            font-weight: 700;
            color: {{primary_color}};
            margin-bottom: 8px;
            line-height: 1.2;
        }
        .offer {
            font-size: 32px;
            font-weight: 700;
            color: {{secondary_color}};
            margin-bottom: 12px;
        }
        .address {
            font-size: 12px;
            color: #666;
            margin-bottom: 16px;
        }
        .cta {
            display: inline-block;
            background: {{secondary_color}};
            color: white;
            padding: 12px 32px;
            border-radius: 25px;
            font-weight: 600;
            font-size: 14px;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <img src="{{logo_url}}" alt="Suun Terveystalo">
        </div>
        <div class="image-section"></div>
        <div class="content">
            <div class="headline">{{headline}}</div>
            <div class="offer">{{offer_text}}</div>
            <div class="address">{{branch_address}}</div>
            <a href="#" class="cta">{{cta_text}}</a>
        </div>
    </div>
</body>
</html>',
'{
    "primary_color": "#00A5B5",
    "primary_dark": "#008B99",
    "secondary_color": "#E31E24",
    "headline": "Hammastarkastus",
    "offer_text": "59€",
    "cta_text": "Varaa aika",
    "branch_address": ""
}', 1),

-- Display 300x300 Template
('Suun Terveystalo 300x300', 'Square display banner 300x300', 'display', '300x300', 300, 300, 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: "Inter", "Poppins", sans-serif;
            width: 300px;
            height: 300px;
            overflow: hidden;
        }
        .container {
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, {{primary_color}} 0%, {{primary_dark}} 100%);
            position: relative;
            padding: 20px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .logo img {
            height: 30px;
            width: auto;
        }
        .content {
            text-align: center;
        }
        .headline {
            font-size: 20px;
            font-weight: 700;
            color: white;
            margin-bottom: 8px;
        }
        .offer {
            font-size: 36px;
            font-weight: 700;
            color: white;
            margin-bottom: 8px;
        }
        .address {
            font-size: 11px;
            color: rgba(255,255,255,0.8);
            margin-bottom: 12px;
        }
        .cta {
            display: inline-block;
            background: {{secondary_color}};
            color: white;
            padding: 10px 24px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <img src="{{logo_white_url}}" alt="Suun Terveystalo">
        </div>
        <div class="content">
            <div class="headline">{{headline}}</div>
            <div class="offer">{{offer_text}}</div>
            <div class="address">{{branch_address}}</div>
            <span class="cta">{{cta_text}}</span>
        </div>
    </div>
</body>
</html>',
'{
    "primary_color": "#00A5B5",
    "primary_dark": "#008B99",
    "secondary_color": "#E31E24",
    "headline": "Hammastarkastus",
    "offer_text": "59€",
    "cta_text": "Varaa aika",
    "branch_address": ""
}', 2),

-- PDOOH 1080x1920 Template
('Suun Terveystalo 1080x1920 PDOOH', 'Vertical PDOOH screen', 'pdooh', '1080x1920', 1080, 1920, 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1080, height=1920">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: "Poppins", "Inter", sans-serif;
            width: 1080px;
            height: 1920px;
            overflow: hidden;
        }
        .container {
            width: 100%;
            height: 100%;
            background: {{primary_color}};
            position: relative;
            display: flex;
            flex-direction: column;
        }
        .header {
            padding: 60px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .logo img {
            height: 120px;
            width: auto;
        }
        .image-section {
            flex: 1;
            background-image: url({{background_image}});
            background-size: cover;
            background-position: center top;
            position: relative;
        }
        .image-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 50%;
            background: linear-gradient(transparent, {{primary_color}});
        }
        .content {
            padding: 60px;
            text-align: center;
            background: {{primary_color}};
        }
        .headline {
            font-size: 72px;
            font-weight: 700;
            color: white;
            margin-bottom: 20px;
            line-height: 1.1;
        }
        .offer {
            font-size: 120px;
            font-weight: 700;
            color: white;
            margin-bottom: 30px;
        }
        .subtext {
            font-size: 36px;
            color: rgba(255,255,255,0.9);
            margin-bottom: 40px;
        }
        .address {
            font-size: 32px;
            color: rgba(255,255,255,0.8);
            margin-bottom: 50px;
        }
        .cta {
            display: inline-block;
            background: {{secondary_color}};
            color: white;
            padding: 30px 80px;
            border-radius: 50px;
            font-weight: 700;
            font-size: 42px;
        }
        .footer {
            padding: 40px 60px;
            background: white;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .footer-logo img {
            height: 60px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="{{logo_white_url}}" alt="Suun Terveystalo">
            </div>
        </div>
        <div class="image-section">
            <div class="image-overlay"></div>
        </div>
        <div class="content">
            <div class="headline">{{headline}}</div>
            <div class="offer">{{offer_text}}</div>
            <div class="subtext">{{subheadline}}</div>
            <div class="address">{{branch_address}}</div>
            <span class="cta">{{cta_text}}</span>
        </div>
    </div>
</body>
</html>',
'{
    "primary_color": "#00A5B5",
    "secondary_color": "#E31E24",
    "headline": "Hammastarkastus",
    "offer_text": "59€",
    "subheadline": "Kattava suun terveystarkastus",
    "cta_text": "Varaa aikasi nyt",
    "branch_address": ""
}', 10),

-- Meta 1080x1080 Template
('Suun Terveystalo 1080x1080 Meta', 'Square Meta/Instagram post', 'meta', '1080x1080', 1080, 1080, 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: "Poppins", "Inter", sans-serif;
            width: 1080px;
            height: 1080px;
            overflow: hidden;
        }
        .container {
            width: 100%;
            height: 100%;
            background-image: url({{background_image}});
            background-size: cover;
            background-position: center;
            position: relative;
        }
        .overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, rgba(0,165,181,0.3) 0%, rgba(0,165,181,0.95) 100%);
        }
        .content {
            position: relative;
            z-index: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 60px;
        }
        .logo img {
            height: 80px;
            width: auto;
        }
        .main {
            text-align: center;
        }
        .headline {
            font-size: 64px;
            font-weight: 700;
            color: white;
            margin-bottom: 20px;
        }
        .offer {
            font-size: 96px;
            font-weight: 700;
            color: white;
            margin-bottom: 20px;
        }
        .address {
            font-size: 28px;
            color: rgba(255,255,255,0.9);
        }
        .footer {
            text-align: center;
        }
        .cta {
            display: inline-block;
            background: {{secondary_color}};
            color: white;
            padding: 24px 60px;
            border-radius: 40px;
            font-weight: 700;
            font-size: 32px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="overlay"></div>
        <div class="content">
            <div class="logo">
                <img src="{{logo_white_url}}" alt="Suun Terveystalo">
            </div>
            <div class="main">
                <div class="headline">{{headline}}</div>
                <div class="offer">{{offer_text}}</div>
                <div class="address">{{branch_address}}</div>
            </div>
            <div class="footer">
                <span class="cta">{{cta_text}}</span>
            </div>
        </div>
    </div>
</body>
</html>',
'{
    "primary_color": "#00A5B5",
    "secondary_color": "#E31E24",
    "headline": "Hammastarkastus",
    "offer_text": "59€",
    "cta_text": "Varaa aika",
    "branch_address": ""
}', 20)

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 25. GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_app_setting(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_app_setting(TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_branch_performance(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_activity(UUID, TEXT, TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Suun Terveystalo database migration completed successfully at %', NOW();
END $$;
