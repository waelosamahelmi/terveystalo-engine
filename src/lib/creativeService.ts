// ============================================================================
// SUUN TERVEYSTALO - Creative Service
// Handles creative generation, templates, and media management
// ============================================================================

import { supabase } from './supabase';
import type { Creative, CreativeTemplate, CreativeTemplateSummary, CreativeStatus } from '../types';

/**
 * Get all creative templates
 */
export async function getCreativeTemplates(filters?: {
  type?: string;
  category?: string;
  active?: boolean;
  size?: string;
  tags?: string[];
}): Promise<CreativeTemplate[]> {
  let query = supabase
    .from('creative_templates')
    .select('*')
    .order('sort_order');

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.active !== undefined) {
    query = query.eq('active', filters.active);
  }

  if (filters?.size) {
    query = query.eq('size', filters.size);
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch creative templates:', error);
    return [];
  }

  return data || [];
}

/**
 * Get template summaries (lightweight list without full HTML)
 */
export async function getCreativeTemplateSummaries(filters?: {
  type?: string;
  active?: boolean;
}): Promise<CreativeTemplateSummary[]> {
  let query = supabase
    .from('creative_templates_summary')
    .select('*')
    .order('sort_order');

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.active !== undefined) {
    query = query.eq('active', filters.active);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch creative template summaries:', error);
    return [];
  }

  return data || [];
}

/**
 * Get templates by channel type
 */
export async function getTemplatesByChannel(channel: 'display' | 'pdooh' | 'meta' | 'audio'): Promise<CreativeTemplate[]> {
  return getCreativeTemplates({ type: channel, active: true });
}

/**
 * Get templates by size
 */
export async function getTemplatesBySize(size: string): Promise<CreativeTemplate[]> {
  return getCreativeTemplates({ size, active: true });
}

/**
 * Get a single creative template by ID
 */
export async function getCreativeTemplate(templateId: string): Promise<CreativeTemplate | null> {
  const { data, error } = await supabase
    .from('creative_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Failed to fetch creative template:', error);
    return null;
  }

  return data;
}

/**
 * Rewrite font URLs in creative HTML to use the current origin.
 * Templates stored in the DB may reference the production Netlify domain
 * (https://suunterveystalo.netlify.app/font/...) or use root-relative paths
 * (/font/...). When rendered inside a srcDoc iframe at localhost, these
 * would fail with CORS errors. This rewrites them to the current origin.
 */
