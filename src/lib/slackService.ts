// ============================================================================
// SUUN TERVEYSTALO - Slack Service
// Handles Slack webhook integration and notifications
// ============================================================================

import { supabase } from './supabase';

// Notification types available for Slack
export const SLACK_NOTIFICATION_TYPES = {
  campaign_created: {
    id: 'campaign_created',
    label: 'Kampanja luotu',
    description: 'Ilmoitus kun uusi kampanja luodaan',
    emoji: '🚀',
    category: 'campaigns'
  },
  campaign_started: {
    id: 'campaign_started',
    label: 'Kampanja käynnistynyt',
    description: 'Ilmoitus kun kampanja aktivoituu',
    emoji: '▶️',
    category: 'campaigns'
  },
  campaign_paused: {
    id: 'campaign_paused',
    label: 'Kampanja keskeytetty',
    description: 'Ilmoitus kun kampanja pysäytetään',
    emoji: '⏸️',
    category: 'campaigns'
  },
  campaign_completed: {
    id: 'campaign_completed',
    label: 'Kampanja päättynyt',
    description: 'Ilmoitus kun kampanja päättyy',
    emoji: '✅',
    category: 'campaigns'
  },
  budget_warning: {
    id: 'budget_warning',
    label: 'Budjettivaroitus',
    description: 'Ilmoitus kun budjetti on lähes käytetty (80%)',
    emoji: '⚠️',
    category: 'budget'
  },
  budget_depleted: {
    id: 'budget_depleted',
    label: 'Budjetti loppunut',
    description: 'Ilmoitus kun budjetti on käytetty kokonaan',
    emoji: '🔴',
    category: 'budget'
  },
  performance_alert: {
    id: 'performance_alert',
    label: 'Suorituskykyhälytys',
    description: 'Ilmoitus merkittävistä suorituskykymuutoksista',
    emoji: '📊',
    category: 'performance'
  },
  weekly_summary: {
    id: 'weekly_summary',
    label: 'Viikkoraportti',
    description: 'Automaattinen viikottainen yhteenveto',
    emoji: '📈',
    category: 'reports'
  },
  daily_summary: {
    id: 'daily_summary',
    label: 'Päiväraportti',
    description: 'Automaattinen päivittäinen yhteenveto',
    emoji: '📅',
    category: 'reports'
  },
  system_error: {
    id: 'system_error',
    label: 'Järjestelmävirhe',
    description: 'Ilmoitus kriittisistä virheistä',
    emoji: '🚨',
    category: 'system'
  },
  new_user: {
    id: 'new_user',
    label: 'Uusi käyttäjä',
    description: 'Ilmoitus kun uusi käyttäjä rekisteröityy',
    emoji: '👤',
    category: 'users'
  },
  ai_insight: {
    id: 'ai_insight',
    label: 'AI-oivallus',
    description: 'Ilmoitus tärkeistä AI-analyyseistä',
    emoji: '🤖',
    category: 'ai'
  }
} as const;

export type SlackNotificationType = keyof typeof SLACK_NOTIFICATION_TYPES;

