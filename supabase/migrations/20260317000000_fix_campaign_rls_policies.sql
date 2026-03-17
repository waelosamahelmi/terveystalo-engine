-- Fix dental_campaigns RLS policies
-- The 20260203100000_missing_tables migration created an overly restrictive
-- "Admins can manage campaigns" FOR ALL policy that blocks partner users
-- from creating campaigns. This restores the correct granular policies.

-- Drop the overly restrictive policies
DROP POLICY IF EXISTS "Admins can manage campaigns" ON dental_campaigns;
DROP POLICY IF EXISTS "Campaigns are viewable by authenticated" ON dental_campaigns;

-- Drop any leftover granular policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read their campaigns" ON dental_campaigns;
DROP POLICY IF EXISTS "Users can create campaigns" ON dental_campaigns;
DROP POLICY IF EXISTS "Users can update their campaigns" ON dental_campaigns;

-- SELECT: Authenticated users can read campaigns they own, are admin/manager, or belong to same branch
CREATE POLICY "Users can read their campaigns" ON dental_campaigns FOR SELECT TO authenticated
    USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')) OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND branch_id = dental_campaigns.branch_id)
    );

-- INSERT: Admin, manager, and partner can create campaigns
CREATE POLICY "Users can create campaigns" ON dental_campaigns FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'partner'))
    );

-- UPDATE: Campaign owner or admin/manager can update
CREATE POLICY "Users can update their campaigns" ON dental_campaigns FOR UPDATE TO authenticated
    USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

-- DELETE: Only admin and manager can delete campaigns
CREATE POLICY "Admins can delete campaigns" ON dental_campaigns FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );
