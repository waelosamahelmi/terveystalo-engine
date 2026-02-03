-- ============================================================================
-- Create brand_assets table for tracking uploaded brand files
-- ============================================================================
-- NOTE: Storage bucket policies must be configured in Supabase Dashboard:
-- 1. Go to Storage > media bucket > Policies
-- 2. Add INSERT policy for authenticated users: (auth.role() = 'authenticated')
-- 3. Add SELECT policy for public: true
-- 4. Add DELETE policy for authenticated users: (auth.role() = 'authenticated')
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL UNIQUE, -- 'logo', 'favicon', 'image', 'font'
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated read brand_assets" ON brand_assets;
DROP POLICY IF EXISTS "Allow authenticated insert brand_assets" ON brand_assets;
DROP POLICY IF EXISTS "Allow authenticated update brand_assets" ON brand_assets;
DROP POLICY IF EXISTS "Allow authenticated delete brand_assets" ON brand_assets;

-- Allow authenticated users to read brand assets
CREATE POLICY "Allow authenticated read brand_assets"
ON brand_assets FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert brand assets
CREATE POLICY "Allow authenticated insert brand_assets"
ON brand_assets FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update brand assets
CREATE POLICY "Allow authenticated update brand_assets"
ON brand_assets FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete brand assets
CREATE POLICY "Allow authenticated delete brand_assets"
ON brand_assets FOR DELETE
TO authenticated
USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_brand_assets_type ON brand_assets(type);
CREATE INDEX IF NOT EXISTS idx_brand_assets_created_at ON brand_assets(created_at DESC);
