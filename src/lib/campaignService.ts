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

import { getCreativeTemplates, renderTemplateHtml, fixFontUrls, renderHtmlToJpg } from './creativeService';
import { buildMetaTemplateVariables, getConjugatedCity, findMatchingBundle, getBundleForBranch, groupBranchesByBundle } from './metaTemplateVariables';
import type { BranchGroup } from './metaTemplateVariables';

/**
 * BidTheatre creative size limits (IAB standards)
 * Desktop sizes: 300 KB max initial load
 * Mobile sizes: 200 KB max initial load
 */
const BT_SIZE_LIMITS: Record<string, number> = {
  '300x300': 200,   // mobile
  '300x431': 200,   // mobile
  '300x600': 200,   // mobile (also desktop, use stricter limit)
  '620x891': 300,   // desktop
  '980x400': 300,   // desktop
  '1080x1920': 300, // pdooh
  '2160x3840': 300, // pdooh
};

/**
 * Get an optimized background image URL based on the creative width.
 * Default local assets (nainen.jpg, mies.jpg) are 17+ MB originals.
 * Pre-generated optimized versions exist at /refs/assets/{name}-{width}w.jpg.
 * For user-uploaded Supabase storage images, appends transform params.
 */
function getOptimizedBackgroundUrl(originalUrl: string, adWidth: number, baseUrl: string): string {
  if (!originalUrl) return originalUrl;

  // Determine the optimal image width bucket
  const widthBucket = adWidth <= 300 ? 300 : adWidth <= 620 ? 620 : adWidth <= 980 ? 980 : 1080;

  // Check for default local assets (nainen.jpg, mies.jpg)
  const localAssetMatch = originalUrl.match(/\/refs\/assets\/(nainen|mies)\.jpg$/i);
  if (localAssetMatch) {
    const name = localAssetMatch[1];
    return originalUrl.replace(`${name}.jpg`, `${name}-${widthBucket}w.jpg`);
  }

  // For Supabase storage images, use image transform API
  if (originalUrl.includes('.supabase.co/storage/v1/object/public/')) {
    const transformUrl = originalUrl.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );
    const separator = transformUrl.includes('?') ? '&' : '?';
    return `${transformUrl}${separator}width=${widthBucket}&quality=75`;
  }

  return originalUrl;
}

/**
 * Get an optimized artwork URL based on creative width.
 * Default artwork (2868x1266 original) has pre-generated optimized versions.
 */
