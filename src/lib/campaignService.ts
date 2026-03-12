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

import { getCreativeTemplates, renderTemplateHtml, fixFontUrls } from './creativeService';
import { buildMetaTemplateVariables, getConjugatedCity, findMatchingBundle } from './metaTemplateVariables';
import type {
  DentalCampaign,
  CampaignFormData,
  CampaignFilters,
  CampaignStatus,
  CampaignSummary,
  CreativeTemplate
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
 * Build template variables from campaign form data
 */
function buildTemplateVariables(formData: CampaignFormData, showAddress: boolean): Record<string, string> {
  const isGeneralBrandMessage = formData.general_brand_message &&
    formData.general_brand_message.length > 0;
  const city = formData.campaign_city || 'Helsinki';
  const address = formData.campaign_address || 'Osoite';

  const headlineText = formData.headline || 'Hymyile.';
  const subheadlineText = formData.subheadline || 'Olet hyvissä käsissä.';
  const offerTitle = isGeneralBrandMessage ? '' : 'Hammas-tarkastus';
  const priceValue = isGeneralBrandMessage ? '' : (formData.offer_text || '49');

  return {
    title: 'Suun Terveystalo',
    headline: headlineText,
    subheadline: subheadlineText.replace(/\n/g, ' '),
    offer_title: offerTitle.replace(/\n/g, ' '),
    price: priceValue,
    currency: '€',
    cta_text: formData.cta_text || 'Varaa aika',
    branch_address: showAddress ? address : '',
    city_name: city,
    logo_url: 'https://suunterveystalo.netlify.app/refs/assets/SuunTerveystalo_logo.png',
    image_url: formData.background_image_url || 'https://suunterveystalo.netlify.app/refs/assets/nainen.jpg',
    click_url: formData.landing_url || 'https://terveystalo.com/suunterveystalo',
    disclaimer_text: '',
  };
}

/** All creative URLs for a single ad version (branch × service) */
export interface AdVersionUrls {
  meta_video_url?: string;       // meta/1080x1080
  meta_story_url?: string;       // meta/1080x1920
  display_300x300_url?: string;
  display_300x431_url?: string;
  display_300x600_url?: string;
  display_980x400_url?: string;
  pdooh_1080x1920_url?: string;
}

/**
 * Create creative records for a campaign.
 * Renders ALL templates (meta, display, pdooh) as HTML files,
 * uploads them to Supabase Storage in a structured folder hierarchy,
 * creates creative DB records with the public URLs,
 * and returns a map keyed by "branchId::serviceId" with all creative URLs
 * so the caller can set those on the campaign / sheet rows.
 */
export async function createCampaignCreatives(
  campaignId: string,
  formData: CampaignFormData
): Promise<Record<string, AdVersionUrls>> {
  const urlsByAdVersion: Record<string, AdVersionUrls> = {};

  try {
    // Get all active templates
    const templates = await getCreativeTemplates({ active: true });
    if (!templates || templates.length === 0) {
      console.log('No active templates found, skipping creative creation');
      return urlsByBranch;
    }

    const branchIds = formData.branch_ids?.length ? formData.branch_ids : [formData.branch_id];
    const serviceIds = formData.service_ids?.length ? formData.service_ids : [formData.service_id];

    // Fetch full branch and service data
    const [branchRes, serviceRes] = await Promise.all([
      supabase.from('branches').select('id, name, short_name, address, city').in('id', branchIds),
      supabase.from('services').select('id, name, name_fi, code, default_price, default_offer_fi').in('id', serviceIds),
    ]);
    const branches = branchRes.data || [];
    const services = serviceRes.data || [];
    const branchMap = new Map(branches.map(b => [b.id, b]));
    const serviceMap = new Map(services.map(s => [s.id, s]));

    const baseUrl = window.location.origin;
    const showAddress = formData.creative_type === 'local' || formData.creative_type === 'both';

    // Determine which channel types and sizes to create
    type ChannelSize = { type: 'meta' | 'display' | 'pdooh'; width: number; height: number; folder: string };
    const channelSizes: ChannelSize[] = [];

    if (formData.channel_meta) {
      channelSizes.push(
        { type: 'meta', width: 1080, height: 1080, folder: 'meta' },
        { type: 'meta', width: 1080, height: 1920, folder: 'meta' },
      );
    }
    if (formData.channel_display) {
      channelSizes.push(
        { type: 'display', width: 300, height: 300, folder: 'display' },
        { type: 'display', width: 300, height: 431, folder: 'display' },
        { type: 'display', width: 300, height: 600, folder: 'display' },
        { type: 'display', width: 620, height: 891, folder: 'display' },
        { type: 'display', width: 980, height: 400, folder: 'display' },
      );
    }
    if (formData.channel_pdooh) {
      channelSizes.push(
        { type: 'pdooh', width: 1080, height: 1920, folder: 'pdooh' },
        { type: 'pdooh', width: 2160, height: 3840, folder: 'pdooh' },
      );
    }

    if (channelSizes.length === 0) {
      console.log('No channels enabled, skipping creative creation');
      return urlsByBranch;
    }

    // Collect all items to upload via Netlify function
    const uploadItems: Array<{
      storagePath: string;
      html: string;
      creative: {
        campaign_id: string;
        template_id: string;
        name: string;
        type: string;
        size: string;
        width: number;
        height: number;
      };
      branchId: string;
      serviceId: string;
      channelType: string;
      channelWidth: number;
      channelHeight: number;
    }> = [];

    // For each branch × service × channel/size — render + upload HTML
    for (const branchId of branchIds) {
      const branch = branchMap.get(branchId);
      if (!branch) continue;

      // urlsByAdVersion is initialized per branch::service below

      for (const serviceId of serviceIds) {
        const service = serviceMap.get(serviceId);
        if (!service) continue;

        const serviceName = service.name_fi || service.name;
        const isGeneralBrandMessage = service.code === 'yleinen-brandiviesti';
        const branchLabel = branch.city || branch.short_name || branch.name;
        // Sanitize for storage path (ASCII-safe)
        const sanitize = (s: string) => s
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9-]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        const adFolder = `${sanitize(branchLabel)} - ${sanitize(serviceName)}`;

        for (const cs of channelSizes) {
          const sizeStr = `${cs.width}x${cs.height}`;

          // Find matching template (2160x3840 falls back to 1080x1920 with 2x upscale)
          const isUpscaled = cs.width === 2160 && cs.height === 3840;
          const template = templates.find(t =>
            t.type === cs.type &&
            t.width === (isUpscaled ? 1080 : cs.width) &&
            t.height === (isUpscaled ? 1920 : cs.height) &&
            t.active
          );
          if (!template) {
            console.warn(`No active ${cs.type} template for ${sizeStr}`);
            continue;
          }

          // Build variables — use rich meta variables for meta, simple for others
          let vars: Record<string, string>;
          if (cs.type === 'meta') {
            const isSplitTemplate = template.html_template.includes('{{headline_line2}}');
            vars = buildMetaTemplateVariables({
              branch,
              service,
              allBranches: branches,
              allServices: services,
              formData: {
                headline: formData.headline,
                subheadline: formData.subheadline,
                offer_text: formData.service_prices?.[serviceId] || formData.offer_text,
                cta_text: formData.cta_text,
                general_brand_message: formData.general_brand_message,
                creative_type: formData.creative_type,
                campaign_address: formData.campaign_address,
                background_image_url: formData.background_image_url,
                landing_url: formData.landing_url,
                meta_audio_url: formData.meta_audio_url,
                meta_video_url: formData.meta_video_url,
              },
              baseUrl,
              isMetaTemplate: true,
              isSplitTemplate,
            });
          } else {
            // Build per-branch/per-service variables for display/pdooh
            // This must match the preview in CampaignCreate.tsx buildTemplateVariables
            const serviceName = service.name_fi || service.name;
            const servicePrice = (formData.service_prices?.[serviceId] || (service.default_price || '').replace(/€/g, '').trim());

            // Headline — preserve | separator for <br> conversion in renderTemplateHtml
            const headlineText = formData.headline || 'Hymyile.|Olet hyvissä käsissä.';

            // Check if template uses split structure
            const isSplitTemplate = template.html_template.includes('{{headline_line2}}');
            let headlineValue: string;
            let headlineLine2Value: string | undefined;
            if (isSplitTemplate) {
              const parts = headlineText.split('|');
              headlineValue = parts[0]?.trim() || headlineText;
              headlineLine2Value = parts.length > 1 ? parts.slice(1).join(' ').trim() : '';
            } else {
              headlineValue = headlineText;
              headlineLine2Value = undefined;
            }

            // Subheadline / message text — must use conjugated city like preview
            let messageText = formData.subheadline;
            if (!messageText) {
              if (isGeneralBrandMessage) {
                const cityConj = branch.city ? getConjugatedCity(branch.city) : '';
                messageText = cityConj
                  ? `Sujuvampaa suunterveyttä ${cityConj} Suun Terveystalossa.`
                  : 'Sujuvampaa suunterveyttä Suun Terveystaloissa.';
              } else {
                const cityConj = branch.city ? getConjugatedCity(branch.city) : '';
                messageText = cityConj
                  ? `Sujuvampaa suunterveyttä ${cityConj} Suun Terveystalossa.`
                  : 'Sujuvampaa suunterveyttä Suun Terveystaloissa.';
              }
            }

            // Offer title — apply hyphenation for long Finnish service names
            let offerTitle = '';
            if (!isGeneralBrandMessage) {
              offerTitle = service.default_offer_fi || serviceName;
              const hyphenationMap: Record<string, string> = {
                'Suuhygienistikäynti': 'Suuhygienisti-|käynti',
                'Hammastarkastus': 'Hammas-|tarkastus',
              };
              const cleanName = offerTitle.replace(/-/g, '');
              if (hyphenationMap[cleanName]) {
                offerTitle = hyphenationMap[cleanName];
              } else if (hyphenationMap[offerTitle]) {
                offerTitle = hyphenationMap[offerTitle];
              }
            }

            const priceValue = isGeneralBrandMessage ? '' : (servicePrice || formData.offer_text || '49');
            const city = branch.city || '';
            const address = branch.address || '';
            const locationText = address ? `${address}, ${city}` : city;

            // Scene 3 text lines (for PDOOH and Meta-style templates)
            const scene3Vars: Record<string, string> = {
              scene3_line1: 'Sujuvampaa',
              scene3_line2: 'suun',
              scene3_line3: 'terveyttä',
              scene3_line4: city ? getConjugatedCity(city) : 'Oulun',
              scene3_line5: 'Suun Terveystalossa.',
            };

            vars = {
              title: 'Suun Terveystalo',
              headline: headlineValue,
              ...(headlineLine2Value !== undefined && { headline_line2: headlineLine2Value }),
              subheadline: messageText,
              offer_title: offerTitle,
              offer_subtitle: isGeneralBrandMessage ? '' : (formData.offer_subtitle || 'uusille asiakkaille'),
              price: priceValue,
              currency: '€',
              cta_text: cs.type === 'pdooh' ? '' : (formData.cta_text || 'Varaa aika'),
              branch_address: showAddress ? locationText : '',
              city_name: city || 'Helsinki',
              ...scene3Vars,
              logo_url: `${baseUrl}/refs/assets/SuunTerveystalo_logo.png`,
              artwork_url: `${baseUrl}/refs/assets/terveystalo-artwork.png`,
              image_url: formData.background_image_url || `${baseUrl}/refs/assets/nainen.jpg`,
              click_url: formData.landing_url || 'https://terveystalo.com/suunterveystalo',
              offer_date: isGeneralBrandMessage ? '' : (formData.offer_date || 'Varaa viimeistään 28.10.'),
              disclaimer_text: formData.disclaimer_text || '',
            };
          }

          // Render template HTML
          let html = renderTemplateHtml(template, vars);
          html = fixFontUrls(html);

          // Make all root-relative asset paths absolute for exported HTML
          const ASSET_BASE = 'https://suunterveystalo.netlify.app';
          html = html
            .replace(/src="\/meta\//g, `src="${ASSET_BASE}/meta/`)
            .replace(/src="\/refs\//g, `src="${ASSET_BASE}/refs/`)
            .replace(/src="\/font\//g, `src="${ASSET_BASE}/font/`)
            .replace(/url\((['"]?)\/meta\//g, `url($1${ASSET_BASE}/meta/`)
            .replace(/url\((['"]?)\/refs\//g, `url($1${ASSET_BASE}/refs/`)
            .replace(/url\((['"]?)\/font\//g, `url($1${ASSET_BASE}/font/`)
            .replace(/http:\/\/localhost:\d+\//g, `${ASSET_BASE}/`);

          // Apply CSS injections
          if (isGeneralBrandMessage) {
            html = html.replace('</head>',
              '<style>.Pricetag, .Price, .HammasTarkast, .HammasTarkastu, .VaronViimcist, .pricetag, .price-bubble, .price-badge-wrap { display: none !important; }</style></head>');
          }
          if (!showAddress) {
            html = html.replace('</head>',
              '<style>.address, .Torikatu1Laht, .branch_address, .scene-4-address { display: none !important; }</style></head>');
          }
          // PDOOH: hide CTA
          if (cs.type === 'pdooh') {
            html = html.replace('</head>',
              '<style>.cta, .cta-button, .cta-wrap, .scene-4-cta { display: none !important; }</style></head>');
          }

          // 2160x3840: upscale from 1080x1920 via CSS transform
          if (isUpscaled) {
            html = html.replace('</head>',
              `<style>html,body{width:2160px;height:3840px;margin:0;padding:0;overflow:hidden}body>*:first-child{transform:scale(2);transform-origin:top left}</style></head>`);
          }

          // Collect upload item for batch upload via Netlify function
          const storagePath = `campaigns/${campaignId}/${adFolder}/${cs.folder}/${sizeStr}.html`;
          const creativeName = `${branchLabel} - ${serviceName} - ${sizeStr}`;

          // Ensure ad version entry exists
          const adVersionKey = `${branchId}::${serviceId}`;
          if (!urlsByAdVersion[adVersionKey]) {
            urlsByAdVersion[adVersionKey] = {};
          }

          uploadItems.push({
            storagePath,
            html,
            creative: {
              campaign_id: campaignId,
              template_id: template.id,
              name: creativeName,
              type: cs.type,
              size: sizeStr,
              width: cs.width,
              height: cs.height,
            },
            branchId,
            serviceId,
            channelType: cs.type,
            channelWidth: cs.width,
            channelHeight: cs.height,
          });
        }
      }
    }

    // Batch upload all HTML files via Netlify function (uses service role key, bypasses RLS)
    if (uploadItems.length > 0) {
      // Split into batches of 20 to avoid payload size limits
      const BATCH_SIZE = 20;
      for (let i = 0; i < uploadItems.length; i += BATCH_SIZE) {
        const batch = uploadItems.slice(i, i + BATCH_SIZE);
        try {
          const response = await fetch('/.netlify/functions/upload-creatives', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: batch.map(item => ({
                storagePath: item.storagePath,
                html: item.html,
                creative: item.creative,
              })),
            }),
          });

          if (!response.ok) {
            console.error(`Batch upload failed (${i}-${i + batch.length}):`, await response.text());
            continue;
          }

          const { results } = await response.json();
          for (let j = 0; j < results.length; j++) {
            const result = results[j];
            const item = batch[j];
            if (result.success && result.publicUrl) {
              // Track URLs per ad version (branch × service)
              const avKey = `${item.branchId}::${item.serviceId}`;
              if (!urlsByAdVersion[avKey]) urlsByAdVersion[avKey] = {};
              const av = urlsByAdVersion[avKey];

              if (item.channelType === 'meta') {
                if (item.channelWidth === 1080 && item.channelHeight === 1080 && !av.meta_video_url) {
                  av.meta_video_url = result.publicUrl;
                }
                if (item.channelWidth === 1080 && item.channelHeight === 1920 && !av.meta_story_url) {
                  av.meta_story_url = result.publicUrl;
                }
              } else if (item.channelType === 'display') {
                const sizeKey = `display_${item.channelWidth}x${item.channelHeight}_url` as keyof AdVersionUrls;
                if (!av[sizeKey]) (av as any)[sizeKey] = result.publicUrl;
              } else if (item.channelType === 'pdooh') {
                if (!av.pdooh_1080x1920_url) av.pdooh_1080x1920_url = result.publicUrl;
              }

              console.log(`Uploaded ${item.channelType} ${item.creative.size}: ${result.publicUrl}`);
            } else {
              console.error(`Upload failed for ${result.storagePath}:`, result.error);
            }
          }
        } catch (err) {
          console.error(`Batch upload error (${i}-${i + batch.length}):`, err);
        }
      }
    }
    // Update campaign record with first available meta URLs (non-blocking — columns may not exist yet)
    const firstAdVersion = Object.values(urlsByAdVersion)[0];
    if (firstAdVersion) {
      const updateFields: Record<string, string> = {};
      if (firstAdVersion.meta_video_url) updateFields.meta_video_url = firstAdVersion.meta_video_url;
      if (firstAdVersion.meta_story_url) updateFields.meta_story_url = firstAdVersion.meta_story_url;
      if (Object.keys(updateFields).length > 0) {
        try {
          const { error: updateError } = await supabase.from('dental_campaigns').update(updateFields).eq('id', campaignId);
          if (updateError) {
            console.warn('Could not set campaign meta URLs (columns may not exist yet):', updateError.message);
          } else {
            console.log('Set campaign meta URLs:', updateFields);
          }
        } catch {
          console.warn('Meta URL update skipped — columns not in schema');
        }
      }
    }

    const totalCreated = uploadItems.length;
    console.log(`Created ${totalCreated} HTML creatives for campaign ${campaignId}`);
    console.log('Creative URLs by ad version:', JSON.stringify(urlsByAdVersion, null, 2));
  } catch (error) {
    console.error('Error creating campaign creatives:', error);
  }

  return urlsByAdVersion;
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
    service_ids: formData.service_ids || [formData.service_id],
    branch_id: formData.branch_id,
    branch_ids: formData.branch_ids || [formData.branch_id],

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
    branch_radius_settings: formData.branch_radius_settings || null,

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

    // 1. Create creative HTML files and upload to Supabase Storage FIRST
    //    Returns per ad-version (branch×service) URLs so we can include them in the sheet
    let creativeUrlsByAdVersion: Record<string, AdVersionUrls> = {};
    try {
      creativeUrlsByAdVersion = await createCampaignCreatives(data.id, formData);
    } catch (e) {
      console.error('Creative creation failed (non-blocking):', e);
    }

    // 2. Sync campaign data to Google Sheets (with creative URLs)
    const sheetData = {
      ...data,
      meta_primary_text: formData.meta_primary_text || '',
      meta_headline: formData.meta_headline || '',
      meta_description: formData.meta_description || '',
      excluded_branch_ids: formData.excluded_branch_ids || [],
      offer_date: formData.offer_date || '',
      offer_subtitle: formData.offer_subtitle || '',
    };
    try {
      const sheetOk = await addDentalCampaignToSheet(sheetData, creativeUrlsByAdVersion);
      if (!sheetOk) console.warn('Sheet sync returned false for campaign', data.id);
      else console.log('Campaign data synced to Google Sheet');
    } catch (e) {
      console.error('Google Sheets sync failed (non-blocking):', e);
    }
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
