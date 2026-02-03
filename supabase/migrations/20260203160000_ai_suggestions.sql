-- ============================================================================
-- SUUN TERVEYSTALO - AI SUGGESTIONS TABLE
-- Version: 1.0.0
-- Date: 2026-02-03
-- Description: Store AI-generated dashboard suggestions with auto-refresh support
-- ============================================================================

-- ============================================================================
-- AI SUGGESTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Suggestion content
    type TEXT CHECK (type IN ('optimization', 'opportunity', 'warning', 'success')) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    action TEXT,
    action_url TEXT,
    
    -- Context/metadata
    priority INT DEFAULT 0,
    context_data JSONB DEFAULT '{}',
    
    -- Status tracking
    is_active BOOLEAN DEFAULT true,
    is_dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    dismissed_by UUID REFERENCES auth.users(id),
    
    -- Generation tracking
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by TEXT DEFAULT 'auto', -- 'auto' or 'manual'
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '12 hours'),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active suggestions
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_active ON ai_suggestions(is_active, is_dismissed, expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_generated ON ai_suggestions(generated_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS ai_suggestions_updated_at ON ai_suggestions;
CREATE TRIGGER ai_suggestions_updated_at
    BEFORE UPDATE ON ai_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_timestamp();

-- ============================================================================
-- AI SUGGESTIONS GENERATION LOG
-- Track when suggestions were generated
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_suggestions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Generation info
    generation_type TEXT CHECK (generation_type IN ('auto', 'manual')) DEFAULT 'auto',
    triggered_by UUID REFERENCES auth.users(id),
    
    -- Stats snapshot at generation time
    stats_snapshot JSONB DEFAULT '{}',
    
    -- Results
    suggestions_count INT DEFAULT 0,
    generation_duration_ms INT,
    error_message TEXT,
    success BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_log_created ON ai_suggestions_log(created_at DESC);

-- ============================================================================
-- VIEW FOR ACTIVE SUGGESTIONS
-- ============================================================================
DROP VIEW IF EXISTS active_ai_suggestions;
CREATE VIEW active_ai_suggestions AS
SELECT 
    id,
    type,
    title,
    description,
    action,
    action_url,
    priority,
    generated_at,
    generated_by,
    expires_at,
    CASE 
        WHEN expires_at < NOW() THEN true 
        ELSE false 
    END as is_expired,
    EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600 as hours_until_expiry
FROM ai_suggestions
WHERE is_active = true 
  AND is_dismissed = false
ORDER BY priority DESC, generated_at DESC;

-- ============================================================================
-- FUNCTION: Check if suggestions need refresh
-- Returns true if suggestions are expired or missing
-- ============================================================================
CREATE OR REPLACE FUNCTION should_refresh_ai_suggestions()
RETURNS BOOLEAN AS $$
DECLARE
    latest_generation TIMESTAMPTZ;
    suggestion_count INT;
BEGIN
    -- Get the latest generation time
    SELECT MAX(generated_at) INTO latest_generation
    FROM ai_suggestions
    WHERE is_active = true AND is_dismissed = false;
    
    -- Count active non-expired suggestions
    SELECT COUNT(*) INTO suggestion_count
    FROM ai_suggestions
    WHERE is_active = true 
      AND is_dismissed = false 
      AND expires_at > NOW();
    
    -- Return true if:
    -- 1. No suggestions exist
    -- 2. Less than 3 active suggestions
    -- 3. Latest generation was more than 12 hours ago
    RETURN (
        latest_generation IS NULL 
        OR suggestion_count < 3
        OR latest_generation < NOW() - INTERVAL '12 hours'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Get suggestion refresh status
-- Returns info about current suggestion state
-- ============================================================================
CREATE OR REPLACE FUNCTION get_ai_suggestions_status()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    latest_gen TIMESTAMPTZ;
    active_count INT;
    expired_count INT;
    next_refresh TIMESTAMPTZ;
BEGIN
    -- Get latest generation time
    SELECT MAX(generated_at) INTO latest_gen
    FROM ai_suggestions
    WHERE is_active = true;
    
    -- Count active suggestions
    SELECT COUNT(*) INTO active_count
    FROM ai_suggestions
    WHERE is_active = true 
      AND is_dismissed = false 
      AND expires_at > NOW();
    
    -- Count expired suggestions
    SELECT COUNT(*) INTO expired_count
    FROM ai_suggestions
    WHERE is_active = true 
      AND is_dismissed = false 
      AND expires_at <= NOW();
    
    -- Calculate next refresh time
    next_refresh := COALESCE(latest_gen, NOW()) + INTERVAL '12 hours';
    
    result := jsonb_build_object(
        'lastGenerated', latest_gen,
        'activeCount', active_count,
        'expiredCount', expired_count,
        'nextRefresh', next_refresh,
        'shouldRefresh', should_refresh_ai_suggestions(),
        'hoursUntilRefresh', EXTRACT(EPOCH FROM (next_refresh - NOW())) / 3600
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Mark old suggestions as inactive before new generation
-- ============================================================================
CREATE OR REPLACE FUNCTION deactivate_old_ai_suggestions()
RETURNS void AS $$
BEGIN
    UPDATE ai_suggestions
    SET is_active = false,
        updated_at = NOW()
    WHERE is_active = true
      AND (expires_at < NOW() OR generated_at < NOW() - INTERVAL '24 hours');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions_log ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read suggestions
DROP POLICY IF EXISTS "Anyone can read suggestions" ON ai_suggestions;
CREATE POLICY "Anyone can read suggestions" ON ai_suggestions 
    FOR SELECT TO authenticated USING (true);

-- Only admins/managers can insert/update/delete suggestions
DROP POLICY IF EXISTS "Admins can manage suggestions" ON ai_suggestions;
CREATE POLICY "Admins can manage suggestions" ON ai_suggestions 
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- Service role can do everything (for automated generation)
DROP POLICY IF EXISTS "Service role full access suggestions" ON ai_suggestions;
CREATE POLICY "Service role full access suggestions" ON ai_suggestions 
    FOR ALL TO service_role USING (true);

-- Log policies
DROP POLICY IF EXISTS "Anyone can read suggestion log" ON ai_suggestions_log;
CREATE POLICY "Anyone can read suggestion log" ON ai_suggestions_log 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert log" ON ai_suggestions_log;
CREATE POLICY "Admins can insert log" ON ai_suggestions_log 
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT ON active_ai_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION should_refresh_ai_suggestions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_suggestions_status() TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_old_ai_suggestions() TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