function getOptimizedArtworkUrl(originalUrl: string, adWidth: number): string {
  if (!originalUrl) return originalUrl;

  // Check for default artwork (terveystalo-artwork.png)
  if (originalUrl.match(/\/refs\/assets\/terveystalo-artwork\.png$/i)) {
    const widthBucket = adWidth <= 620 ? '700w' : '1200w';
    return originalUrl.replace('terveystalo-artwork.png', `terveystalo-artwork-${widthBucket}.png`);
  }

  return originalUrl;
}
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
      creator:users!created_by(name, email, image_url),
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
      creator:users!created_by(name, email, image_url),
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
    image_url: formData.background_image_url || 'https://suunterveystalo.netlify.app/refs/assets/nainen-980w.jpg',
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
    const isNationwideWithAddress = formData.ad_type === 'nationwide' && formData.nationwide_address_mode === 'with_address';
    const isNationwideWithoutAddress = formData.ad_type === 'nationwide' && formData.nationwide_address_mode === 'without_address';
    const showAddress = isNationwideWithAddress || formData.creative_type === 'local' || formData.creative_type === 'both';

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

    // Build creative units: determines how branches are grouped for creative generation
    // - Nationwide with address: group by bundle (Helsinki/Espoo/Vantaa/Kirkkonummi) + individual unbundled branches
    // - Nationwide without address: one shared creative for all branches
    // - Local/other: one creative per branch (original behavior)
    interface CreativeUnit {
      unitKey: string;           // unique key for this unit (groupKey or branchId or "shared")
      unitLabel: string;         // label for folder naming and creative name
      locationText: string;      // address text shown in creative
      messageCopy: string;       // subheadline copy
      representativeBranch: typeof branches[0]; // branch used for city/coords
      allUnitBranches: typeof branches; // all branches in this unit (for meta variable building)
      branchIdsToMap: string[];  // all branch IDs whose urlsByAdVersion keys should point to this unit's URLs
      isMultiLocation: boolean;
      showAddr: boolean;
    }

    const creativeUnits: CreativeUnit[] = [];
    const sanitize = (s: string) => s
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    if (isNationwideWithAddress) {
      // Group branches by bundle membership
      const groups = groupBranchesByBundle(branches);
      for (const group of groups) {
        const repBranch = group.branches[0];
        creativeUnits.push({
          unitKey: group.groupKey,
          unitLabel: group.groupLabel,
          locationText: group.bundleAddress,
          messageCopy: group.bundleCopy,
          representativeBranch: repBranch,
          allUnitBranches: group.branches,
          branchIdsToMap: group.branchIds,
          isMultiLocation: group.isBundle,
          showAddr: true,
        });
      }
    } else if (isNationwideWithoutAddress) {
      // One shared creative for all branches (no address)
      const repBranch = branches[0];
      creativeUnits.push({
        unitKey: 'shared',
        unitLabel: 'Valtakunnallinen',
        locationText: '',
        messageCopy: 'Sujuvampaa suunterveyttä Suun Terveystaloissa.',
        representativeBranch: repBranch,
        allUnitBranches: branches,
        branchIdsToMap: branchIds,
        isMultiLocation: true,
        showAddr: false,
      });
    } else {
      // Local/per-branch: one creative per branch (original behavior)
      for (const branchId of branchIds) {
        const branch = branchMap.get(branchId);
        if (!branch) continue;
        const isMultiLocation = branches.length > 1;
        const branchNamesForBundle = branches.map(b => (b as any).short_name || b.name || b.city);
        const matchingBundle = isMultiLocation ? findMatchingBundle(branchNamesForBundle) : null;
        const city = branch.city || '';
        const address = branch.address || '';
        let locText: string;
        if (matchingBundle) {
          locText = matchingBundle.bundleAddress;
        } else if (isMultiLocation) {
          const uniqueCities = [...new Set(branches.map(b => (b as any).short_name || b.city))].sort();
          locText = uniqueCities.join(' \u2022 ');
        } else {
          locText = address ? `${address}, ${city}` : city;
        }
        let msgText = '';
        if (matchingBundle) {
          msgText = matchingBundle.bundleCopy;
        } else if (isMultiLocation) {
          msgText = 'Sujuvampaa suunterveyttä Suun Terveystaloissa.';
        } else {
          const cityConj = city ? getConjugatedCity(city) : '';
          msgText = cityConj
            ? `Sujuvampaa suunterveyttä ${cityConj} Suun Terveystalossa.`
            : 'Sujuvampaa suunterveyttä Suun Terveystaloissa.';
        }
        creativeUnits.push({
          unitKey: branchId,
          unitLabel: branch.city || branch.short_name || branch.name,
          locationText: locText,
          messageCopy: msgText,
          representativeBranch: branch,
          allUnitBranches: branches,
          branchIdsToMap: [branchId],
          isMultiLocation,
          showAddr: showAddress,
        });
      }
    }

    // For each creative unit × service × channel/size — render + collect upload items
    for (const unit of creativeUnits) {
      const branch = unit.representativeBranch;

      for (const serviceId of serviceIds) {
        const service = serviceMap.get(serviceId);
        if (!service) continue;

        const serviceName = service.name_fi || service.name;
        const isGeneralBrandMessage = service.code === 'yleinen-brandiviesti';
        // Determine background image gender based on service type
        const svcNameLwr = serviceName.toLowerCase();
        const autoGender = (isGeneralBrandMessage || svcNameLwr.includes('suuhygieni') || svcNameLwr.includes('hammaskiven poisto'))
          ? 'nainen'
          : svcNameLwr.includes('hammastarkastus') ? 'mies' : 'nainen';
        const adFolder = `${sanitize(unit.unitLabel)} - ${sanitize(serviceName)}`;

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
              allBranches: unit.allUnitBranches,
              allServices: services,
              formData: {
                headline: formData.headline,
                subheadline: formData.subheadline,
                offer_text: formData.service_prices?.[serviceId] || formData.offer_text,
                cta_text: formData.cta_text,
                general_brand_message: formData.general_brand_message,
                creative_type: unit.showAddr ? 'local' : formData.creative_type,
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
            // Build per-unit variables for display/pdooh
            const servicePrice = (formData.service_prices?.[serviceId] || (service.default_price || '').replace(/€/g, '').trim());
            const headlineText = formData.headline || 'Hymyile.|Olet hyvissä käsissä.';
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

            let messageText = formData.subheadline;
            if (!messageText) {
              if (isGeneralBrandMessage) {
                messageText = unit.isMultiLocation
                  ? 'Sujuvampaa suunterveyttä Suun Terveystaloissa.'
                  : unit.messageCopy;
              } else {
                messageText = unit.messageCopy;
              }
            }

            // Offer title — user-edited takes priority, then apply hyphenation for long Finnish service names
            let offerTitle = '';
            if (!isGeneralBrandMessage) {
              offerTitle = formData.offer_title || service.default_offer_fi || serviceName;
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

            // Scene 3 text lines
            const bundleCityConj = unit.isMultiLocation
              ? (unit.messageCopy.match(/suunterveyttä\s+(\S+)/)?.[1] || (city ? getConjugatedCity(city) : 'Oulun'))
              : (city ? getConjugatedCity(city) : 'Oulun');
            const scene3Vars: Record<string, string> = {
              scene3_line1: 'Sujuvampaa',
              scene3_line2: 'suun',
              scene3_line3: 'terveyttä',
              scene3_line4: bundleCityConj,
              scene3_line5: unit.isMultiLocation ? 'Suun Terveystaloissa.' : 'Suun Terveystalossa.',
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
              branch_address: unit.showAddr ? unit.locationText : '',
              city_name: city || 'Helsinki',
              ...scene3Vars,
              logo_url: `${baseUrl}/refs/assets/SuunTerveystalo_logo.png`,
              artwork_url: getOptimizedArtworkUrl(`${baseUrl}/refs/assets/terveystalo-artwork.png`, cs.width),
              image_url: getOptimizedBackgroundUrl(
                formData.background_image_url || `${baseUrl}/refs/assets/${autoGender}.jpg`,
                cs.width,
                baseUrl
              ),
              pricetag_top: (formData.background_image_url || autoGender).includes('mies') ? '920px' : '720.62px',
              click_url: formData.landing_url || 'https://terveystalo.com/suunterveystalo',
              offer_date: isGeneralBrandMessage ? '' : (formData.offer_date || 'Varaa viimeistään 28.10.'),
              disclaimer_text: (cs.type === 'pdooh' && !isGeneralBrandMessage) ? (formData.disclaimer_text || '') : '',
              legal_text: (cs.type === 'pdooh' && !isGeneralBrandMessage) ? (formData.disclaimer_text || '') : '',
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
              '<style>.Pricetag, .Price, .HammasTarkast, .HammasTarkastu, .VaronViimcist, .pricetag, .price-bubble, .price-badge-wrap, .disclaimer { display: none !important; }</style></head>');
          }
          if (!unit.showAddr) {
            html = html.replace('</head>',
              '<style>.address, .Torikatu1Laht, .Torikatu1Lahti, .branch_address, .scene-4-address { display: none !important; }</style></head>');
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
          const creativeName = `${unit.unitLabel} - ${serviceName} - ${sizeStr}`;

          // Use the first branch ID in the unit as the primary key for upload tracking
          const primaryBranchId = unit.branchIdsToMap[0];

          // Ensure ad version entry exists for the unit key
          const unitAdKey = `${unit.unitKey}::${serviceId}`;
          if (!urlsByAdVersion[unitAdKey]) {
            urlsByAdVersion[unitAdKey] = {};
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
            branchId: primaryBranchId,
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
      // Generate JPG images for PDOOH creatives (static image for BidTheatre)
      const jpgByIndex = new Map<number, string>(); // index → base64 JPG
      for (let idx = 0; idx < uploadItems.length; idx++) {
        const item = uploadItems[idx];
        if (item.channelType === 'pdooh') {
          try {
            console.log(`Rendering JPG for PDOOH creative: ${item.creative.name}`);
            const jpgBlob = await renderHtmlToJpg(item.html, {
              width: item.channelWidth,
              height: item.channelHeight,
            });
            // Convert blob to base64 string for JSON transport
            const buffer = await jpgBlob.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            jpgByIndex.set(idx, base64);
            console.log(`Generated JPG for ${item.creative.name}: ${jpgBlob.size} bytes`);
          } catch (err) {
            console.error(`JPG generation failed for ${item.creative.name}:`, err);
          }
        }
      }

      // Split into batches of 20 to avoid payload size limits
      const BATCH_SIZE = 20;
      for (let i = 0; i < uploadItems.length; i += BATCH_SIZE) {
        const batch = uploadItems.slice(i, i + BATCH_SIZE);
        try {
          const response = await fetch('/.netlify/functions/upload-creatives', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: batch.map((item, batchIdx) => ({
                storagePath: item.storagePath,
                html: item.html,
                jpgBase64: jpgByIndex.get(i + batchIdx),
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
              // Find the creative unit this item belongs to
              const matchingUnit = creativeUnits.find(u => u.branchIdsToMap.includes(item.branchId));
              const unitKey = matchingUnit ? matchingUnit.unitKey : item.branchId;
              const avKey = `${unitKey}::${item.serviceId}`;
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

    // Map unit-keyed URLs to individual branchId::serviceId keys for downstream consumers (sheets, BT)
    for (const unit of creativeUnits) {
      for (const serviceId of serviceIds) {
        const unitUrls = urlsByAdVersion[`${unit.unitKey}::${serviceId}`];
        if (!unitUrls) continue;
        for (const branchId of unit.branchIdsToMap) {
          const branchKey = `${branchId}::${serviceId}`;
          if (!urlsByAdVersion[branchKey]) {
            urlsByAdVersion[branchKey] = { ...unitUrls };
          }
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
  userId: string,
  userName?: string
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
    offer_title: formData.offer_title || null,
    service_prices: formData.service_prices || null,
    cta_text: formData.cta_text || null,
    landing_url: formData.landing_url || 'https://terveystalo.com/suunterveystalo',
    general_brand_message: formData.general_brand_message || null,
    background_image_url: formData.background_image_url || null,
    meta_primary_text: formData.meta_primary_text || null,
    meta_headline: formData.meta_headline || null,
    meta_description: formData.meta_description || null,
    offer_subtitle: formData.offer_subtitle || null,
    offer_date: formData.offer_date || null,
    disclaimer_text: formData.disclaimer_text || null,
    meta_video_url: formData.meta_video_url || null,
    meta_audio_url: formData.meta_audio_url || null,

    // New fields for campaign redesign
    ad_type: formData.ad_type,
    nationwide_address_mode: formData.nationwide_address_mode || null,
    include_pricing: formData.include_pricing,
    target_age_min: formData.target_age_min,
    target_age_max: formData.target_age_max,
    target_genders: formData.target_genders,
    campaign_objective: formData.campaign_objective || 'traffic',
    branch_radius_settings: formData.branch_radius_settings || null,
    branch_channel_budgets: formData.branch_channel_budgets || null,

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
        'Luoja': userName || 'Tuntematon',
        'Budjetti': `€${data.total_budget}`,
        'Alkaa': data.start_date,
        'Päättyy': data.end_date
      }
    ).catch(() => {}); // Fire and forget

    // Log campaign creation to activity log
    supabase.from('activity_logs').insert({
      user_id: userId,
      action: 'create',
      entity_type: 'campaign',
      entity_id: data.id,
      details: {
        name: data.name,
        user_name: userName || 'Tuntematon',
        budget: data.total_budget,
        branch: data.branch?.name || null,
        service: data.service?.name || null
      }
    }).then(() => {}).catch(() => {}); // Fire and forget

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

    // 3. Set campaign to active immediately (BT sync happens in background)
    await supabase
      .from('dental_campaigns')
      .update({ status: 'active' as CampaignStatus })
      .eq('id', data.id);

    // 4. Trigger BidTheatre campaign creation for DISPLAY / PDOOH channels
    if (data.channel_display || data.channel_pdooh) {
      try {
        console.log('Triggering BidTheatre campaign creation for', data.id);
        const btResp = await fetch('/.netlify/functions/createBidTheatreCampaign-background', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, status: 'active' }),
        });
        const btText = await btResp.text();
        console.log('BT create response:', btResp.status, btText.substring(0, 300));
      } catch (e) {
        console.error('BidTheatre campaign creation failed (non-blocking):', e);
      }
    }

    // Update Sheet with active status (fire and forget)
    updateDentalCampaignStatusInSheet(data.id, 'active')
      .catch(e => console.error('Sheet status sync failed (non-blocking):', e));
  }

  return data;
}

// ============================================================================
// CHANGE CLASSIFICATION — decides what side-effects need to run after an update
// ============================================================================

/**
 * Fields grouped by what downstream effects they trigger.
 *
 * CREATIVE_CONTENT: requires regenerating HTML/JPG creatives (re-render)
 * BT_BUDGET: requires BT cycle update (PUT cycle with new amount/dates)
 * BT_GEO: requires BT geo-target update (PUT geo-target with new radius/coords)
 * BT_ADS: requires replacing BT ads (new creatives → new ads, deactivate old)
 * SHEET_CELLS: requires updating specific sheet cells in place (no row delete)
 * SHEET_REBUILD: requires deleting + re-adding sheet rows (branch count changed)
 * METADATA_ONLY: name/description/status — sheet cell update only, no BT change
 */
const CREATIVE_CONTENT_FIELDS = [
  'headline', 'subheadline', 'offer_text', 'offer_title', 'offer_subtitle',
  'offer_date', 'disclaimer_text', 'service_prices', 'cta_text', 'landing_url',
  'background_image_url', 'general_brand_message',
  'meta_primary_text', 'meta_headline', 'meta_description',
  'meta_video_url', 'meta_audio_url',
  'nationwide_address_mode',
] as const;

const BT_BUDGET_FIELDS = [
  'total_budget', 'budget_meta', 'budget_display', 'budget_pdooh', 'budget_audio',
  'branch_channel_budgets',
  'campaign_start_date', 'campaign_end_date', 'start_date', 'end_date', 'is_ongoing',
] as const;

const BT_GEO_FIELDS = [
  'campaign_radius', 'branch_radius_settings', 'campaign_coordinates',
  'campaign_address', 'campaign_postal_code', 'campaign_city',
] as const;

const BRANCH_STRUCTURE_FIELDS = [
  'branch_id', 'branch_ids', 'service_id', 'service_ids', 'excluded_branch_ids',
] as const;

type ChangeClassification = {
  changed: Set<string>;
  needsCreativeRegen: boolean;
  needsBtBudgetUpdate: boolean;
  needsBtGeoUpdate: boolean;
  needsBtAdReplacement: boolean;
  needsSheetRowRebuild: boolean;
  needsSheetCellUpdate: boolean;
  isNoop: boolean;
};

/** Shallow deep-equal for the values we actually compare (primitives, arrays, plain objects) */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    return ak.every(k => deepEqual(a[k], b[k]));
  }
  return false;
}

function classifyChanges(
  existing: DentalCampaign,
  updates: Partial<DentalCampaign>
): ChangeClassification {
  const changed = new Set<string>();
  const e = existing as any;
  const u = updates as any;

  // Detect which fields actually changed
  for (const key of Object.keys(u)) {
    if (u[key] === undefined) continue;
    if (!deepEqual(e[key], u[key])) {
      changed.add(key);
    }
  }

  const hit = (fields: readonly string[]) => fields.some(f => changed.has(f));

  const creativeContentChanged = hit(CREATIVE_CONTENT_FIELDS);
  const budgetChanged = hit(BT_BUDGET_FIELDS);
  const geoChanged = hit(BT_GEO_FIELDS);
  const branchStructureChanged = hit(BRANCH_STRUCTURE_FIELDS);

  return {
    changed,
    needsCreativeRegen: creativeContentChanged || branchStructureChanged,
    needsBtBudgetUpdate: budgetChanged || branchStructureChanged,
    needsBtGeoUpdate: geoChanged,
    // Replacing ads is only needed when creatives actually change visually
    // OR when branch structure changes (add/remove branches)
    needsBtAdReplacement: creativeContentChanged || branchStructureChanged,
    // Full sheet rebuild only when row count could change
    needsSheetRowRebuild: branchStructureChanged,
    // Cell-level updates cover any scalar change (budget, radius, name, status)
    needsSheetCellUpdate: changed.size > 0 && !branchStructureChanged,
    isNoop: changed.size === 0,
  };
}

/**
 * Update a campaign with smart change detection.
 *
 * Budget-only edits skip creative regeneration and BT ad replacement.
 * Radius-only edits skip everything except BT geo-target update.
 * This prevents the "edit budget → all ads regenerated" disaster of April 2026.
 *
 * @param options.force — force full regeneration regardless of changes (legacy behavior)
 * @param options.skipCreativeRegeneration — manual override (deprecated, classification handles it)
 */
export async function updateCampaign(
  id: string,
  updates: Partial<DentalCampaign>,
  options?: { skipCreativeRegeneration?: boolean; force?: boolean }
): Promise<DentalCampaign | null> {
  // 1. Fetch existing campaign so we can classify the changes
  const { data: existing, error: fetchErr } = await supabase
    .from('dental_campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !existing) {
    throw new Error(`Campaign not found: ${fetchErr?.message || 'unknown'}`);
  }

  // 2. Classify what actually changed
  const classification = options?.force
    ? {
        changed: new Set<string>(Object.keys(updates)),
        needsCreativeRegen: !options?.skipCreativeRegeneration,
        needsBtBudgetUpdate: true,
        needsBtGeoUpdate: true,
        needsBtAdReplacement: !options?.skipCreativeRegeneration,
        needsSheetRowRebuild: true,
        needsSheetCellUpdate: false,
        isNoop: false,
      }
    : classifyChanges(existing as DentalCampaign, updates);

  console.log('[updateCampaign] Change classification:', {
    changed: Array.from(classification.changed),
    needsCreativeRegen: classification.needsCreativeRegen,
    needsBtBudgetUpdate: classification.needsBtBudgetUpdate,
    needsBtGeoUpdate: classification.needsBtGeoUpdate,
    needsBtAdReplacement: classification.needsBtAdReplacement,
    needsSheetRowRebuild: classification.needsSheetRowRebuild,
  });

  if (classification.isNoop) {
    console.log('[updateCampaign] No actual changes detected — skipping all side effects');
    return existing as DentalCampaign;
  }

  // 3. Whitelist DB columns (unchanged from before)
  const u = updates as any;
  const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
  const dbColumns = [
    'name', 'description', 'service_id', 'service_ids', 'branch_id', 'branch_ids',
    'campaign_address', 'campaign_postal_code', 'campaign_city', 'campaign_radius', 'campaign_coordinates',
    'start_date', 'end_date', 'campaign_start_date', 'campaign_end_date', 'is_ongoing',
    'total_budget', 'budget_meta', 'budget_display', 'budget_pdooh', 'budget_audio',
    'channel_meta', 'channel_display', 'channel_pdooh', 'channel_audio',
    'creative_type', 'headline', 'subheadline', 'offer_text', 'offer_title', 'offer_subtitle',
    'offer_date', 'disclaimer_text', 'service_prices',
    'cta_text', 'landing_url', 'background_image_url', 'general_brand_message',
    'meta_primary_text', 'meta_headline', 'meta_description',
    'meta_video_url', 'meta_audio_url',
    'ad_type', 'nationwide_address_mode', 'include_pricing',
    'target_age_min', 'target_age_max', 'target_genders', 'campaign_objective',
    'excluded_branch_ids', 'branch_radius_settings', 'branch_channel_budgets',
    'status', 'bt_campaign_id', 'bt_advertiser_id', 'bt_sync_status', 'bt_last_sync', 'bt_sync_error',
    'bidding_strategy', 'max_cpm_display', 'max_cpm_pdooh',
  ];
  for (const col of dbColumns) {
    if (u[col] !== undefined) {
      dbUpdates[col] = u[col];
    }
  }

  // 4. Write to DB
  const { data, error } = await supabase
    .from('dental_campaigns')
    .update(dbUpdates)
    .eq('id', id)
    .select(`
      *,
      service:services(*),
      branch:branches(*)
    `)
    .single();

  if (error) {
    console.error('Failed to update campaign:', error.message, error.details, error.hint);
    throw new Error(`Kampanjan päivitys epäonnistui: ${error.message}`);
  }

  if (!data) return data;

  // 5. Creative regeneration — only when creative content actually changed
  let creativeUrlsByAdVersion: Record<string, AdVersionUrls> = {};
  if (classification.needsCreativeRegen && !options?.skipCreativeRegeneration) {
    try {
      creativeUrlsByAdVersion = await createCampaignCreatives(id, data as any);
      console.log('[updateCampaign] Creatives regenerated');
    } catch (e) {
      console.error('[updateCampaign] Creative regeneration failed (non-blocking):', e);
    }
  } else {
    console.log('[updateCampaign] Skipping creative regeneration — not needed for this change type');
  }

  // 6. Sheet sync
  const sheetData = {
    ...data,
    meta_primary_text: (updates as any).meta_primary_text || data.meta_primary_text || '',
    meta_headline: (updates as any).meta_headline || data.meta_headline || '',
    meta_description: (updates as any).meta_description || data.meta_description || '',
    excluded_branch_ids: (updates as any).excluded_branch_ids || (data as any).excluded_branch_ids || [],
    offer_date: (updates as any).offer_date || (data as any).offer_date || '',
    offer_subtitle: (updates as any).offer_subtitle || (data as any).offer_subtitle || '',
  };

  if (classification.needsSheetRowRebuild) {
    // Branch count might have changed — safe to delete + re-add all rows
    updateDentalCampaignInSheet(sheetData, creativeUrlsByAdVersion)
      .catch(e => console.error('[updateCampaign] Sheet row rebuild failed (non-blocking):', e));
  } else if (classification.needsSheetCellUpdate) {
    // Targeted cell update — don't touch other fields
    const cellUpdates: Record<string, any> = {};
    if (classification.changed.has('total_budget')) cellUpdates.total_budget = data.total_budget;
    if (classification.changed.has('budget_meta')) cellUpdates.budget_meta = data.budget_meta;
    if (classification.changed.has('budget_display')) cellUpdates.budget_display = data.budget_display;
    if (classification.changed.has('budget_pdooh')) cellUpdates.budget_pdooh = data.budget_pdooh;
    if (classification.changed.has('budget_audio')) cellUpdates.budget_audio = data.budget_audio;
    if (classification.changed.has('campaign_radius')) cellUpdates.campaign_radius = data.campaign_radius;
    if (classification.changed.has('branch_channel_budgets')) {
      cellUpdates.branch_channel_budgets = (data as any).branch_channel_budgets;
    }
    if (classification.changed.has('branch_radius_settings')) {
      cellUpdates.branch_radius_settings = (data as any).branch_radius_settings;
    }
    if (classification.changed.has('status')) cellUpdates.status = data.status;
    if (classification.changed.has('name')) cellUpdates.name = data.name;
    if (classification.changed.has('campaign_start_date')) cellUpdates.campaign_start_date = data.campaign_start_date;
    if (classification.changed.has('campaign_end_date')) cellUpdates.campaign_end_date = data.campaign_end_date;

    // Fall back to row rebuild if we have no targeted updater yet, but log it clearly
    // so it's easy to spot in prod logs. The targeted cell updater can be added incrementally.
    console.log('[updateCampaign] Sheet cell update changes:', Object.keys(cellUpdates));

    // Use delete+re-add for now, but with preserved data — this is SAFER than the old path
    // because we no longer do it on no-op changes. TODO: implement true cell-level patching.
    updateDentalCampaignInSheet(sheetData, creativeUrlsByAdVersion)
      .catch(e => console.error('[updateCampaign] Sheet cell update failed (non-blocking):', e));
  }

  // 7. BidTheatre update — pass targeted flags so the netlify function knows what to do
  if ((data.channel_display || data.channel_pdooh) &&
      (classification.needsBtBudgetUpdate || classification.needsBtGeoUpdate || classification.needsBtAdReplacement)) {
    const btPayload = {
      id,
      updateBudget: classification.needsBtBudgetUpdate,
      updateGeo: classification.needsBtGeoUpdate,
      updateAds: classification.needsBtAdReplacement,
    };
    console.log('[updateCampaign] Triggering BT update:', btPayload);
    fetch('/.netlify/functions/updateBidTheatreCampaign-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(btPayload),
    }).catch(e => console.error('[updateCampaign] BT update sync failed (non-blocking):', e));
  } else {
    console.log('[updateCampaign] Skipping BT update — no BT-affecting changes');
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
    .or(`branch_id.eq.${branchId},branch_ids.cs.{"${branchId}"}`)
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
    creator: _creator,
    spent_budget: _spent,
    total_impressions: _impressions,
    total_clicks: _clicks,
    ctr: _ctr,
    sheet_row_id: _sheetRow,
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
