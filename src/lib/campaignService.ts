// ============================================================================
// SUUN TERVEYSTALO - Campaign Service
// Handles all campaign operations
// ============================================================================

import { supabase } from './supabase';
import { sendSlackNotification } from './slackService';
import { updateBranchUsedBudget } from './branchService';
import {
  addDentalCampaignToSheet,
  updateDentalCampaignInSheet,
  updateDentalCampaignStatusInSheet,
  deleteCampaignFromSheet,
} from './googleSheets';
import type {
  DentalCampaign,
  CampaignFormData,
  CampaignFilters,
  CampaignStatus,
  CampaignSummary
} from '../types';

/**
 * Get all campaigns with optional filters
 */
export async function getCampaigns(filters?: CampaignFilters): Promise<DentalCampaign[]> {
  let query = supabase
    .from('dental_campaigns')
    .select(`
      *,
      service:services(*),
      branch:branches(*),
      creatives(*)
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }
  
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }
  
  if (filters?.branch_id) {
    query = query.eq('branch_id', filters.branch_id);
  }
  
  if (filters?.service_id) {
    query = query.eq('service_id', filters.service_id);
  }
  
  if (filters?.date_from) {
    query = query.gte('start_date', filters.date_from);
  }
  
  if (filters?.date_to) {
    query = query.lte('start_date', filters.date_to);
  }
  
  if (filters?.created_by) {
    query = query.eq('created_by', filters.created_by);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch campaigns:', error);
    return [];
  }

  return data || [];
}

/**
 * Get campaign by ID
 */
export async function getCampaignById(id: string): Promise<DentalCampaign | null> {
  const { data, error } = await supabase
    .from('dental_campaigns')
    .select(`
      *,
      service:services(*),
      branch:branches(*),
      creatives(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to fetch campaign:', error);
    return null;
  }

  return data;
}

/**
 * Get campaign summary view
 */
export async function getCampaignSummaries(): Promise<CampaignSummary[]> {
  const { data, error } = await supabase
    .from('campaign_summary')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch campaign summaries:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a new campaign
 */
export async function createCampaign(
  formData: CampaignFormData, 
  userId: string
): Promise<DentalCampaign | null> {
  // Calculate daily budgets
  const startDate = new Date(formData.start_date);
  const endDate = new Date(formData.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

  const campaignData = {
    name: formData.name,
    description: formData.description,
    service_id: formData.service_id,
    branch_id: formData.branch_id,

    campaign_address: formData.campaign_address,
    campaign_postal_code: formData.campaign_postal_code,
    campaign_city: formData.campaign_city,
    campaign_radius: formData.campaign_radius,
    campaign_coordinates: formData.campaign_coordinates,

    start_date: formData.start_date,
    end_date: formData.is_ongoing ? null : formData.end_date,
    campaign_start_date: formData.start_date,
    campaign_end_date: formData.is_ongoing ? 'ONGOING' : formData.end_date,
    is_ongoing: formData.is_ongoing || false,

    total_budget: formData.total_budget,
    budget_meta: formData.budget_meta,
    budget_display: formData.budget_display,
    budget_pdooh: formData.budget_pdooh,
    budget_audio: formData.budget_audio,

    budget_meta_daily: formData.budget_meta / days,
    budget_display_daily: formData.budget_display / days,
    budget_pdooh_daily: formData.budget_pdooh / days,
    budget_audio_daily: formData.budget_audio / days,

    channel_meta: formData.channel_meta,
    channel_display: formData.channel_display,
    channel_pdooh: formData.channel_pdooh,
    channel_audio: formData.channel_audio,

    creative_type: formData.creative_type,

    // Creative content fields
    headline: formData.headline || null,
    subheadline: formData.subheadline || null,
    offer_text: formData.offer_text || null,
    cta_text: formData.cta_text || null,
    landing_url: formData.landing_url || 'https://terveystalo.com/suunterveystalo',
    general_brand_message: formData.general_brand_message || null,

    // New fields for campaign redesign
    ad_type: formData.ad_type,
    include_pricing: formData.include_pricing,
    target_age_min: formData.target_age_min,
    target_age_max: formData.target_age_max,
    target_genders: formData.target_genders,
    campaign_objective: formData.campaign_objective || 'traffic',

    status: 'draft' as CampaignStatus,
    created_by: userId
  };

  const { data, error } = await supabase
    .from('dental_campaigns')
    .insert(campaignData)
    .select(`
      *,
      service:services(*),
      branch:branches(*)
    `)
    .single();

  if (error) {
    console.error('Failed to create campaign:', error);
    return null;
  }

  // Update branch used budget after successful campaign creation
  if (formData.branch_id && formData.total_budget > 0) {
    updateBranchUsedBudget(formData.branch_id, formData.total_budget)
      .catch(err => console.error('Failed to update branch budget:', err));
  }

  // Send Slack notification for campaign creation
  if (data) {
    sendSlackNotification(
      'campaign_created',
      `Uusi kampanja luotu: ${data.name}`,
      `Kampanja *${data.name}* on luotu ja odottaa aktivointia.`,
      {
        'Kampanja': data.name,
        'Budjetti': `€${data.total_budget}`,
        'Alkaa': data.start_date,
        'Päättyy': data.end_date
      }
    ).catch(() => {}); // Fire and forget

    // Sync to Google Sheets master feed (fire and forget)
    addDentalCampaignToSheet(data)
      .then(ok => {
        if (!ok) console.warn('Sheet sync returned false for campaign', data.id);
      })
      .catch(e => console.error('Google Sheets sync failed (non-blocking):', e));
  }

  return data;
}

/**
 * Update a campaign
 */
export async function updateCampaign(
  id: string, 
  updates: Partial<DentalCampaign>
): Promise<DentalCampaign | null> {
  const { data, error } = await supabase
    .from('dental_campaigns')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      service:services(*),
      branch:branches(*)
    `)
    .single();

  if (error) {
    console.error('Failed to update campaign:', error);
    return null;
  }

  // Sync updated data to Google Sheets (fire and forget)
  if (data) {
    updateDentalCampaignInSheet(data)
      .catch(e => console.error('Google Sheets update sync failed (non-blocking):', e));
  }

  return data;
}

/**
 * Update campaign status
 */
export async function updateCampaignStatus(
  id: string, 
  status: CampaignStatus
): Promise<boolean> {
  // Get campaign name for notification
  const { data: campaign } = await supabase
    .from('dental_campaigns')
    .select('name, total_budget')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('dental_campaigns')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Failed to update campaign status:', error);
    return false;
  }

  // Sync status change to Google Sheets (fire and forget)
  updateDentalCampaignStatusInSheet(id, status)
    .catch(e => console.error('Google Sheets status sync failed (non-blocking):', e));

  // Send Slack notification for status change
  if (campaign) {
    const statusMessages: Record<CampaignStatus, { type: 'campaign_started' | 'campaign_paused' | 'campaign_completed'; title: string; message: string } | null> = {
      'active': {
        type: 'campaign_started',
        title: `Kampanja käynnistynyt: ${campaign.name}`,
        message: `Kampanja *${campaign.name}* on nyt aktiivinen ja mainokset näkyvät.`
      },
      'paused': {
        type: 'campaign_paused',
        title: `Kampanja keskeytetty: ${campaign.name}`,
        message: `Kampanja *${campaign.name}* on keskeytetty.`
      },
      'completed': {
        type: 'campaign_completed',
        title: `Kampanja päättynyt: ${campaign.name}`,
        message: `Kampanja *${campaign.name}* on päättynyt.`
      },
      'draft': null,
      'pending': null,
      'cancelled': null
    };

    const notification = statusMessages[status];
    if (notification) {
      sendSlackNotification(
        notification.type,
        notification.title,
        notification.message,
        {
          'Kampanja': campaign.name,
          'Tila': status,
          'Budjetti': `€${campaign.total_budget}`
        }
      ).catch(() => {}); // Fire and forget
    }
  }

  return true;
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string): Promise<boolean> {
  // Pause BidTheatre campaigns first to avoid orphaned running campaigns
  try {
    await fetch('/.netlify/functions/pauseBidTheatreCampaign-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: id })
    });
  } catch (error) {
    console.error('Failed to pause BT campaigns before delete (non-blocking):', error);
  }

  // Delete from Google Sheets (while campaign still exists in DB for lookup)
  deleteCampaignFromSheet(id)
    .catch(e => console.error('Google Sheets delete sync failed (non-blocking):', e));

  const { error } = await supabase
    .from('dental_campaigns')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete campaign:', error);
    return false;
  }

  return true;
}

/**
 * Launch a campaign (change status to active and trigger integrations)
 */
export async function launchCampaign(id: string): Promise<boolean> {
  // First update status to pending
  const success = await updateCampaignStatus(id, 'pending');
  
  if (!success) {
    return false;
  }

  // Fetch full campaign data — the create background function expects the full campaign object
  const { data: campaignData, error: fetchError } = await supabase
    .from('dental_campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !campaignData) {
    console.error('Failed to fetch campaign for BT launch:', fetchError);
    await updateCampaignStatus(id, 'draft');
    return false;
  }

  // Trigger background function for BidTheatre sync
  try {
    const response = await fetch('/.netlify/functions/createBidTheatreCampaign-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignData)
    });

    if (!response.ok) {
      console.error('Failed to trigger campaign creation');
      await updateCampaignStatus(id, 'draft');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to launch campaign:', error);
    await updateCampaignStatus(id, 'draft');
    return false;
  }
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(id: string): Promise<boolean> {
  const success = await updateCampaignStatus(id, 'paused');
  
  if (!success) {
    return false;
  }

  // Trigger background function for BidTheatre pause
  try {
    await fetch('/.netlify/functions/pauseBidTheatreCampaign-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: id })
    });

    return true;
  } catch (error) {
    console.error('Failed to pause campaign:', error);
    return false;
  }
}

/**
 * Resume a paused campaign
 */
export async function resumeCampaign(id: string): Promise<boolean> {
  const success = await updateCampaignStatus(id, 'active');
  
  if (!success) {
    return false;
  }

  // Fetch full campaign data to send to BidTheatre for re-activation
  const { data: campaignData, error: fetchError } = await supabase
    .from('dental_campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !campaignData) {
    console.error('Failed to fetch campaign for BT resume:', fetchError);
    // Status already updated — BT re-activation failed but Supabase is correct
    return true;
  }

  // If campaign has BT IDs, trigger update to re-activate cycles
  if (campaignData.display_bt_id || campaignData.pdooh_bt_id) {
    try {
      await fetch('/.netlify/functions/createBidTheatreCampaign-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...campaignData, is_update: true })
      });
    } catch (error) {
      console.error('Failed to resume BT campaign:', error);
      // Non-blocking — Supabase status is already active
    }
  }

  return true;
}

/**
 * Get campaign statistics
 */
export async function getCampaignStats(): Promise<{
  total: number;
  active: number;
  paused: number;
  draft: number;
  completed: number;
  totalBudget: number;
  totalSpend: number;
}> {
  const { data, error } = await supabase
    .from('dental_campaigns')
    .select('status, total_budget');

  if (error) {
    console.error('Failed to fetch campaign stats:', error);
    return {
      total: 0,
      active: 0,
      paused: 0,
      draft: 0,
      completed: 0,
      totalBudget: 0,
      totalSpend: 0
    };
  }

  const stats = {
    total: data?.length || 0,
    active: data?.filter(c => c.status === 'active').length || 0,
    paused: data?.filter(c => c.status === 'paused').length || 0,
    draft: data?.filter(c => c.status === 'draft').length || 0,
    completed: data?.filter(c => c.status === 'completed').length || 0,
    totalBudget: data?.reduce((sum, c) => sum + (c.total_budget || 0), 0) || 0,
    totalSpend: 0 // Will be calculated from analytics
  };

  return stats;
}

/**
 * Get campaigns by branch
 */
export async function getCampaignsByBranch(branchId: string): Promise<DentalCampaign[]> {
  const { data, error } = await supabase
    .from('dental_campaigns')
    .select(`
      *,
      service:services(*),
      branch:branches(*)
    `)
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch campaigns by branch:', error);
    return [];
  }

  return data || [];
}

/**
 * Duplicate a campaign
 */
export async function duplicateCampaign(
  id: string, 
  userId: string
): Promise<DentalCampaign | null> {
  const original = await getCampaignById(id);
  
  if (!original) {
    return null;
  }

  const { 
    id: _id, 
    created_at: _created, 
    updated_at: _updated,
    bt_campaign_id: _btId,
    bt_sync_status: _syncStatus,
    bt_last_sync: _lastSync,
    bt_sync_error: _syncError,
    creatives: _creatives,
    service: _service,
    branch: _branch,
    ...campaignData 
  } = original;

  const newCampaign = {
    ...campaignData,
    name: `${original.name} (Copy)`,
    status: 'draft' as CampaignStatus,
    created_by: userId
  };

  const { data, error } = await supabase
    .from('dental_campaigns')
    .insert(newCampaign)
    .select(`
      *,
      service:services(*),
      branch:branches(*)
    `)
    .single();

  if (error) {
    console.error('Failed to duplicate campaign:', error);
    return null;
  }

  // Sync duplicated campaign to Google Sheets (fire and forget)
  if (data) {
    addDentalCampaignToSheet(data)
      .catch(e => console.error('Google Sheets sync for duplicate failed (non-blocking):', e));
  }

  return data;
}
