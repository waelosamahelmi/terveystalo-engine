import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v20.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function getEnvVar(names: string[]): string {
  for (const name of names) {
    if (process.env[name]) return process.env[name] || '';
  }
  return '';
}

const SUPABASE_URL = getEnvVar(['SUPABASE_URL', 'VITE_SUPABASE_URL']);
const SUPABASE_SERVICE_ROLE_KEY = getEnvVar(['SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_SERVICE_ROLE_KEY']);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required env vars for Meta sync: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function parseSettingString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  let out = String(value).trim();
  if (!out) return '';

  // Some app_settings values are saved as JSON string literals, e.g. "\"act_123\""
  try {
    const parsed = JSON.parse(out);
    if (typeof parsed === 'string') out = parsed.trim();
    else if (parsed != null) out = String(parsed).trim();
  } catch {
    // keep as-is
  }

  if (
    (out.startsWith('"') && out.endsWith('"')) ||
    (out.startsWith("'") && out.endsWith("'"))
  ) {
    out = out.slice(1, -1).trim();
  }

  return out;
}

function num(value: unknown): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeText(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripBranchPrefixes(name: string): string {
  return (name || '')
    .replace(/^Suun\s+Terveystalo\s+/i, '')
    .replace(/^Terveystalo\s+/i, '')
    .trim();
}

function parseActions(actions: any[] | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of actions || []) {
    const key = item?.action_type;
    if (!key) continue;
    out[key] = (out[key] || 0) + num(item?.value);
  }
  return out;
}

async function getAppSettingsMap(keys: string[]): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', keys);

  if (error) throw new Error(`Failed to load app settings: ${error.message}`);

  const map: Record<string, any> = {};
  for (const row of data || []) {
    map[row.key] = row.value;
  }
  return map;
}

function buildGraphUrl(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `${GRAPH_BASE}/${path}?${search.toString()}`;
}

async function fetchGraphAll<T = any>(path: string, params: Record<string, string>): Promise<T[]> {
  let url = buildGraphUrl(path, params);
  const all: T[] = [];

  while (url) {
    const { data } = await axios.get(url, { timeout: 45000 });
    if (data?.error) {
      throw new Error(data.error.message || 'Meta Graph API error');
    }
    if (Array.isArray(data?.data)) {
      all.push(...(data.data as T[]));
    }
    url = data?.paging?.next || '';
  }

  return all;
}

function findMatchingMetaCampaign(engineCampaign: any, metaCampaigns: any[]): any | null {
  if (!metaCampaigns.length) return null;

  const existingMetaId = engineCampaign.meta_campaign_id ? String(engineCampaign.meta_campaign_id) : null;
  if (existingMetaId) {
    const exact = metaCampaigns.find((m: any) => String(m.id) === existingMetaId);
    if (exact) return exact;
  }

  const target = normalizeText(engineCampaign.name || '');
  if (!target) return null;

  let best: { score: number; item: any } | null = null;

  for (const mc of metaCampaigns) {
    const name = normalizeText(mc.name || '');
    if (!name) continue;

    let score = 0;
    if (name === target) score = 100;
    else if (name.includes(target) || target.includes(name)) score = 80;
    else {
      const targetTokens = new Set(target.split(' '));
      const nameTokens = new Set(name.split(' '));
      let overlap = 0;
      for (const token of targetTokens) {
        if (token.length <= 2) continue;
        if (nameTokens.has(token)) overlap++;
      }
      score = overlap * 10;
    }

    if (!best || score > best.score) {
      best = { score, item: mc };
    }
  }

  return best && best.score >= 20 ? best.item : null;
}

function buildBranchAliases(branch: any): string[] {
  const aliases = new Set<string>();
  const baseName = stripBranchPrefixes(branch.name || '');
  if (baseName) aliases.add(normalizeText(baseName));
  if (branch.name) aliases.add(normalizeText(branch.name));
  if (branch.city) aliases.add(normalizeText(branch.city));
  return Array.from(aliases).filter(Boolean).sort((a, b) => b.length - a.length);
}

function matchBranchFromAdSetName(adSetName: string, branchesWithAliases: Array<{ id: string; aliases: string[] }>): string | null {
  const normalized = normalizeText(adSetName);
  if (!normalized) return null;

  let best: { score: number; branchId: string } | null = null;

  for (const branch of branchesWithAliases) {
    for (const alias of branch.aliases) {
      if (!alias || alias.length < 3) continue;
      if (!normalized.includes(alias)) continue;

      const score = alias.length;
      if (!best || score > best.score) {
        best = { score, branchId: branch.id };
      }
    }
  }

  return best?.branchId || null;
}

