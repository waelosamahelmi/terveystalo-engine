// ============================================================================
// SUUN TERVEYSTALO - Analytics Service
// Handles all analytics and reporting operations
// ============================================================================

import { supabase } from './supabase';
import { sendSlackNotification } from './slackService';
import type { 
  CampaignAnalytics, 
  AnalyticsFilters, 
  DailyStats,
  Channel 
} from '../types';

/**
 * Check campaign budget and send alerts if needed
 */
export async function checkCampaignBudgets(): Promise<void> {
  try {
    // Get active campaigns with their spend
    const { data: campaigns } = await supabase
      .from('dental_campaigns')
      .select('id, name, total_budget, status')
      .eq('status', 'active');

    if (!campaigns) return;

    for (const campaign of campaigns) {
      // Get total spend for this campaign
      const { data: analytics } = await supabase
        .from('campaign_analytics')
        .select('spend')
        .eq('campaign_id', campaign.id);

      const totalSpend = analytics?.reduce((sum, a) => sum + (a.spend || 0), 0) || 0;
      const budgetPercentage = campaign.total_budget > 0 
        ? (totalSpend / campaign.total_budget) * 100 
        : 0;

      // Check if budget is at 80% (warning)
      if (budgetPercentage >= 80 && budgetPercentage < 100) {
        await sendSlackNotification(
          'budget_warning',
          `Budjettivaroitus: ${campaign.name}`,
          `Kampanjan *${campaign.name}* budjetti on ${budgetPercentage.toFixed(0)}% käytetty.`,
          {
            'Kampanja': campaign.name,
            'Käytetty': `€${totalSpend.toFixed(2)}`,
            'Budjetti': `€${campaign.total_budget}`,
            'Käyttöaste': `${budgetPercentage.toFixed(0)}%`
          }
        );
      }

      // Check if budget is depleted (100%)
      if (budgetPercentage >= 100) {
        await sendSlackNotification(
          'budget_depleted',
          `Budjetti loppunut: ${campaign.name}`,
          `Kampanjan *${campaign.name}* budjetti on käytetty kokonaan!`,
          {
            'Kampanja': campaign.name,
            'Käytetty': `€${totalSpend.toFixed(2)}`,
            'Budjetti': `€${campaign.total_budget}`,
            'Ylitys': `€${(totalSpend - campaign.total_budget).toFixed(2)}`
          }
        );
      }
    }
  } catch (error) {
    console.error('Failed to check campaign budgets:', error);
  }
}

/**
 * Get analytics for a specific campaign
 */
