-- ============================================================================
-- SUUN TERVEYSTALO - Slack Integration
-- Slack webhook and notification settings
-- ============================================================================

-- Slack integration settings table
CREATE TABLE IF NOT EXISTS slack_integration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url TEXT NOT NULL,
  channel_name TEXT NOT NULL DEFAULT '#general',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Slack notification preferences
CREATE TABLE IF NOT EXISTS slack_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_integration_id UUID REFERENCES slack_integration(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slack_integration_id, notification_type)
);

-- Default notification types
-- Types: campaign_created, campaign_started, campaign_paused, campaign_completed,
--        budget_warning, budget_depleted, performance_alert, weekly_summary,
--        system_error, new_user, ai_insight

-- Insert default slack settings if none exist
INSERT INTO slack_integration (webhook_url, channel_name, is_enabled)
VALUES ('', '#marketing', false)
ON CONFLICT DO NOTHING;

-- Create function to get the primary slack integration
CREATE OR REPLACE FUNCTION get_slack_integration()
RETURNS TABLE (
  id UUID,
  webhook_url TEXT,
  channel_name TEXT,
  is_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT si.id, si.webhook_url, si.channel_name, si.is_enabled
  FROM slack_integration si
  ORDER BY si.created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to send slack notification (placeholder - actual sending done in app)
CREATE OR REPLACE FUNCTION log_slack_notification(
  p_notification_type TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO activity_log (
    action,
    entity_type,
    details
  ) VALUES (
    'slack_notification',
    'notification',
    jsonb_build_object(
      'type', p_notification_type,
      'message', p_message,
      'metadata', p_metadata,
      'sent_at', NOW()
    )
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE slack_integration ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_notification_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write slack settings
CREATE POLICY "Allow authenticated access to slack_integration"
  ON slack_integration
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated access to slack_notification_settings"
  ON slack_notification_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_slack_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER slack_integration_updated_at
  BEFORE UPDATE ON slack_integration
  FOR EACH ROW
  EXECUTE FUNCTION update_slack_updated_at();

CREATE TRIGGER slack_notification_settings_updated_at
  BEFORE UPDATE ON slack_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_slack_updated_at();