export function fixFontUrls(html: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  if (!base) return html;

  return html
    // Absolute netlify URLs → current origin
    .replace(/https:\/\/suunterveystalo\.netlify\.app\/font\//g, `${base}/font/`)
    // Root-relative /font/ paths inside url() → absolute current origin
    .replace(/url\((['"]?)\/font\//g, `url($1${base}/font/`);
}

/**
 * Render template HTML with provided variables
 */
export function renderTemplateHtml(
  template: CreativeTemplate,
  variables: Record<string, string>
): string {
  let html = template.html_template;

  // Add data attribute to body for CSS targeting based on template size
  const sizeAttr = `data-template-size="${template.size || 'unknown'}"`;
  html = html.replace('<html', `<html ${sizeAttr}`).replace('<body', `<body ${sizeAttr}`);

  // Detect if template uses split structure (has {{headline_line2}} placeholder)
  const isSplitStructure = html.includes('{{headline_line2}}');
  const hasHeadlinePlaceholder = html.includes('{{headline}}');

  console.log('[renderTemplateHtml] Template:', template.name, 'isSplit:', isSplitStructure, 'hasHeadline:', hasHeadlinePlaceholder);

  // Merge default values with provided variables
  const mergedVars = {
    ...template.default_values,
    ...variables
  };

  console.log('[renderTemplateHtml] Before fix - headline:', mergedVars.headline, 'headline_line2:', mergedVars.headline_line2);

  // Debug for PDOOH
  if (template.size === '1080x1920' && template.type === 'pdooh') {
    console.log('[PDOOH Debug] headline:', mergedVars.headline, 'headline_line2:', mergedVars.headline_line2, 'default_values:', template.default_values);
  }

  // For split-structure templates, if headline_line2 is provided but headline has | in defaults,
  // use the provided split values. Otherwise, split the headline value.
  // NOTE: We no longer auto-split headlines with | - this allows | to be converted to <br/>
  // for templates that want the headline in a single element with line breaks.
  if (isSplitStructure && hasHeadlinePlaceholder) {
    const providedLine2 = mergedVars.headline_line2;

    // Only split if headline_line2 was explicitly provided by the caller (non-empty string)
    // Do NOT auto-split headlines containing | - let | be converted to <br/> in the placeholder
    if (providedLine2 && String(providedLine2).trim()) {
      // Use the explicitly provided headline_line2
      console.log('[renderTemplateHtml] SPLIT template - using provided headline_line2:', mergedVars.headline, '+', providedLine2);
    }
    // If headline_line2 is not provided or is empty, keep the full headline with | intact
    // The | will be converted to <br/> in the placeholder replacement step
  } else if (hasHeadlinePlaceholder) {
    // For combined structure, ensure the full headline with | is used
    // If only split parts were provided, recombine them
    const headlineValue = String(mergedVars.headline || '');
    const headlineLine2Value = mergedVars.headline_line2;

    console.log('[renderTemplateHtml] COMBINED template - headlineValue:', headlineValue, 'headlineLine2:', headlineLine2Value);

    // Check if we need to recombine
    const needsRecombine = !headlineValue.includes('|') && !headlineValue.includes('<br>') && headlineLine2Value;
    console.log('[renderTemplateHtml] Needs recombine:', needsRecombine);

    if (needsRecombine) {
      mergedVars.headline = `${headlineValue}|${headlineLine2Value}`;
      console.log('[renderTemplateHtml] Recombined to:', mergedVars.headline);
    }
  }

  console.log('[renderTemplateHtml] After fix - headline:', mergedVars.headline);

  // Replace all placeholders
  Object.entries(mergedVars).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    // Convert newlines and | to <br> for multi-line text support
    let processedValue = String(value)
      .replace(/\n/g, '<br>')
      .replace(/\|/g, '<br>');
    html = html.replace(regex, processedValue);
  });

  // Fix font URLs for local dev / cross-origin iframe previews
  html = fixFontUrls(html);

  // Inject CSS to hide empty headline_line2 elements (for split templates using single headline with <br/>)
  // Also widen headline elements for 300x431 and 300x600 to fit text on one line
  const hideEmptyLine2Css = `
    <style>
      .OletHyvissKS:empty, .headline_line2:empty, [class*="Olet"]:empty {
        display: none !important;
      }
      /* Widen headline elements for 300x431 and 300x600 (split templates) to fit full headline on one line */
      /* Only apply to small split templates, NOT to PDOOH 1080x1920 which uses its own layout */
      html:has(.OletHyvissKS):not([data-template-size="1080x1920"]) .Hymyile {
        width: 280px !important;
        min-width: 280px !important;
        max-width: 280px !important;
        white-space: normal !important;
        text-align: center !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
      }
      /* Allow br to create line break within headline element */
      .Hymyile br {
        display: block !important;
        margin-top: 4px !important;
      }
      /* Fix 300x300 address alignment - left align with logo and other text */
      [data-template-size="300x300"] .Torikatu1Laht,
      [data-template-size="300x300"] div.Torikatu1Laht {
        text-align: left !important;
        justify-content: flex-start !important;
        left: 15px !important;
        width: 270px !important;
        margin-top: 5px !important;
      }
    </style>
  `;
  html = html.replace('</head>', hideEmptyLine2Css + '</head>');

  // Inject CSS for text wrapping and line break fixes
  const fixCss = `
    <style>
      /* Make text elements flexible for better wrapping */
      .HymyileOletHy, .Hymyile, .OletHyvissKS, .SujuvampaaSuunt {
        height: auto !important;
        max-height: unset !important;
        line-height: 1.15 !important;
      }
      /* Tighter line spacing for multi-line text */
      .HymyileOletHy br, .Hymyile br, .OletHyvissKS br {
        display: block;
        margin-top: -0.15em;
      }
      /* Override for PDOOH 1080x1920 - positive line spacing */
      [data-template-size="1080x1920"] .Hymyile br {
        margin-top: 8px !important;
      }
      /* PDOOH 1080x1920 specific fixes - bigger headline, centered */
      [data-template-size="1080x1920"] .OletHyvissKS {
        white-space: nowrap !important;
        width: 900px !important;
        min-width: unset !important;
        max-width: 1080px !important;
        left: 90px !important;
        font-size: 88px !important;
      }
      [data-template-size="1080x1920"] .Hymyile {
        width: 600px !important;
        min-width: unset !important;
        max-width: unset !important;
        left: 240px !important;
        font-size: 100px !important;
      }
    </style>
  `;
  html = html.replace('</head>', fixCss + '</head>');

  return html;
}

/**
 * Get available template sizes for a channel type
 */
export async function getAvailableTemplateSizes(channel?: string): Promise<string[]> {
  let query = supabase
    .from('creative_templates')
    .select('size')
    .eq('active', true);

  if (channel) {
    query = query.eq('type', channel);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch template sizes:', error);
    return [];
  }

  // Get unique sizes
  const sizes = [...new Set(data?.map(t => t.size) || [])];
  return sizes.sort();
}

/**
 * Get all creatives for a campaign
 */
export async function getCampaignCreatives(campaignId: string): Promise<Creative[]> {
  const { data, error } = await supabase
    .from('creatives')
    .select(`
      *,
      template:creative_templates(*)
    `)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch campaign creatives:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all creatives with optional filters
 */
export async function getCreatives(filters?: {
  status?: CreativeStatus;
  type?: string;
  campaignId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ creatives: Creative[]; total: number }> {
  let query = supabase
    .from('creatives')
    .select(`
      *,
      template:creative_templates(*),
      campaign:dental_campaigns(name, status)
    `, { count: 'exact' });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.campaignId) {
    query = query.eq('campaign_id', filters.campaignId);
  }

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  // Pagination
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  query = query.range(start, end).order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error('Failed to fetch creatives:', error);
    return { creatives: [], total: 0 };
  }

  return { creatives: data || [], total: count || 0 };
}

/**
 * Get a single creative by ID
 */
export async function getCreative(creativeId: string): Promise<Creative | null> {
  const { data, error } = await supabase
    .from('creatives')
    .select(`
      *,
      template:creative_templates(*),
      campaign:dental_campaigns(name, status)
    `)
    .eq('id', creativeId)
    .single();

  if (error) {
    console.error('Failed to fetch creative:', error);
    return null;
  }

  return data;
}

/**
 * Create a new creative
 */
export async function createCreative(creative: {
  campaign_id: string;
  template_id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  variables: Record<string, any>;
}): Promise<Creative | null> {
  const { data, error } = await supabase
    .from('creatives')
    .insert({
      ...creative,
      status: 'draft',
      version: 1
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create creative:', error);
    return null;
  }

  return data;
}

/**
 * Update a creative
 */
export async function updateCreative(
  creativeId: string,
  updates: Partial<Creative>
): Promise<Creative | null> {
  // Get current version
  const { data: current } = await supabase
    .from('creatives')
    .select('version')
    .eq('id', creativeId)
    .single();

  const { data, error } = await supabase
    .from('creatives')
    .update({
      ...updates,
      version: (current?.version || 1) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', creativeId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update creative:', error);
    return null;
  }

  return data;
}

/**
 * Delete a creative
 */
export async function deleteCreative(creativeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('creatives')
    .delete()
    .eq('id', creativeId);

  if (error) {
    console.error('Failed to delete creative:', error);
    return false;
  }

  return true;
}

/**
 * Update creative status
 */
export async function updateCreativeStatus(
  creativeId: string,
  status: CreativeStatus
): Promise<boolean> {
  const { error } = await supabase
    .from('creatives')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', creativeId);

  if (error) {
    console.error('Failed to update creative status:', error);
    return false;
  }

  return true;
}

/**
 * Generate creative HTML from template
 */
export async function generateCreativeHTML(
  templateId: string,
  variables: Record<string, unknown>
): Promise<string> {
  const template = await getCreativeTemplate(templateId);
  
  if (!template) {
    throw new Error('Template not found');
  }

  let html = template.html_content || '';

  // Replace all variables in the template
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    html = html.replace(regex, String(value));
  });

  return html;
}

/**
 * Render creative preview
 */
export async function renderCreativePreview(
  creativeId: string
): Promise<{ html: string; width: number; height: number } | null> {
  const creative = await getCreative(creativeId);
  
  if (!creative) {
    return null;
  }

  // If rendered_html exists, use it
  if (creative.rendered_html) {
    return {
      html: creative.rendered_html,
      width: creative.width,
      height: creative.height
    };
  }

  // Otherwise generate from template
  const html = await generateCreativeHTML(creative.template_id, creative.variables || {});
  
  // Save rendered HTML for future use
  await supabase
    .from('creatives')
    .update({ rendered_html: html })
    .eq('id', creativeId);

  return {
    html,
    width: creative.width,
    height: creative.height
  };
}

/**
 * Upload media file to Supabase Storage
 */
export async function uploadMedia(
  file: File,
  folder: string = 'creatives'
): Promise<{ url: string; path: string } | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Failed to upload media:', uploadError);
    
    // Provide helpful error messages
    if (uploadError.message?.includes('row-level security')) {
      console.error('RLS Policy Error: The media bucket requires proper storage policies. Go to Supabase Dashboard > Storage > media bucket > Policies and add an INSERT policy.');
    }
    
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('media')
    .getPublicUrl(filePath);

  return {
    url: urlData.publicUrl,
    path: filePath
  };
}

/**
 * Delete media file from Supabase Storage
 */
export async function deleteMedia(filePath: string): Promise<boolean> {
  const { error } = await supabase.storage
    .from('media')
    .remove([filePath]);

  if (error) {
    console.error('Failed to delete media:', error);
    return false;
  }

  return true;
}

/**
 * Generate MP4 video creative for Meta ads by compositing overlay text onto a background video.
 * Uses Canvas + MediaRecorder to produce a WebM/MP4 blob.
 *
 * @param backgroundVideoUrl - URL of the background video (e.g. /meta/vids/nainen.mp4)
 * @param overlayConfig - Text overlay configuration (headline, offer, CTA, address, etc.)
 * @param audioUrl - Optional audio track URL
 * @param size - Video dimensions { width, height } (default 1080x1920)
 * @returns Blob of the recorded video
 */
export async function generateMetaVideoCreative(
  backgroundVideoUrl: string,
  overlayConfig: {
    headline?: string;
    subheadline?: string;
    offerTitle?: string;
    price?: string;
    cta?: string;
    branchAddress?: string;
    logoUrl?: string;
  },
  audioUrl?: string | null,
  size: { width: number; height: number } = { width: 1080, height: 1920 }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Failed to create canvas context'));
      return;
    }

    // Create video element for background
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.src = backgroundVideoUrl;

    // Create audio element if provided
    let audio: HTMLAudioElement | null = null;
    if (audioUrl) {
      audio = document.createElement('audio');
      audio.crossOrigin = 'anonymous';
      audio.src = audioUrl;
    }

    // Load logo image
    let logoImg: HTMLImageElement | null = null;
    if (overlayConfig.logoUrl) {
      logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = overlayConfig.logoUrl;
    }

    video.addEventListener('loadeddata', async () => {
      try {
        // Set up MediaRecorder with canvas stream
        const stream = canvas.captureStream(30); // 30 FPS

        // If we have audio, try to add the audio track
        if (audio && audioUrl) {
          try {
            const audioCtx = new AudioContext();
            const audioSource = audioCtx.createMediaElementSource(audio);
            const dest = audioCtx.createMediaStreamDestination();
            audioSource.connect(dest);
            audioSource.connect(audioCtx.destination);
            dest.stream.getAudioTracks().forEach(track => stream.addTrack(track));
          } catch {
            console.warn('Could not add audio track to video recording');
          }
        }

        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };

        recorder.onerror = (e) => reject(e);

        // Start recording
        recorder.start();

        // Play video (and audio)
        video.play();
        if (audio) audio.play().catch(() => {});

        // Draw frames
        const drawFrame = () => {
          if (video.ended || video.paused) {
            recorder.stop();
            return;
          }

          // Draw background video
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Draw semi-transparent overlay at bottom
          const overlayY = canvas.height * 0.55;
          const gradient = ctx.createLinearGradient(0, overlayY, 0, canvas.height);
          gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
          gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.7)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, overlayY, canvas.width, canvas.height - overlayY);

          // Draw logo at top
          if (logoImg && logoImg.complete) {
            const logoH = 60;
            const logoW = (logoImg.width / logoImg.height) * logoH;
            ctx.drawImage(logoImg, (canvas.width - logoW) / 2, 40, logoW, logoH);
          }

          // Draw text overlay
          const textX = canvas.width / 2;
          let textY = canvas.height * 0.65;

          // Headline
          if (overlayConfig.headline) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 64px Inter, sans-serif';
            ctx.textAlign = 'center';
            const lines = overlayConfig.headline.replace(/<br\s*\/?>/gi, '\n').split(/[|\n]/);
            for (const line of lines) {
              ctx.fillText(line.trim(), textX, textY);
              textY += 75;
            }
          }

          // Subheadline
          if (overlayConfig.subheadline) {
            ctx.fillStyle = '#E0E0E0';
            ctx.font = '36px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(overlayConfig.subheadline.replace(/<br\s*\/?>/gi, ' '), textX, textY + 10);
            textY += 60;
          }

          // Price bubble
          if (overlayConfig.price && overlayConfig.offerTitle) {
            const bubbleY = textY + 20;
            // Draw price circle
            ctx.fillStyle = '#E31E24';
            ctx.beginPath();
            ctx.arc(textX, bubbleY + 50, 80, 0, Math.PI * 2);
            ctx.fill();

            // Offer title
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(overlayConfig.offerTitle.replace(/[|\n]/g, ' '), textX, bubbleY + 30);

            // Price
            ctx.font = 'bold 48px Inter, sans-serif';
            ctx.fillText(`${overlayConfig.price}€`, textX, bubbleY + 75);

            textY = bubbleY + 140;
          }

          // CTA button
          if (overlayConfig.cta) {
            const ctaY = textY + 20;
            const ctaW = 300;
            const ctaH = 60;
            const ctaX = (canvas.width - ctaW) / 2;

            // Button background
            ctx.fillStyle = '#00A5B5';
            ctx.beginPath();
            ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 30);
            ctx.fill();

            // Button text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 28px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(overlayConfig.cta, textX, ctaY + 40);
            textY = ctaY + ctaH + 20;
          }

          // Branch address at bottom
          if (overlayConfig.branchAddress) {
            ctx.fillStyle = '#CCCCCC';
            ctx.font = '24px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(overlayConfig.branchAddress, textX, canvas.height - 40);
          }

          requestAnimationFrame(drawFrame);
        };

        drawFrame();

        // Stop recording after video ends (max 30 seconds safety)
        const maxDuration = Math.min((video.duration || 15) * 1000, 30000);
        setTimeout(() => {
          if (recorder.state === 'recording') {
            video.pause();
            recorder.stop();
          }
        }, maxDuration);

      } catch (error) {
        reject(error);
      }
    });

    video.addEventListener('error', () => reject(new Error('Failed to load background video')));
    video.load();
  });
}