export async function getCampaignAnalytics(
  campaignId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<CampaignAnalytics[]> {
  let query = supabase
    .from('campaign_analytics')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('date', { ascending: false });

  if (dateFrom) {
    query = query.gte('date', dateFrom);
  }
  
  if (dateTo) {
    query = query.lte('date', dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch campaign analytics:', error);
    return [];
  }

  return data || [];
}

/**
 * Get aggregated analytics with filters
 */
export async function getAggregatedAnalytics(filters: AnalyticsFilters): Promise<{
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
  avgCtr: number;
  avgCpm: number;
  avgCpc: number;
  byChannel: Record<Channel, {
    impressions: number;
    clicks: number;
    spend: number;
    ctr: number;
  }>;
  daily: DailyStats[];
}> {
  let query = supabase
    .from('campaign_analytics')
    .select('*')
    .gte('date', filters.date_from)
    .lte('date', filters.date_to);

  if (filters.campaign_id) {
    query = query.eq('campaign_id', filters.campaign_id);
  }

  if (filters.channel) {
    query = query.eq('channel', filters.channel);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch aggregated analytics:', error);
    return {
      totalImpressions: 0,
      totalClicks: 0,
      totalSpend: 0,
      avgCtr: 0,
      avgCpm: 0,
      avgCpc: 0,
      byChannel: {} as any,
      daily: []
    };
  }

  // Aggregate the data
  const totalImpressions = data?.reduce((sum, d) => sum + d.impressions, 0) || 0;
  const totalClicks = data?.reduce((sum, d) => sum + d.clicks, 0) || 0;
  const totalSpend = data?.reduce((sum, d) => sum + d.spend, 0) || 0;
  
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

  // Group by channel
  const byChannel: Record<string, { impressions: number; clicks: number; spend: number; ctr: number }> = {};
  data?.forEach(d => {
    if (!byChannel[d.channel]) {
      byChannel[d.channel] = { impressions: 0, clicks: 0, spend: 0, ctr: 0 };
    }
    byChannel[d.channel].impressions += d.impressions;
    byChannel[d.channel].clicks += d.clicks;
    byChannel[d.channel].spend += d.spend;
  });

  // Calculate CTR for each channel
  Object.keys(byChannel).forEach(channel => {
    const ch = byChannel[channel];
    ch.ctr = ch.impressions > 0 ? (ch.clicks / ch.impressions) * 100 : 0;
  });

  // Group by date
  const dailyMap = new Map<string, DailyStats>();
  data?.forEach(d => {
    const existing = dailyMap.get(d.date);
    if (existing) {
      existing.impressions += d.impressions;
      existing.clicks += d.clicks;
      existing.spend += d.spend;
    } else {
      dailyMap.set(d.date, {
        date: d.date,
        impressions: d.impressions,
        clicks: d.clicks,
        spend: d.spend
      });
    }
  });

  const daily = Array.from(dailyMap.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return {
    totalImpressions,
    totalClicks,
    totalSpend,
    avgCtr,
    avgCpm,
    avgCpc,
    byChannel: byChannel as any,
    daily
  };
}

/**
 * Get daily spend view
 */
export async function getDailySpend(
  dateFrom: string, 
  dateTo: string
): Promise<Array<{ date: string; channel: string; total_spend: number }>> {
  const { data, error } = await supabase
    .from('daily_spend')
    .select('*')
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date');

  if (error) {
    console.error('Failed to fetch daily spend:', error);
    return [];
  }

  return data || [];
}

/**
 * Get top performing campaigns
 */
export async function getTopCampaigns(
  limit = 5,
  metric: 'impressions' | 'clicks' | 'spend' | 'ctr' = 'impressions'
): Promise<Array<{
  campaign_id: string;
  campaign_name: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
}>> {
  const { data, error } = await supabase
    .from('campaign_analytics')
    .select(`
      campaign_id,
      impressions,
      clicks,
      spend,
      dental_campaigns!inner(name)
    `)
    .order(metric, { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch top campaigns:', error);
    return [];
  }

  // Aggregate by campaign
  const campaignMap = new Map<string, any>();
  data?.forEach(d => {
    const existing = campaignMap.get(d.campaign_id);
    if (existing) {
      existing.impressions += d.impressions;
      existing.clicks += d.clicks;
      existing.spend += d.spend;
    } else {
      campaignMap.set(d.campaign_id, {
        campaign_id: d.campaign_id,
        campaign_name: (d as any).dental_campaigns?.name || 'Unknown',
        impressions: d.impressions,
        clicks: d.clicks,
        spend: d.spend,
        ctr: 0
      });
    }
  });

  const results = Array.from(campaignMap.values());
  results.forEach(r => {
    r.ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
  });

  return results.sort((a, b) => b[metric] - a[metric]).slice(0, limit);
}

/**
 * Get dashboard overview stats
 */
export async function getDashboardStats(): Promise<{
  activeCampaigns: number;
  totalSpendMTD: number;
  totalSpend: number;
  totalImpressionsMTD: number;
  totalImpressions: number;
  totalClicks: number;
  avgCtrMTD: number;
  spendChange: number;
  impressionsChange: number;
  clicksChange: number;
}> {
  // Get current month dates
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = now.toISOString().split('T')[0];
  
  // Get last month dates
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

  // Fetch active campaigns
  const { data: campaigns } = await supabase
    .from('dental_campaigns')
    .select('id')
    .eq('status', 'active');

  const activeCampaigns = campaigns?.length || 0;

  // Fetch current month analytics
  const currentMonth = await getAggregatedAnalytics({
    date_from: monthStart,
    date_to: monthEnd
  });

  // Fetch last month analytics
  const lastMonth = await getAggregatedAnalytics({
    date_from: lastMonthStart,
    date_to: lastMonthEnd
  });

  // Calculate changes
  const spendChange = lastMonth.totalSpend > 0 
    ? ((currentMonth.totalSpend - lastMonth.totalSpend) / lastMonth.totalSpend) * 100 
    : 0;
  
  const impressionsChange = lastMonth.totalImpressions > 0
    ? ((currentMonth.totalImpressions - lastMonth.totalImpressions) / lastMonth.totalImpressions) * 100
    : 0;

  const clicksChange = lastMonth.totalClicks > 0
    ? ((currentMonth.totalClicks - lastMonth.totalClicks) / lastMonth.totalClicks) * 100
    : 0;

  return {
    activeCampaigns,
    totalSpendMTD: currentMonth.totalSpend,
    totalSpend: currentMonth.totalSpend,
    totalImpressionsMTD: currentMonth.totalImpressions,
    totalImpressions: currentMonth.totalImpressions,
    totalClicks: currentMonth.totalClicks,
    avgCtrMTD: currentMonth.avgCtr,
    spendChange,
    impressionsChange,
    clicksChange,
  };
}

/**
 * Get recent analytics for dashboard charts (last N days)
 */
export async function getRecentAnalytics(days = 14): Promise<{
  daily: { date: string; impressions: number; clicks: number; spend: number }[];
  byChannel: Record<string, { impressions: number; clicks: number; spend: number }>;
}> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data } = await supabase
    .from('campaign_analytics')
    .select('date, impressions, clicks, spend, channel')
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  // Aggregate by date
  const dailyMap = new Map<string, { impressions: number; clicks: number; spend: number }>();
  const channelMap: Record<string, { impressions: number; clicks: number; spend: number }> = {};

  (data || []).forEach((row) => {
    // Daily aggregation
    const existing = dailyMap.get(row.date) || { impressions: 0, clicks: 0, spend: 0 };
    dailyMap.set(row.date, {
      impressions: existing.impressions + (row.impressions || 0),
      clicks: existing.clicks + (row.clicks || 0),
      spend: existing.spend + (row.spend || 0),
    });

    // Channel aggregation
    const channel = row.channel || 'other';
    if (!channelMap[channel]) {
      channelMap[channel] = { impressions: 0, clicks: 0, spend: 0 };
    }
    channelMap[channel].impressions += row.impressions || 0;
    channelMap[channel].clicks += row.clicks || 0;
    channelMap[channel].spend += row.spend || 0;
  });

  // Convert to array sorted by date
  const daily = Array.from(dailyMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { daily, byChannel: channelMap };
}

/**
 * Export analytics data
 */
export async function exportAnalytics(
  filters: AnalyticsFilters,
  format: 'csv' | 'json' = 'csv'
): Promise<string> {
  const analytics = await getAggregatedAnalytics(filters);
  
  if (format === 'json') {
    return JSON.stringify(analytics, null, 2);
  }

  // CSV format
  const headers = ['Date', 'Impressions', 'Clicks', 'Spend', 'CTR'];
  const rows = analytics.daily.map(d => [
    d.date,
    d.impressions,
    d.clicks,
    d.spend.toFixed(2),
    (d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0).toFixed(2)
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
/**
 * Get analytics summary (alias for getAggregatedAnalytics)
 */
export async function getAnalyticsSummary(filters: AnalyticsFilters) {
  return getAggregatedAnalytics(filters);
}

/**
 * Get geographic analytics data
 */
export async function getGeoAnalytics(filters?: AnalyticsFilters): Promise<Array<{
  region: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
}>> {
  // Select geo_region for geographic breakdown
  let query = supabase
    .from('campaign_analytics')
    .select('impressions, clicks, spend, geo_region, geo_stats');

  if (filters?.date_from) {
    query = query.gte('date', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('date', filters.date_to);
  }
  if (filters?.campaign_id) {
    query = query.eq('campaign_id', filters.campaign_id);
  }
  if (filters?.channel) {
    query = query.eq('channel', filters.channel);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch geo analytics:', error);
    return [];
  }

  // Aggregate by region — use geo_stats JSON from BidTheatre if geo_region is not set
  const regionMap = new Map<string, { impressions: number; clicks: number; spend: number }>();
  
  (data || []).forEach(row => {
    const geoStats = (row as any).geo_stats;
    
    // If we have BidTheatre geo_stats breakdown, use it for per-region data
    if (Array.isArray(geoStats) && geoStats.length > 0) {
      for (const geo of geoStats) {
        const region = geo.name || 'Tuntematon';
        const existing = regionMap.get(region) || { impressions: 0, clicks: 0, spend: 0 };
        regionMap.set(region, {
          impressions: existing.impressions + (geo.nrImps || 0),
          clicks: existing.clicks + 0,
          spend: existing.spend + (geo.cost || 0),
        });
      }
    } else {
      // Fallback: use geo_region column or default
      const region = (row as any).geo_region || 'Suomi';
      const existing = regionMap.get(region) || { impressions: 0, clicks: 0, spend: 0 };
      regionMap.set(region, {
        impressions: existing.impressions + (row.impressions || 0),
        clicks: existing.clicks + (row.clicks || 0),
        spend: existing.spend + (row.spend || 0),
      });
    }
  });

  return Array.from(regionMap.entries()).map(([region, stats]) => ({
    region,
    ...stats,
    ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0,
  })).sort((a, b) => b.impressions - a.impressions);
}

/**
 * Get channel analytics breakdown
 */
export async function getChannelAnalytics(filters?: AnalyticsFilters): Promise<Array<{
  channel: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  share: number;
}>> {
  let query = supabase
    .from('campaign_analytics')
    .select('channel, impressions, clicks, spend');

  if (filters?.date_from) {
    query = query.gte('date', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('date', filters.date_to);
  }
  if (filters?.campaign_id) {
    query = query.eq('campaign_id', filters.campaign_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch channel analytics:', error);
    return [];
  }

  // Aggregate by channel
  const channelMap = new Map<string, { impressions: number; clicks: number; spend: number }>();
  let totalImpressions = 0;
  
  (data || []).forEach(row => {
    const channel = row.channel || 'other';
    const existing = channelMap.get(channel) || { impressions: 0, clicks: 0, spend: 0 };
    const impressions = row.impressions || 0;
    totalImpressions += impressions;
    channelMap.set(channel, {
      impressions: existing.impressions + impressions,
      clicks: existing.clicks + (row.clicks || 0),
      spend: existing.spend + (row.spend || 0),
    });
  });

  // Map internal channel names to display labels
  const channelLabels: Record<string, string> = {
    display: 'Display',
    pdooh: 'PDOOH',
    meta: 'Meta',
    other: 'Muu',
  };

  return Array.from(channelMap.entries()).map(([channel, stats]) => ({
    channel: channelLabels[channel] || channel,
    ...stats,
    ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0,
    share: totalImpressions > 0 ? (stats.impressions / totalImpressions) * 100 : 0,
  })).sort((a, b) => b.impressions - a.impressions);
}