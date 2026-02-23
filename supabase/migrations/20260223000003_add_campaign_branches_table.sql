-- ============================================================================
-- ADD CAMPAIGN_BRANCHES JUNCTION TABLE FOR MULTI-LOCATION CAMPAIGNS
-- Version: 1.0.0
-- Date: 2026-02-23
-- Description: Allow campaigns to be associated with multiple branches
-- ============================================================================

-- Create junction table for campaign-branch relationships
CREATE TABLE IF NOT EXISTS public.campaign_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.dental_campaigns(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure each campaign-branch combination is unique
  CONSTRAINT campaign_branches_unique UNIQUE (campaign_id, branch_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_branches_campaign_id ON public.campaign_branches(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_branches_branch_id ON public.campaign_branches(branch_id);

-- Enable Row Level Security
ALTER TABLE public.campaign_branches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to read campaign_branches for campaigns they have access to
DROP POLICY IF EXISTS "Allow authenticated read access on campaign_branches" ON public.campaign_branches;
CREATE POLICY "Allow authenticated read access on campaign_branches"
  ON public.campaign_branches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.dental_campaigns
      WHERE dental_campaigns.id = campaign_branches.campaign_id
      AND (
        dental_campaigns.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND branch_id = dental_campaigns.branch_id)
      )
    )
  );

-- Allow service role full access
DROP POLICY IF EXISTS "Allow service role full access on campaign_branches" ON public.campaign_branches;
CREATE POLICY "Allow service role full access on campaign_branches"
  ON public.campaign_branches
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.campaign_branches IS 'Junction table linking campaigns to multiple branches for multi-location campaigns';
COMMENT ON COLUMN public.campaign_branches.is_primary IS 'Indicates the primary branch for this campaign (used for backward compatibility)';
