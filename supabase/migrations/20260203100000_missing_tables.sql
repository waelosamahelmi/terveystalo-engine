-- ============================================================================
-- Suun Terveystalo: Missing Tables Migration
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. dismissed_notifications table (causing the 404 spam)
CREATE TABLE IF NOT EXISTS public.dismissed_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_id TEXT NOT NULL,
    dismissed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, notification_id)
);

ALTER TABLE public.dismissed_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own dismissals" ON public.dismissed_notifications;
CREATE POLICY "Users can manage their own dismissals" ON public.dismissed_notifications
    FOR ALL USING (auth.uid() = user_id);

-- 2. services table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price_range TEXT,
    duration_minutes INTEGER,
    active BOOLEAN DEFAULT true,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Services are viewable by all" ON public.services;
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
CREATE POLICY "Services are viewable by all" ON public.services FOR SELECT USING (true);
CREATE POLICY "Admins can manage services" ON public.services FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- 3. branches table
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    active BOOLEAN DEFAULT true,
    opening_hours JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Branches are viewable by all" ON public.branches;
DROP POLICY IF EXISTS "Admins can manage branches" ON public.branches;
CREATE POLICY "Branches are viewable by all" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Admins can manage branches" ON public.branches FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- 4. dental_campaigns table
CREATE TABLE IF NOT EXISTS public.dental_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    service_id UUID REFERENCES public.services(id),
    branch_id UUID REFERENCES public.branches(id),
    total_budget DECIMAL(10, 2),
    daily_budget DECIMAL(10, 2),
    spent_budget DECIMAL(10, 2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    target_audience JSONB,
    channels JSONB,
    creative_ids UUID[],
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dental_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Campaigns are viewable by authenticated" ON public.dental_campaigns;
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.dental_campaigns;
CREATE POLICY "Campaigns are viewable by authenticated" ON public.dental_campaigns FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage campaigns" ON public.dental_campaigns FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- 5. ai_insights table
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'success', 'error')),
    data JSONB,
    dismissed BOOLEAN DEFAULT false,
    campaign_id UUID REFERENCES public.dental_campaigns(id),
    branch_id UUID REFERENCES public.branches(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Insights viewable by authenticated" ON public.ai_insights;
DROP POLICY IF EXISTS "Insights manageable by authenticated" ON public.ai_insights;
CREATE POLICY "Insights viewable by authenticated" ON public.ai_insights FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Insights manageable by authenticated" ON public.ai_insights FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 6. creatives table
CREATE TABLE IF NOT EXISTS public.creatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT DEFAULT 'image' CHECK (type IN ('image', 'video', 'html', 'text')),
    content_url TEXT,
    html_content TEXT,
    thumbnail_url TEXT,
    dimensions JSONB,
    service_id UUID REFERENCES public.services(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Creatives viewable by authenticated" ON public.creatives;
DROP POLICY IF EXISTS "Admins can manage creatives" ON public.creatives;
CREATE POLICY "Creatives viewable by authenticated" ON public.creatives FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage creatives" ON public.creatives FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- 7. analytics_data table
CREATE TABLE IF NOT EXISTS public.analytics_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.dental_campaigns(id),
    branch_id UUID REFERENCES public.branches(id),
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    spend DECIMAL(10, 2) DEFAULT 0,
    channel TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.analytics_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Analytics viewable by authenticated" ON public.analytics_data;
CREATE POLICY "Analytics viewable by authenticated" ON public.analytics_data FOR SELECT USING (auth.uid() IS NOT NULL);

-- 8. activity_log table
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Activity viewable by authenticated" ON public.activity_log;
DROP POLICY IF EXISTS "Users can create activity" ON public.activity_log;
CREATE POLICY "Activity viewable by authenticated" ON public.activity_log FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create activity" ON public.activity_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 9. ai_config table
CREATE TABLE IF NOT EXISTS public.ai_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Config viewable by authenticated" ON public.ai_config;
DROP POLICY IF EXISTS "Admins can manage config" ON public.ai_config;
CREATE POLICY "Config viewable by authenticated" ON public.ai_config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage config" ON public.ai_config FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 10. Add missing columns to services if they don't exist
DO $$
BEGIN
    -- Add columns to services if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'name') THEN
        ALTER TABLE public.services ADD COLUMN name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'description') THEN
        ALTER TABLE public.services ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'category') THEN
        ALTER TABLE public.services ADD COLUMN category TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'active') THEN
        ALTER TABLE public.services ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'color') THEN
        ALTER TABLE public.services ADD COLUMN color TEXT;
    END IF;
    
    -- Add columns to branches if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'name') THEN
        ALTER TABLE public.branches ADD COLUMN name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'city') THEN
        ALTER TABLE public.branches ADD COLUMN city TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'address') THEN
        ALTER TABLE public.branches ADD COLUMN address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'active') THEN
        ALTER TABLE public.branches ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'lat') THEN
        ALTER TABLE public.branches ADD COLUMN lat DECIMAL(10, 8);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'lng') THEN
        ALTER TABLE public.branches ADD COLUMN lng DECIMAL(11, 8);
    END IF;
END $$;

-- 11. Insert sample data for services (only if table has the columns)
INSERT INTO public.services (name, description, category, active, color) 
SELECT * FROM (VALUES
    ('Hammastarkastus', 'Kattava suun terveystarkastus', 'Yleishammashoito', true, '#00A5B5'),
    ('Hammaskiven poisto', 'Ammattimainen puhdistus', 'Yleishammashoito', true, '#00A5B5'),
    ('Paikkaushoito', 'Reikien paikkaus', 'Yleishammashoito', true, '#00A5B5'),
    ('Juurihoito', 'Hampaan juurikanavan hoito', 'Erikoishoito', true, '#1B365D'),
    ('Hampaiden valkaisu', 'Ammattimainen valkaisu', 'Esteettinen', true, '#E31E24'),
    ('Oikomishoito', 'Hampaiden oikaisu', 'Erikoishoito', true, '#1B365D'),
    ('Implanttihoito', 'Hammasimplantit', 'Erikoishoito', true, '#1B365D'),
    ('Lasten hammashoito', 'Erityisesti lapsille', 'Lasten hoito', true, '#4CAF50')
) AS t(name, description, category, active, color)
WHERE NOT EXISTS (SELECT 1 FROM public.services LIMIT 1);

-- 12. Insert sample branches
INSERT INTO public.branches (name, city, address, active, lat, lng) 
SELECT * FROM (VALUES
    ('Suun Terveystalo Helsinki', 'Helsinki', 'Mannerheimintie 1', true, 60.1699::DECIMAL, 24.9384::DECIMAL),
    ('Suun Terveystalo Espoo', 'Espoo', 'Leppävaarankatu 5', true, 60.2192::DECIMAL, 24.8131::DECIMAL),
    ('Suun Terveystalo Tampere', 'Tampere', 'Hämeenkatu 10', true, 61.4978::DECIMAL, 23.7610::DECIMAL),
    ('Suun Terveystalo Turku', 'Turku', 'Yliopistonkatu 15', true, 60.4518::DECIMAL, 22.2666::DECIMAL),
    ('Suun Terveystalo Oulu', 'Oulu', 'Kauppurienkatu 8', true, 65.0121::DECIMAL, 25.4651::DECIMAL)
) AS t(name, city, address, active, lat, lng)
WHERE NOT EXISTS (SELECT 1 FROM public.branches LIMIT 1);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Done!
SELECT 'Tables created successfully!' AS status;