export interface SlackIntegration {
  id: string;
  webhook_url: string;
  channel_name: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlackNotificationSetting {
  id: string;
  slack_integration_id: string;
  notification_type: SlackNotificationType;
  is_enabled: boolean;
}

/**
 * Get the Slack integration settings
 */
export async function getSlackIntegration(): Promise<SlackIntegration | null> {
  const { data, error } = await supabase
    .from('slack_integration')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    // Table might not exist yet
    if (error.code === '42P01' || error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching Slack integration:', error);
    return null;
  }

  return data;
}

/**
 * Save or update Slack integration settings
 */
export async function saveSlackIntegration(
  webhookUrl: string,
  channelName: string,
  isEnabled: boolean
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    // Check if integration exists
    const existing = await getSlackIntegration();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('slack_integration')
        .update({
          webhook_url: webhookUrl,
          channel_name: channelName,
          is_enabled: isEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) throw error;
      return { success: true, id: existing.id };
    } else {
      // Create new
      const { data, error } = await supabase
        .from('slack_integration')
        .insert({
          webhook_url: webhookUrl,
          channel_name: channelName,
          is_enabled: isEnabled
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, id: data.id };
    }
  } catch (error) {
    console.error('Error saving Slack integration:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get notification settings for Slack
 */
export async function getSlackNotificationSettings(
  integrationId: string
): Promise<Record<SlackNotificationType, boolean>> {
  const { data, error } = await supabase
    .from('slack_notification_settings')
    .select('notification_type, is_enabled')
    .eq('slack_integration_id', integrationId);

  if (error) {
    console.error('Error fetching notification settings:', error);
    return {} as Record<SlackNotificationType, boolean>;
  }

  // Build settings map with defaults
  const settings: Record<string, boolean> = {};
  
  // Set all defaults to false
  Object.keys(SLACK_NOTIFICATION_TYPES).forEach(type => {
    settings[type] = false;
  });

  // Override with saved settings
  data?.forEach(setting => {
    settings[setting.notification_type] = setting.is_enabled;
  });

  return settings as Record<SlackNotificationType, boolean>;
}

/**
 * Save notification settings for Slack
 */
export async function saveSlackNotificationSettings(
  integrationId: string,
  settings: Record<SlackNotificationType, boolean>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete existing settings
    await supabase
      .from('slack_notification_settings')
      .delete()
      .eq('slack_integration_id', integrationId);

    // Insert new settings
    const inserts = Object.entries(settings).map(([type, enabled]) => ({
      slack_integration_id: integrationId,
      notification_type: type,
      is_enabled: enabled
    }));

    const { error } = await supabase
      .from('slack_notification_settings')
      .insert(inserts);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error saving notification settings:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Test Slack webhook by sending a test message
 */
export async function testSlackWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const testMessage = {
      text: '🔔 *Suun Terveystalo - Testi-ilmoitus*',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔔 Suun Terveystalo',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Testi-ilmoitus onnistui!*\n\nSlack-integraatio on nyt yhdistetty ja toimii oikein.'
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Lähetetty: ${new Date().toLocaleString('fi-FI')}`
            }
          ]
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Webhook request failed');
    }

    return { success: true };
  } catch (error) {
    console.error('Slack webhook test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Webhook test failed' };
  }
}

/**
 * Send a notification to Slack
 */
export async function sendSlackNotification(
  type: SlackNotificationType,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get integration settings
    const integration = await getSlackIntegration();
    if (!integration || !integration.is_enabled || !integration.webhook_url) {
      return { success: false, error: 'Slack integration not enabled' };
    }

    // Check if this notification type is enabled
    const settings = await getSlackNotificationSettings(integration.id);
    if (!settings[type]) {
      return { success: false, error: 'Notification type not enabled' };
    }

    const notificationType = SLACK_NOTIFICATION_TYPES[type];
    
    const slackMessage = {
      text: `${notificationType.emoji} ${title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${notificationType.emoji} ${title}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message
          }
        },
        ...(metadata ? [{
          type: 'section',
          fields: Object.entries(metadata).slice(0, 10).map(([key, value]) => ({
            type: 'mrkdwn',
            text: `*${key}:*\n${value}`
          }))
        }] : []),
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `${notificationType.label} • ${new Date().toLocaleString('fi-FI')}`
            }
          ]
        }
      ]
    };

    const response = await fetch(integration.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage)
    });

    if (!response.ok) {
      throw new Error('Failed to send Slack notification');
    }

    // Log the notification (fire and forget)
    try {
      await supabase.rpc('log_slack_notification', {
        p_notification_type: type,
        p_message: message,
        p_metadata: metadata || {}
      });
    } catch {
      // Ignore if function doesn't exist
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