export async function listMetaCampaignsFromSettings(): Promise<any[]> {
  const settings = await getAppSettingsMap(['meta_ad_account_id', 'meta_access_token']);
  const adAccountId = parseSettingString(settings.meta_ad_account_id);
  const accessToken = parseSettingString(settings.meta_access_token);

  if (!adAccountId || !accessToken) {
    throw new Error('Meta settings missing: meta_ad_account_id / meta_access_token');
  }

  return fetchGraphAll(`${adAccountId}/campaigns`, {
    fields: 'id,name,status,objective,start_time,stop_time',
    limit: '200',
    access_token: accessToken,
  });
}

export async function listMetaAdSetInsights(campaignId?: string): Promise<any[]> {
  const settings = await getAppSettingsMap(['meta_ad_account_id', 'meta_access_token']);
  const adAccountId = parseSettingString(settings.meta_ad_account_id);
  const accessToken = parseSettingString(settings.meta_access_token);

  if (!adAccountId || !accessToken) {
    throw new Error('Meta settings missing: meta_ad_account_id / meta_access_token');
  }

  let targetMetaCampaignIds: string[] = [];

  if (campaignId) {
    const { data: engineCampaign } = await supabase
      .from('dental_campaigns')
      .select('id,name,meta_campaign_id')
      .eq('id', campaignId)
      .single();

    const campaigns = await listMetaCampaignsFromSettings();
    const matched = engineCampaign ? findMatchingMetaCampaign(engineCampaign, campaigns) : null;
    if (matched?.id) targetMetaCampaignIds = [String(matched.id)];
  }

  if (!targetMetaCampaignIds.length) {
    const campaigns = await fetchGraphAll<any>(`${adAccountId}/campaigns`, {
      fields: 'id',
      limit: '50',
      access_token: accessToken,
    });
    targetMetaCampaignIds = campaigns.map((c) => String(c.id));
  }

  const insights: any[] = [];

  for (const metaCampaignId of targetMetaCampaignIds) {
    const adsets = await fetchGraphAll<any>(`${metaCampaignId}/adsets`, {
      fields: 'id,name,status',
      limit: '200',
      access_token: accessToken,
    });

    for (const adset of adsets) {
      const rows = await fetchGraphAll<any>(`${adset.id}/insights`, {
        fields: 'adset_id,adset_name,impressions,clicks,spend,reach,frequency,ctr,cpc,cpm,actions,video_play_actions',
        date_preset: 'last_30d',
        limit: '100',
        access_token: accessToken,
      });

      const row = rows[0];
      if (!row) continue;
      const actions = parseActions(row.actions);
      insights.push({
        adset_id: row.adset_id || adset.id,
        adset_name: row.adset_name || adset.name,
        impressions: num(row.impressions),
        clicks: num(row.clicks),
        spend: num(row.spend),
        reach: num(row.reach),
        frequency: num(row.frequency),
        ctr: num(row.ctr),
        cpc: num(row.cpc),
        cpm: num(row.cpm),
        link_clicks: actions.link_click || 0,
        landing_page_views: actions.landing_page_view || 0,
        video_views: actions.video_view || actions.video_play || 0,
      });
    }
  }

  return insights;
}

