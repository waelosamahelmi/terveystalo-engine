-- ============================================================================
-- SUUN TERVEYSTALO - Branch Budgets & Campaign Enhancements
-- Version: 1.0.0
-- Date: 2026-02-12
-- Description: Adds branch budget tracking and campaign audience targeting
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. BRANCH BUDGETS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS branch_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,

    -- Budget allocations
    allocated_budget DECIMAL(10,2) DEFAULT 0,
    used_budget DECIMAL(10,2) DEFAULT 0,

    -- Budget period (monthly tracking)
    period_start DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
    period_end DATE DEFAULT (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'),

    -- Metadata
    notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(branch_id, period_start)
);

-- Create index for branch lookups
CREATE INDEX IF NOT EXISTS idx_branch_budgets_branch ON branch_budgets(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_budgets_period ON branch_budgets(period_start);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_branch_budgets_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS branch_budgets_updated_at ON branch_budgets;
CREATE TRIGGER branch_budgets_updated_at
    BEFORE UPDATE ON branch_budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_branch_budgets_timestamp();

-- ============================================================================
-- 2. ADD COLUMNS TO dental_campaigns
-- ============================================================================

-- Ad type selection (nationwide, local, or both)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dental_campaigns' AND column_name = 'ad_type'
    ) THEN
        ALTER TABLE dental_campaigns
        ADD COLUMN ad_type TEXT CHECK (ad_type IN ('nationwide', 'local', 'both'));
    END IF;
END $$;

-- Include pricing option (yes, no, or both)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dental_campaigns' AND column_name = 'include_pricing'
    ) THEN
        ALTER TABLE dental_campaigns
        ADD COLUMN include_pricing TEXT CHECK (include_pricing IN ('yes', 'no', 'both'));
    END IF;
END $$;

-- Target age minimum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dental_campaigns' AND column_name = 'target_age_min'
    ) THEN
        ALTER TABLE dental_campaigns
        ADD COLUMN target_age_min INT DEFAULT 18;
    END IF;
END $$;

-- Target age maximum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dental_campaigns' AND column_name = 'target_age_max'
    ) THEN
        ALTER TABLE dental_campaigns
        ADD COLUMN target_age_max INT DEFAULT 80;
    END IF;
END $$;

-- Target genders (array: all, male, female, other)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dental_campaigns' AND column_name = 'target_genders'
    ) THEN
        ALTER TABLE dental_campaigns
        ADD COLUMN target_genders TEXT[] DEFAULT ARRAY['all'];
    END IF;
END $$;

-- ============================================================================
-- 3. UPDATE BRANCHES TABLE WITH CREATIVE TYPES
-- ============================================================================

-- Add creative_types field to features JSONB if not present
-- This will be populated by the next migration

-- ============================================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE branch_budgets ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read branch budgets
DROP POLICY IF EXISTS "Authenticated can read branch budgets" ON branch_budgets;
CREATE POLICY "Authenticated can read branch budgets" ON branch_budgets
    FOR SELECT TO authenticated
    USING (true);

-- Admins and managers can manage branch budgets
DROP POLICY IF EXISTS "Admins and managers can manage branch budgets" ON branch_budgets;
CREATE POLICY "Admins and managers can manage branch budgets" ON branch_budgets
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to get available budget for a branch
CREATE OR REPLACE FUNCTION get_branch_available_budget(p_branch_id UUID, p_period_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_allocated DECIMAL(10,2);
    v_used DECIMAL(10,2);
BEGIN
    SELECT COALESCE(allocated_budget, 0), COALESCE(used_budget, 0)
    INTO v_allocated, v_used
    FROM branch_budgets
    WHERE branch_id = p_branch_id
    AND period_start = DATE_TRUNC('month', p_period_date);

    RETURN COALESCE(v_allocated, 0) - COALESCE(v_used, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update used budget when campaign is created
CREATE OR REPLACE FUNCTION update_branch_used_budget(
    p_branch_id UUID,
    p_budget_amount DECIMAL(10,2)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_budget_id UUID;
BEGIN
    -- Get or create budget record for current period
    SELECT id INTO v_budget_id
    FROM branch_budgets
    WHERE branch_id = p_branch_id
    AND period_start = DATE_TRUNC('month', CURRENT_DATE);

    IF v_budget_id IS NULL THEN
        -- Create new budget record with zero allocation
        INSERT INTO branch_budgets (branch_id, allocated_budget, used_budget, period_start)
        VALUES (p_branch_id, 0, p_budget_amount, DATE_TRUNC('month', CURRENT_DATE))
        RETURNING id INTO v_budget_id;
    ELSE
        -- Update used budget
        UPDATE branch_budgets
        SET used_budget = used_budget + p_budget_amount
        WHERE id = v_budget_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. BUDGET PRESETS IN APP SETTINGS
-- ============================================================================

-- Insert budget preset amounts (weekly amounts from user's budget table)
INSERT INTO app_settings (key, value, category, description) VALUES
('budget_presets', '[84, 168, 337, 505, 672, 842]', 'campaigns', 'Fixed budget amounts for campaign allocation (€)')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Branch budgets and campaign enhancements migration completed at %', NOW();
END $$;
