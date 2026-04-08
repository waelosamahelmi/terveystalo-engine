// ============================================================================
// SUUN TERVEYSTALO - Meta Ads Service
// Handles Meta (Facebook) Ads API integration via Netlify functions
// ============================================================================

import { supabase } from './supabase';
import { getAppSetting } from './settingsService';

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string;
  stop_time?: string;
}

export interface MetaAdSetInsight {
  adset_id: string;
  adset_name: string;
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  frequency: number;
  ctr: number;
  cpc: number;
  cpm: number;
  link_clicks?: number;
  landing_page_views?: number;
  video_views?: number;
}

export interface MetaSyncResult {
  success: boolean;
  synced_rows?: number;
  rows?: number;
  campaigns_synced?: number;
  error?: string;
}

/**
 * Get Meta campaigns from the API
 */
export async function getMetaCampaigns(): Promise<MetaCampaign[] | null> {
  try {
    const response = await fetch('/.netlify/functions/meta-ads?action=campaigns');
    if (!response.ok) {
      throw new Error(`Meta API error: ${response.status}`);
    }
    const data = await response.json();
    return data.campaigns || data;
  } catch (error: any) {
    console.error('getMetaCampaigns error:', error);
    throw error;
  }
}

/**
 * Sync Meta analytics data into campaign_analytics table
 * Optionally filter by a specific campaign ID
 */
export async function syncMetaAnalytics(campaignId?: string): Promise<MetaSyncResult> {
  try {
    const params = new URLSearchParams({ action: 'sync' });
    if (campaignId) {
      params.set('campaign_id', campaignId);
    }
    const response = await fetch(`/.netlify/functions/meta-ads?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Meta sync error: ${response.status}`);
    }
    const data = await response.json();
    return {
      success: true,
      synced_rows: data.synced_rows ?? data.rows ?? 0,
      rows: data.rows ?? data.synced_rows ?? 0,
      campaigns_synced: data.campaigns_synced ?? 0,
    };
  } catch (error: any) {
    console.error('syncMetaAnalytics error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get Meta Ad Set level insights
 */
export async function getMetaAdSetInsights(campaignId?: string): Promise<MetaAdSetInsight[]> {
  try {
    const params = new URLSearchParams({ action: 'adset-insights' });
    if (campaignId) {
      params.set('campaign_id', campaignId);
    }
    const response = await fetch(`/.netlify/functions/meta-ads?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Meta API error: ${response.status}`);
    }
    const data = await response.json();
    return data.insights || data;
  } catch (error: any) {
    console.error('getMetaAdSetInsights error:', error);
    throw error;
  }
}