export async function syncMetaAnalyticsData(options: { campaignId?: string } = {}) {
  const { campaignId } = options;

  const settings = await getAppSettingsMap([
    'meta_ad_account_id',
    'meta_access_token',
    'meta_sync_enabled',
  ]);

  const adAccountId = parseSettingString(settings.meta_ad_account_id);
  const accessToken = parseSettingString(settings.meta_access_token);

  if (!adAccountId || !accessToken) {
    throw new Error('Meta settings missing: meta_ad_account_id / meta_access_token');
  }

  let campaignQuery = supabase
    .from('dental_campaigns')
    .select('id,name,status,meta_campaign_id')
    .order('created_at', { ascending: false });

  if (campaignId) campaignQuery = campaignQuery.eq('id', campaignId);
  else campaignQuery = campaignQuery.eq('status', 'active');

  const [{ data: engineCampaigns, error: campaignsError }, { data: branches, error: branchesError }] = await Promise.all([
    campaignQuery,
    supabase.from('branches').select('id,name,city'),
  ]);

  if (campaignsError) throw new Error(`Failed to load campaigns: ${campaignsError.message}`);
  if (branchesError) throw new Error(`Failed to load branches: ${branchesError.message}`);

  const branchList = branches || [];
  const branchesWithAliases = branchList.map((b: any) => ({
    id: b.id,
    aliases: buildBranchAliases(b),
  }));

  const metaCampaigns = await fetchGraphAll<any>(`${adAccountId}/campaigns`, {
    fields: 'id,name,status,objective,start_time,stop_time',
    limit: '200',
    access_token: accessToken,
  });

  const nowIso = new Date().toISOString();
  let totalRows = 0;
  let matchedCampaigns = 0;
  let unmatchedCampaigns = 0;

  for (const campaign of engineCampaigns || []) {
    try {
      const matchedMetaCampaign = findMatchingMetaCampaign(campaign, metaCampaigns);

      if (!matchedMetaCampaign) {
        unmatchedCampaigns += 1;
        await supabase
          .from('dental_campaigns')
          .update({
            meta_sync_status: 'no_match',
            bt_last_sync: nowIso,
            updated_at: nowIso,
          })
          .eq('id', campaign.id);
        continue;
      }

      matchedCampaigns += 1;

      const adsets = await fetchGraphAll<any>(`${matchedMetaCampaign.id}/adsets`, {
        fields: 'id,name,status',
        limit: '500',
        access_token: accessToken,
      });

      const analyticsRows: any[] = [];

      for (const adset of adsets) {
        const branchId = matchBranchFromAdSetName(adset.name || '', branchesWithAliases);
        if (!branchId) continue;

        const insightRows = await fetchGraphAll<any>(`${adset.id}/insights`, {
          fields: 'date_start,adset_id,adset_name,impressions,clicks,spend,reach,frequency,ctr,cpc,cpm,actions,video_play_actions',
          time_increment: '1',
          date_preset: 'last_30d',
          limit: '200',
          access_token: accessToken,
        });

        for (const row of insightRows) {
          const actions = parseActions(row.actions);

          const impressions = num(row.impressions);
          const clicks = num(row.clicks);
          const spend = num(row.spend);
          const ctr = num(row.ctr) || (impressions > 0 ? (clicks / impressions) * 100 : 0);
          const cpc = num(row.cpc) || (clicks > 0 ? spend / clicks : 0);
          const cpm = num(row.cpm) || (impressions > 0 ? (spend / impressions) * 1000 : 0);

          analyticsRows.push({
            campaign_id: campaign.id,
            branch_id: branchId,
            date: row.date_start,
            channel: 'meta',
            impressions,
            clicks,
            spend,
            ctr,
            cpc,
            cpm,
            audience_stats: {
              reach: num(row.reach),
              frequency: num(row.frequency),
              link_clicks: actions.link_click || 0,
              landing_page_views: actions.landing_page_view || 0,
              video_views: actions.video_view || actions.video_play || 0,
              meta_campaign_id: String(matchedMetaCampaign.id),
              meta_adset_id: String(row.adset_id || adset.id),
              meta_adset_name: row.adset_name || adset.name,
            },
            last_sync_at: nowIso,
            sync_source: 'meta_ads_sync',
          });
        }
      }

      if (analyticsRows.length > 0) {
        const { error: upsertError } = await supabase
          .from('campaign_analytics')
          .upsert(analyticsRows, { onConflict: 'campaign_id,branch_id,date,channel' });

        if (upsertError) {
          throw new Error(`campaign_analytics upsert failed: ${upsertError.message}`);
        }

        totalRows += analyticsRows.length;
      }

      await supabase
        .from('dental_campaigns')
        .update({
          meta_campaign_id: String(matchedMetaCampaign.id),
          meta_sync_status: 'synced',
          bt_last_sync: nowIso,
          updated_at: nowIso,
        })
        .eq('id', campaign.id);
    } catch (campaignError: any) {
      console.error(`[meta sync] Campaign ${campaign.id} failed:`, campaignError?.message || campaignError);
      await supabase
        .from('dental_campaigns')
        .update({
          meta_sync_status: 'failed',
          bt_sync_error: campaignError?.message || String(campaignError),
          updated_at: nowIso,
        })
        .eq('id', campaign.id);
    }
  }

  await supabase
    .from('app_settings')
    .update({ value: nowIso, updated_at: nowIso })
    .eq('key', 'meta_last_sync');

  return {
    success: true,
    synced_rows: totalRows,
    rows: totalRows,
    campaigns_synced: matchedCampaigns,
    unmatched_campaigns: unmatchedCampaigns,
    enabled: settings.meta_sync_enabled,
  };
}
