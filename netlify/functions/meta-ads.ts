import type { Handler } from '@netlify/functions';
import {
  listMetaCampaignsFromSettings,
  listMetaAdSetInsights,
  syncMetaAnalyticsData,
} from './_shared/metaAdsSync';

const json = (statusCode: number, body: Record<string, unknown>) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return json(405, { error: 'Method not allowed' });
    }

    const action = (event.queryStringParameters?.action || '').trim();
    const campaignId = event.queryStringParameters?.campaign_id || undefined;

    // Netlify scheduled functions call endpoint without query params.
    // Treat empty action as a daily sync trigger.
    if (!action) {
      const result = await syncMetaAnalyticsData({ campaignId });
      return json(200, result as unknown as Record<string, unknown>);
    }

    if (action === 'campaigns') {
      const campaigns = await listMetaCampaignsFromSettings();
      return json(200, { campaigns });
    }

    if (action === 'adset-insights') {
      const insights = await listMetaAdSetInsights(campaignId);
      return json(200, { insights });
    }

    if (action === 'sync') {
      const result = await syncMetaAnalyticsData({ campaignId });
      return json(200, result as unknown as Record<string, unknown>);
    }

    return json(400, { error: `Unknown action: ${action}` });
  } catch (error: any) {
    console.error('[meta-ads] Error:', error?.message || error);
    return json(500, { error: error?.message || 'Internal server error' });
  }
};
