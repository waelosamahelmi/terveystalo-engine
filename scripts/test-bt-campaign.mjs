/**
 * Test script: simulates the createBidTheatreCampaign-background Netlify function
 * by importing it and calling the handler with a real campaign payload.
 *
 * Usage: node scripts/test-bt-campaign.mjs [campaignId] [--dry-run]
 *
 * --dry-run: only validates the payload without calling BT API
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load env
const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim();
});

// Set env vars so the function can read them
process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL;
process.env.VITE_SUPABASE_SERVICE_ROLE_KEY = env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const campaignId = args.find(a => !a.startsWith('--')) || '78cf4771-d856-463b-9fe7-e490215e163c';

async function main() {
  console.log(`\n=== BidTheatre Campaign Test ===`);
  console.log(`Campaign: ${campaignId}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no BT API calls)' : 'LIVE (will call BT API!)'}`);
  console.log('');

  // Fetch the campaign
  const { data: campaign, error: campErr } = await supabase
    .from('dental_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campErr || !campaign) {
    console.error('Failed to fetch campaign:', campErr?.message || 'not found');
    process.exit(1);
  }

  console.log(`Campaign: "${campaign.name}"`);
  console.log(`Status: ${campaign.status}`);
  console.log(`Channels: DISPLAY=${campaign.channel_display}, PDOOH=${campaign.channel_pdooh}`);
  console.log(`Budget: DISPLAY=€${campaign.budget_display}, PDOOH=€${campaign.budget_pdooh}`);
  console.log(`Branches: ${(campaign.branch_ids || []).length}`);
  console.log(`Dates: ${campaign.campaign_start_date} → ${campaign.campaign_end_date}`);
  console.log(`Objective: ${campaign.campaign_objective}`);
  console.log(`Age: ${campaign.target_age_min}-${campaign.target_age_max}`);
  console.log(`Radius: ${campaign.campaign_radius}km`);
  console.log(`BT sync: ${campaign.bt_sync_status || 'none'}`);

  // Fetch branches
  const { data: branches, error: brErr } = await supabase
    .from('branches')
    .select('id, name, short_name, city, latitude, longitude, bt_geo_target_id')
    .in('id', campaign.branch_ids || []);

  if (brErr || !branches?.length) {
    console.error('Failed to fetch branches:', brErr?.message);
    process.exit(1);
  }

  console.log(`\nBranches:`);
  branches.forEach(b => {
    console.log(`  ${b.short_name || b.name} (${b.city}) — lat=${b.latitude}, lng=${b.longitude}, geo=${b.bt_geo_target_id || 'none'}`);
  });

  // Check creatives
  const { data: creatives } = await supabase
    .from('creatives')
    .select('id, name, type, size, width, height, status, image_url')
    .eq('campaign_id', campaignId)
    .eq('status', 'ready');

  const displayCreatives = (creatives || []).filter(c => c.type === 'display');
  const pdoohCreatives = (creatives || []).filter(c => c.type === 'pdooh');
  console.log(`\nCreatives: ${(creatives || []).length} total (${displayCreatives.length} display, ${pdoohCreatives.length} pdooh)`);

  // Check bid strategies
  const { data: strats } = await supabase
    .from('bidtheatre_bid_strategies')
    .select('*');

  const displayStrats = (strats || []).filter(s => s.channel === 'DISPLAY');
  const pdoohStrats = (strats || []).filter(s => s.channel === 'PDOOH');
  console.log(`Bid strategies: ${(strats || []).length} total (${displayStrats.length} DISPLAY, ${pdoohStrats.length} PDOOH)`);

  // Check credentials
  const { data: creds } = await supabase
    .from('bidtheatre_credentials')
    .select('network_id, username, advertiser_id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  console.log(`BT credentials: network=${creds?.network_id}, user=${creds?.username}, advertiser=${creds?.advertiser_id || '24674 (default)'}`);

  if (dryRun) {
    console.log('\n=== DRY RUN — Payload that would be sent: ===');

    // Build the payload as CampaignModal would
    const payload = {
      ...campaign,
      channel_display: campaign.channel_display ? 1 : 0,
      channel_pdooh: campaign.channel_pdooh ? 1 : 0,
      is_update: false,
    };

    // Show DISPLAY payload
    if (campaign.channel_display) {
      console.log('\nDISPLAY payload:');
      console.log(JSON.stringify({ ...payload, channel_display: 1, channel_pdooh: 0 }, null, 2));
    }

    // Show PDOOH payload
    if (campaign.channel_pdooh) {
      console.log('\nPDOOH payload:');
      console.log(JSON.stringify({ ...payload, channel_display: 0, channel_pdooh: 1 }, null, 2));
    }

    console.log('\n=== DRY RUN COMPLETE — No BT API calls made ===');
    return;
  }

  // LIVE MODE — import and call the handler
  console.log('\n=== CALLING BT FUNCTION (LIVE) ===\n');

  // Use only 1 branch for testing
  const testBranch = branches[0];
  const testCampaign = {
    ...campaign,
    branch_ids: [testBranch.id], // Single branch for safety
  };

  // Test DISPLAY first
  if (campaign.channel_display) {
    console.log('--- DISPLAY Channel ---');
    const displayPayload = {
      ...testCampaign,
      channel_display: 1,
      channel_pdooh: 0,
      is_update: false,
    };

    try {
      const { handler } = await import('../functions/createBidTheatreCampaign-background/index.mts');
      const result = await handler({
        httpMethod: 'POST',
        body: JSON.stringify(displayPayload),
      });

      console.log('\nDISPLAY result status:', result.statusCode);
      const body = JSON.parse(result.body);
      console.log('DISPLAY result:', JSON.stringify(body, null, 2));
    } catch (err) {
      console.error('DISPLAY error:', err);
    }
  }

  // Test PDOOH 
  if (campaign.channel_pdooh) {
    console.log('\n--- PDOOH Channel ---');
    const pdoohPayload = {
      ...testCampaign,
      channel_display: 0,
      channel_pdooh: 1,
      is_update: false,
    };

    try {
      const { handler } = await import('../functions/createBidTheatreCampaign-background/index.mts');
      const result = await handler({
        httpMethod: 'POST',
        body: JSON.stringify(pdoohPayload),
      });

      console.log('\nPDOOH result status:', result.statusCode);
      const body = JSON.parse(result.body);
      console.log('PDOOH result:', JSON.stringify(body, null, 2));
    } catch (err) {
      console.error('PDOOH error:', err);
    }
  }

  console.log('\n=== TEST COMPLETE ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