/**
 * Generate and upload a single Meta video creative.
 * Uploads to Supabase storage under a structured folder path and creates a creative DB record.
 *
 * @param campaignId - Campaign ID
 * @param creativeName - Human-readable name for the creative record
 * @param storagePath - Supabase storage folder path (e.g. "meta-creatives/{campaignId}/{adName}")
 * @param backgroundVideoUrl - Background video URL
 * @param overlayConfig - Text overlay config
 * @param audioUrl - Audio track URL
 * @param size - Video dimensions
 */
export async function generateAndUploadMetaCreative(
  campaignId: string,
  creativeName: string,
  storagePath: string,
  backgroundVideoUrl: string,
  overlayConfig: {
    headline?: string;
    subheadline?: string;
    offerTitle?: string;
    price?: string;
    cta?: string;
    branchAddress?: string;
    logoUrl?: string;
  },
  audioUrl?: string | null,
  size: { width: number; height: number } = { width: 1080, height: 1920 }
): Promise<{ url: string; creativeId: string } | null> {
  try {
    const sizeStr = `${size.width}x${size.height}`;
    console.log(`Generating Meta video ${sizeStr} for "${creativeName}"...`);

    // Generate the video blob at the requested size
    const videoBlob = await generateMetaVideoCreative(backgroundVideoUrl, overlayConfig, audioUrl, size);

    // Create a File object for upload with structured path
    const fileName = `${sizeStr}-${Date.now()}.webm`;
    const videoFile = new File([videoBlob], fileName, { type: videoBlob.type });

    // Upload to Supabase storage under the structured folder
    const uploadResult = await uploadMedia(videoFile, storagePath);
    if (!uploadResult) {
      console.error(`Failed to upload Meta video creative ${sizeStr}`);
      return null;
    }

    // Create creative record in database
    const { data, error } = await supabase
      .from('creatives')
      .insert({
        campaign_id: campaignId,
        template_id: 'meta-video',
        name: `${creativeName} - ${sizeStr}`,
        type: 'meta',
        size: sizeStr,
        width: size.width,
        height: size.height,
        image_url: uploadResult.url,
        preview_url: uploadResult.url,
        variables: overlayConfig as any,
        status: 'ready',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create Meta video creative record:', error);
      return null;
    }

    console.log(`Meta video creative created: ${data.id} -> ${uploadResult.url}`);
    return { url: uploadResult.url, creativeId: data.id };
  } catch (error) {
    console.error(`Error generating Meta video creative ${creativeName}:`, error);
    return null;
  }
}

/**
 * Generate all Meta video creatives for a campaign.
 * Creates videos for each combination of: branch × service × dimension.
 * Organized in Supabase storage as: meta-creatives/{campaignId}/{adName}/{dimension}.webm
 */
export async function generateAllMetaCreatives(
  campaignId: string,
  campaignName: string,
  formData: {
    service_ids: string[];
    branch_ids: string[];
    headline?: string;
    subheadline?: string;
    offer_text?: string;
    cta_text?: string;
    general_brand_message?: string;
    creative_type: string;
    campaign_address?: string;
    meta_video_url?: string;
    meta_audio_url?: string;
  },
  branches: Array<{ id: string; name: string; address: string; city: string }>,
  services: Array<{ id: string; name: string; name_fi: string; default_price?: string; default_offer_fi?: string }>
): Promise<{ url: string; creativeId: string }[]> {
  const results: { url: string; creativeId: string }[] = [];

  const backgroundVideo = formData.meta_video_url || '/meta/vids/nainen.mp4';
  const audioTrack = formData.meta_audio_url || '/meta/audio/Terveystalo Suun TT TVC Brändillinen 15s 2025 09 23 Net Master -14LUFS.wav';
  const isGeneralBrandMessage = formData.general_brand_message && formData.general_brand_message.length > 0;
  const showAddress = formData.creative_type === 'local' || formData.creative_type === 'both';

  // Meta video dimensions
  const metaSizes = [
    { width: 1080, height: 1080 },  // Feed (Square)
    { width: 1080, height: 1920 },  // Stories/Reels (Portrait)
  ];

  // Get the branch and service lists to iterate
  const branchList = branches.filter(b => formData.branch_ids.includes(b.id));
  const serviceList = services.filter(s => formData.service_ids.includes(s.id));

  // If no branches/services found, use fallback
  if (branchList.length === 0) {
    branchList.push({ id: 'default', name: 'Default', address: formData.campaign_address || '', city: '' });
  }
  if (serviceList.length === 0) {
    serviceList.push({ id: 'default', name: campaignName, name_fi: campaignName, default_price: formData.offer_text });
  }

  console.log(`Generating Meta creatives: ${branchList.length} branches × ${serviceList.length} services × ${metaSizes.length} sizes = ${branchList.length * serviceList.length * metaSizes.length} total`);

  for (const branch of branchList) {
    for (const service of serviceList) {
      // Build ad name for folder structure
      const serviceName = service.name_fi || service.name;
      const branchCity = branch.city || '';
      const adName = `${serviceName}${branchCity ? ` - ${branchCity}` : ''}`.replace(/[/\\:*?"<>|]/g, '_');

      // Build overlay config for this branch+service combination
      const overlayConfig = {
        headline: formData.headline || 'Hymyile.\nOlet hyvissä käsissä.',
        subheadline: formData.subheadline || 'Sujuvampaa suunterveyttä.',
        offerTitle: isGeneralBrandMessage ? undefined : (service.default_offer_fi || serviceName),
        price: isGeneralBrandMessage ? undefined : (service.default_price || formData.offer_text || '49'),
        cta: formData.cta_text || 'Varaa aika',
        branchAddress: showAddress ? `${branch.address}, ${branch.city}` : undefined,
        logoUrl: '/refs/assets/SuunTerveystalo_logo.png',
      };

      // Storage folder: meta-creatives/{campaignId}/{adName}/
      const storagePath = `meta-creatives/${campaignId}/${adName}`;

      for (const size of metaSizes) {
        try {
          const result = await generateAndUploadMetaCreative(
            campaignId,
            `${campaignName} - ${adName}`,
            storagePath,
            backgroundVideo,
            overlayConfig,
            audioTrack,
            size
          );

          if (result) {
            results.push(result);
          }
        } catch (err) {
          console.error(`Failed to generate Meta creative ${adName} ${size.width}x${size.height}:`, err);
        }
      }
    }
  }

  console.log(`Generated ${results.length} Meta video creatives for campaign ${campaignId}`);
  return results;
}

/**
 * Get all brand assets from database
 */
export async function getBrandAssets(): Promise<{
  logos: string[];
  images: string[];
  fonts: string[];
}> {
  // First try to get from brand_assets table
  const { data: dbAssets, error: dbError } = await supabase
    .from('brand_assets')
    .select('*')
    .order('created_at', { ascending: false });

  if (!dbError && dbAssets && dbAssets.length > 0) {
    const assets = {
      logos: [] as string[],
      images: [] as string[],
      fonts: [] as string[]
    };

    dbAssets.forEach(asset => {
      if (asset.type === 'logo') {
        assets.logos.push(asset.url);
      } else if (asset.type === 'favicon' || asset.type === 'image') {
        assets.images.push(asset.url);
      } else if (asset.type === 'font') {
        assets.fonts.push(asset.url);
      }
    });

    return assets;
  }

  // Fallback: try to get from storage
  const { data: files, error } = await supabase.storage
    .from('media')
    .list('brand-assets', { sortBy: { column: 'name', order: 'asc' } });

  if (error) {
    console.error('Failed to fetch brand assets:', error);
    return { logos: [], images: [], fonts: [] };
  }

  const assets = {
    logos: [] as string[],
    images: [] as string[],
    fonts: [] as string[]
  };

  files?.forEach(file => {
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(`brand-assets/${file.name}`);
    
    const url = urlData.publicUrl;
    
    if (file.name.toLowerCase().includes('logo')) {
      assets.logos.push(url);
    } else if (file.metadata?.mimetype?.startsWith('image/')) {
      assets.images.push(url);
    } else if (file.name.endsWith('.woff') || file.name.endsWith('.woff2') || file.name.endsWith('.ttf')) {
      assets.fonts.push(url);
    }
  });

  return assets;
}

/**
 * Get creative sizes/formats
 */
export async function getCreativeSizes(): Promise<Array<{
  name: string;
  width: number;
  height: number;
  type: string;
}>> {
  // Standard DOOH and display sizes
  return [
    // DOOH formats
    { name: 'Digital Billboard', width: 1920, height: 1080, type: 'dooh' },
    { name: 'Portrait Screen', width: 1080, height: 1920, type: 'dooh' },
    { name: 'Mall Screen', width: 1920, height: 540, type: 'dooh' },
    { name: 'Bus Shelter', width: 1080, height: 1620, type: 'dooh' },
    { name: 'Transit Screen', width: 1280, height: 720, type: 'dooh' },
    
    // Display formats
    { name: 'Leaderboard', width: 728, height: 90, type: 'display' },
    { name: 'Medium Rectangle', width: 300, height: 250, type: 'display' },
    { name: 'Wide Skyscraper', width: 160, height: 600, type: 'display' },
    { name: 'Large Rectangle', width: 336, height: 280, type: 'display' },
    { name: 'Half Page', width: 300, height: 600, type: 'display' },
    { name: 'Billboard', width: 970, height: 250, type: 'display' },
    { name: 'Mobile Banner', width: 320, height: 50, type: 'display' },
    { name: 'Mobile Interstitial', width: 320, height: 480, type: 'display' }
  ];
}

/**
 * Bulk create creatives for all sizes
 */
export async function bulkCreateCreatives(
  campaignId: string,
  templateId: string,
  baseName: string,
  variables: Record<string, any>,
  sizes: Array<{ width: number; height: number; name: string }>
): Promise<Creative[]> {
  const creatives = sizes.map(size => ({
    campaign_id: campaignId,
    template_id: templateId,
    name: `${baseName} - ${size.name}`,
    type: size.width > size.height ? 'landscape' : 'portrait',
    width: size.width,
    height: size.height,
    variables,
    status: 'draft' as CreativeStatus,
    version: 1
  }));

  const { data, error } = await supabase
    .from('creatives')
    .insert(creatives)
    .select();

  if (error) {
    console.error('Failed to bulk create creatives:', error);
    return [];
  }

  return data || [];
}

/**
 * Duplicate a creative
 */
export async function duplicateCreative(
  creativeId: string,
  newName?: string
): Promise<Creative | null> {
  const original = await getCreative(creativeId);
  
  if (!original) {
    return null;
  }

  const { data, error } = await supabase
    .from('creatives')
    .insert({
      campaign_id: original.campaign_id,
      template_id: original.template_id,
      name: newName || `${original.name} (Copy)`,
      type: original.type,
      width: original.width,
      height: original.height,
      variables: original.variables,
      status: 'draft',
      version: 1
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to duplicate creative:', error);
    return null;
  }

  return data;
}
