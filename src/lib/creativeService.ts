// ============================================================================
// SUUN TERVEYSTALO - Creative Service
// Handles creative generation, templates, and media management
// ============================================================================

import { supabase } from './supabase';
import html2canvas from 'html2canvas';
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
    // For combined structure (non-split templates like meta ads),
    // do NOT recombine headline + headline_line2 — meta templates use
    // separate text-hymyile and text-subline elements.
    if (template.type === 'meta') {
      // Meta templates: headline goes into text-hymyile ONLY (no concatenation)
      // Strip any pipe or previously-concatenated content
      const h = String(mergedVars.headline || '');
      if (h.includes('|')) {
        mergedVars.headline = h.split('|')[0].trim();
      } else if (h.includes('<br>')) {
        mergedVars.headline = h.split('<br>')[0].trim();
      }
      // Ensure headline_line2 doesn't exist for meta templates
      delete mergedVars.headline_line2;
    } else {
      // Only recombine for display templates that genuinely need it.
      const headlineValue = String(mergedVars.headline || '');
      const headlineLine2Value = mergedVars.headline_line2;

      console.log('[renderTemplateHtml] COMBINED template - headlineValue:', headlineValue, 'headlineLine2:', headlineLine2Value);

      const needsRecombine = !headlineValue.includes('|') && !headlineValue.includes('<br>') && headlineLine2Value;
      console.log('[renderTemplateHtml] Needs recombine:', needsRecombine);

      if (needsRecombine) {
        mergedVars.headline = `${headlineValue}|${headlineLine2Value}`;
        console.log('[renderTemplateHtml] Recombined to:', mergedVars.headline);
      }
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

  // Add font-display: swap to all @font-face rules for faster rendering
  html = html.replace(/@font-face\s*\{([^}]*?)\}/g, (match, content) => {
    if (content.includes('font-display')) return match;
    return match.replace('}', '  font-display: swap;\n}');
  });

  // Optimize image URLs for Supabase storage (add transform params)
  const adWidth = template.width ? parseInt(String(template.width), 10) : 0;
  if (adWidth > 0) {
    html = html.replace(
      /(src=["'])([^"']*\.supabase\.co\/storage\/v1\/object\/public\/[^"']+)(["'])/g,
      (_match, prefix, url, suffix) => {
        const transformUrl = url.replace(
          '/storage/v1/object/public/',
          '/storage/v1/render/image/public/'
        );
        const sep = transformUrl.includes('?') ? '&' : '?';
        return `${prefix}${transformUrl}${sep}width=${adWidth}&quality=75${suffix}`;
      }
    );
  }

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

  // Inject audio autoplay script for templates that contain an audioTrack element
  if (html.includes('id="audioTrack"')) {
    const audioAutoplayScript = `
      <script>
        (function() {
          var audio = document.getElementById('audioTrack');
          if (!audio) return;
          audio.currentTime = 0;
          var p = audio.play();
          if (p !== undefined) {
            p.catch(function() {
              function playOnInteraction() {
                audio.currentTime = 0;
                audio.play();
                document.removeEventListener('click', playOnInteraction);
                document.removeEventListener('touchstart', playOnInteraction);
              }
              document.addEventListener('click', playOnInteraction);
              document.addEventListener('touchstart', playOnInteraction);
            });
          }
        })();
      </script>
    `;
    html = html.replace('</body>', audioAutoplayScript + '</body>');
  }

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
 * Fetch an image URL and return it as a base64 data URL.
 * Falls back to the original URL if fetch fails (e.g., CORS issues).
 */
async function imageToDataUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(url); // fallback
      reader.readAsDataURL(blob);
    });
  } catch {
    return url; // fallback to original URL
  }
}

/**
 * Pre-process template HTML to embed all external images as base64 data URLs.
 * This avoids cross-origin issues when rendering with html2canvas.
 */
async function embedExternalResources(html: string): Promise<string> {
  // Find all image URLs in src attributes and CSS url() references
  const imgSrcRegex = /src=["']([^"']+\.(jpg|jpeg|png|webp|gif|svg)[^"']*)["']/gi;
  const cssUrlRegex = /url\(["']?([^"')]+\.(jpg|jpeg|png|webp|gif|svg)[^"')]*)["']?\)/gi;

  const urls = new Set<string>();
  let match;

  while ((match = imgSrcRegex.exec(html)) !== null) {
    if (match[1].startsWith('http')) urls.add(match[1]);
  }
  while ((match = cssUrlRegex.exec(html)) !== null) {
    if (match[1].startsWith('http')) urls.add(match[1]);
  }

  // Fetch all external images in parallel and convert to data URLs
  const urlMap = new Map<string, string>();
  const fetches = Array.from(urls).map(async (url) => {
    const dataUrl = await imageToDataUrl(url);
    urlMap.set(url, dataUrl);
  });
  await Promise.all(fetches);

  // Replace all external URLs with their data URL equivalents
  let processed = html;
  for (const [originalUrl, dataUrl] of urlMap) {
    if (dataUrl !== originalUrl) {
      // Escape special regex characters in URL
      const escaped = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      processed = processed.replace(new RegExp(escaped, 'g'), dataUrl);
    }
  }

  return processed;
}

/**
 * Generate video creative for Meta ads by rendering an HTML template
 * and capturing it frame-by-frame using html2canvas + Web Animations API.
 *
 * This uses the SAME HTML templates as the creative preview, ensuring visual consistency
 * between what the user sees in the campaign creation wizard and the final video.
 *
 * Approach:
 * 1. Pre-fetch external images → base64 data URLs (avoids cross-origin)
 * 2. Render template in a hidden container div
 * 3. Use Web Animations API to pause & seek through the animation timeline
 * 4. html2canvas captures each frame → draw on recording canvas
 * 5. MediaRecorder records the canvas stream
 *
 * @param templateHtml - Fully rendered HTML string from renderTemplateHtml()
 * @param audioUrl - Optional audio track URL
 * @param size - Video dimensions { width, height } (default 1080x1920)
 * @param durationMs - Animation duration in milliseconds (default 15000 = 15 seconds)
 * @returns Blob of the recorded video
 */
export async function generateMetaVideoCreative(
  templateHtml: string,
  audioUrl?: string | null,
  size: { width: number; height: number } = { width: 1080, height: 1920 },
  durationMs: number = 15000
): Promise<Blob> {
  const FPS = 15; // 15 fps is sufficient for CSS animation capture
  const totalFrames = Math.ceil((durationMs / 1000) * FPS);
  const frameDurationMs = 1000 / FPS;

  console.log(`[MetaVideo] Starting: ${size.width}x${size.height}, ${durationMs}ms, ${FPS}fps, ${totalFrames} frames`);

  // Step 1: Embed external images as data URLs to avoid cross-origin issues
  console.log('[MetaVideo] Embedding external resources...');
  const embeddedHtml = await embedExternalResources(templateHtml);

  // Step 2: Create a hidden container and inject the template HTML
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = `${size.width}px`;
  container.style.height = `${size.height}px`;
  container.style.overflow = 'hidden';
  container.style.zIndex = '-1';
  container.style.pointerEvents = 'none';

  // Create a shadow root for style isolation
  const shadow = container.attachShadow({ mode: 'open' });

  // Parse the template HTML and extract head/body content
  const parser = new DOMParser();
  const doc = parser.parseFromString(embeddedHtml, 'text/html');

  // Copy all styles from the template's <head>
  const styleElements = doc.querySelectorAll('style');
  styleElements.forEach(style => {
    const cloned = style.cloneNode(true) as HTMLStyleElement;
    shadow.appendChild(cloned);
  });

  // Add Google Fonts via a link element in shadow DOM
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700;800;900&display=swap';
  shadow.appendChild(fontLink);

  // Copy the body content
  const wrapper = document.createElement('div');
  wrapper.style.width = `${size.width}px`;
  wrapper.style.height = `${size.height}px`;
  wrapper.style.overflow = 'hidden';
  wrapper.style.position = 'relative';
  wrapper.innerHTML = doc.body.innerHTML;
  shadow.appendChild(wrapper);

  document.body.appendChild(container);

  // Step 3: Wait for fonts and images to load
  console.log('[MetaVideo] Waiting for fonts and images to load...');
  await new Promise(r => setTimeout(r, 2000));

  // Preload fonts by forcing a layout
  try {
    await document.fonts.ready;
  } catch {
    // fonts.ready may not be available in all contexts
  }

  // Step 4: Pause all CSS animations and prepare for frame stepping
  const allAnimated = shadow.querySelectorAll('*');
  const animatedElements: { el: HTMLElement; animations: string; duration: string; delay: string; playState: string }[] = [];

  allAnimated.forEach(el => {
    const htmlEl = el as HTMLElement;
    const computed = getComputedStyle(htmlEl);
    if (computed.animationName && computed.animationName !== 'none') {
      animatedElements.push({
        el: htmlEl,
        animations: computed.animationName,
        duration: computed.animationDuration,
        delay: computed.animationDelay,
        playState: computed.animationPlayState,
      });
      // Pause animations initially
      htmlEl.style.animationPlayState = 'paused';
    }
  });

  console.log(`[MetaVideo] Found ${animatedElements.length} animated elements`);

  // Step 5: Set up the recording canvas and MediaRecorder
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(FPS);

  // Add audio track if provided
  let audioCtx: AudioContext | null = null;
  if (audioUrl) {
    try {
      const audio = document.createElement('audio');
      audio.crossOrigin = 'anonymous';
      audio.src = audioUrl;
      audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(audio);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioCtx.destination);
      dest.stream.getAudioTracks().forEach(track => stream.addTrack(track));
      audio.play().catch(() => {});
    } catch {
      console.warn('[MetaVideo] Could not add audio track');
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

  // Step 6: Capture frames by stepping through the animation timeline
  recorder.start();
  console.log('[MetaVideo] Recording started, capturing frames...');

  for (let frame = 0; frame < totalFrames; frame++) {
    const timeMs = frame * frameDurationMs;

    // Seek all animations to this point in time using negative animation-delay trick
    // animation-delay: -Xs with paused state = show frame at time X
    animatedElements.forEach(({ el }) => {
      el.style.animationDelay = `-${timeMs}ms`;
      el.style.animationPlayState = 'paused';
    });

    // Force a layout/repaint so the animation state updates
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    wrapper.offsetHeight;

    try {
      // Capture the current frame with html2canvas
      const frameCanvas = await html2canvas(wrapper, {
        width: size.width,
        height: size.height,
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0a1e5c',
        logging: false,
        // Ignore replay button
        ignoreElements: (element) => element.classList?.contains('replay-btn'),
      });

      // Draw captured frame onto recording canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(frameCanvas, 0, 0, canvas.width, canvas.height);
    } catch (err) {
      console.warn(`[MetaVideo] Frame ${frame} capture failed:`, err);
      // Draw fallback solid color frame
      ctx.fillStyle = '#0a1e5c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Small yield to keep the UI responsive and let MediaRecorder process
    await new Promise(r => setTimeout(r, 10));

    // Log progress every 30 frames (~2 seconds)
    if (frame % 30 === 0) {
      console.log(`[MetaVideo] Frame ${frame}/${totalFrames} (${Math.round(timeMs / 1000)}s)`);
    }
  }

  // Step 7: Stop recording and collect the blob
  console.log('[MetaVideo] All frames captured, finalizing...');

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      // Cleanup
      document.body.removeChild(container);
      if (audioCtx) audioCtx.close().catch(() => {});

      const blob = new Blob(chunks, { type: mimeType });
      console.log(`[MetaVideo] Video generated: ${(blob.size / 1024).toFixed(1)} KB`);

      if (blob.size < 1000) {
        reject(new Error(`Video too small (${blob.size} bytes) - capture likely failed`));
      } else {
        resolve(blob);
      }
    };

    recorder.onerror = (e) => {
      document.body.removeChild(container);
      if (audioCtx) audioCtx.close().catch(() => {});
      reject(e);
    };

    recorder.stop();
  });
}

/**
 * Legacy canvas-based video generation (kept as fallback).
 * Used when HTML template is not available.
 */
export async function generateMetaVideoCreativeFallback(
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
        const stream = canvas.captureStream(30);

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
        recorder.start();
        video.play();
        if (audio) audio.play().catch(() => {});

        const drawFrame = () => {
          if (video.ended || video.paused) {
            recorder.stop();
            return;
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const overlayY = canvas.height * 0.55;
          const gradient = ctx.createLinearGradient(0, overlayY, 0, canvas.height);
          gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
          gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.7)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, overlayY, canvas.width, canvas.height - overlayY);

          if (logoImg && logoImg.complete) {
            const logoH = 60;
            const logoW = (logoImg.width / logoImg.height) * logoH;
            ctx.drawImage(logoImg, (canvas.width - logoW) / 2, 40, logoW, logoH);
          }

          const textX = canvas.width / 2;
          let textY = canvas.height * 0.65;

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

          if (overlayConfig.subheadline) {
            ctx.fillStyle = '#E0E0E0';
            ctx.font = '36px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(overlayConfig.subheadline.replace(/<br\s*\/?>/gi, ' '), textX, textY + 10);
            textY += 60;
          }

          if (overlayConfig.price && overlayConfig.offerTitle) {
            const bubbleY = textY + 20;
            ctx.fillStyle = '#E31E24';
            ctx.beginPath();
            ctx.arc(textX, bubbleY + 50, 80, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(overlayConfig.offerTitle.replace(/[|\n]/g, ' '), textX, bubbleY + 30);
            ctx.font = 'bold 48px Inter, sans-serif';
            const priceText = `${overlayConfig.price}`;
            const priceWidth = ctx.measureText(priceText).width;
            ctx.fillText(priceText, textX - 10, bubbleY + 75);
            ctx.font = 'bold 30px Inter, sans-serif';
            ctx.fillText('€', textX + priceWidth / 2 - 6, bubbleY + 75);
            textY = bubbleY + 140;
          }

          if (overlayConfig.cta) {
            const ctaY = textY + 20;
            const ctaW = 300;
            const ctaH = 60;
            const ctaX = (canvas.width - ctaW) / 2;
            ctx.fillStyle = '#00A5B5';
            ctx.beginPath();
            ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 30);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 28px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(overlayConfig.cta, textX, ctaY + 40);
            textY = ctaY + ctaH + 20;
          }

          if (overlayConfig.branchAddress) {
            ctx.fillStyle = '#CCCCCC';
            ctx.font = '24px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(overlayConfig.branchAddress, textX, canvas.height - 40);
          }

          requestAnimationFrame(drawFrame);
        };

        drawFrame();

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
 * Uses the HTML template approach (same as preview) to ensure visual consistency.
 * Falls back to canvas overlay if template HTML is not provided.
 *
 * @param campaignId - Campaign ID
 * @param creativeName - Human-readable name for the creative record
 * @param storagePath - Supabase storage folder path
 * @param templateHtml - Rendered HTML template string (from renderTemplateHtml)
 * @param audioUrl - Audio track URL
 * @param size - Video dimensions
 * @param durationMs - Animation duration in milliseconds
 */
export async function generateAndUploadMetaCreative(
  campaignId: string,
  creativeName: string,
  storagePath: string,
  templateHtml: string,
  templateId: string | null,
  audioUrl?: string | null,
  size: { width: number; height: number } = { width: 1080, height: 1920 },
  durationMs: number = 15000
): Promise<{ url: string; creativeId: string } | null> {
  try {
    const sizeStr = `${size.width}x${size.height}`;
    console.log(`Generating Meta video ${sizeStr} for "${creativeName}"...`);

    // Generate the video blob using the HTML template
    const videoBlob = await generateMetaVideoCreative(templateHtml, audioUrl, size, durationMs);

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
        ...(templateId ? { template_id: templateId } : {}),
        name: `${creativeName} - ${sizeStr}`,
        type: 'meta',
        size: sizeStr,
        width: size.width,
        height: size.height,
        image_url: uploadResult.url,
        preview_url: uploadResult.url,
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
 * Uses the same HTML templates as the preview in campaign creation wizard,
 * ensuring visual consistency between preview and final video output.
 *
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
  services: Array<{ id: string; name: string; name_fi: string; default_price?: string; default_offer_fi?: string }>,
  templateVariablesBuilder?: (branch: { id: string; name: string; address: string; city: string }, service: { id: string; name: string; name_fi: string; default_price?: string; default_offer_fi?: string }, size: { width: number; height: number }) => Record<string, string>
): Promise<{ url: string; creativeId: string; width: number; height: number }[]> {
  const results: { url: string; creativeId: string; width: number; height: number }[] = [];

  const audioTrack = formData.meta_audio_url || '/meta/audio/Terveystalo Suun TT TVC Brändillinen 15s 2025 09 23 Net Master -14LUFS.wav';
  const isGeneralBrandMessage = formData.general_brand_message && formData.general_brand_message.length > 0;
  const showAddress = formData.creative_type === 'local' || formData.creative_type === 'both';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

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

  // Fetch Meta templates from DB for each size
  const metaTemplates = await getCreativeTemplates({ type: 'meta', active: true });
  const templatesBySize: Record<string, CreativeTemplate> = {};
  for (const t of metaTemplates) {
    templatesBySize[t.size] = t;
  }

  console.log(`Generating Meta creatives: ${branchList.length} branches × ${serviceList.length} services × ${metaSizes.length} sizes = ${branchList.length * serviceList.length * metaSizes.length} total`);
  console.log(`Available Meta templates: ${Object.keys(templatesBySize).join(', ')}`);

  for (const branch of branchList) {
    for (const service of serviceList) {
      // Build ad name for folder structure
      const serviceName = service.name_fi || service.name;
      const branchCity = branch.city || '';
      const adName = `${serviceName}${branchCity ? `-${branchCity}` : ''}`
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      const storagePath = `meta-creatives/${campaignId}/${adName}`;

      for (const size of metaSizes) {
        try {
          const sizeStr = `${size.width}x${size.height}`;
          const template = templatesBySize[sizeStr];

          let templateHtml: string;

          if (template && templateVariablesBuilder) {
            // Use the same template variables as the preview
            const variables = templateVariablesBuilder(branch, service, size);
            templateHtml = renderTemplateHtml(template, variables);
          } else if (template) {
            // Build variables matching the preview format (must match CampaignCreate.tsx buildTemplateVariables)
            const branchAddress = showAddress ? `${branch.address}, ${branch.city}` : '';
            const headlineParts = (formData.headline || 'Hymyile.|Olet hyvissä käsissä.').split('|');

            // For Meta templates, headline is first part, subheadline gets second part
            const headlineValue = headlineParts[0]?.trim() || 'Hymyile.';
            const subheadlineValue = formData.subheadline || (headlineParts.length > 1 ? headlineParts.slice(1).join(' ').trim() : 'Olet hyvissä käsissä.');

            // Build subheadline/message text
            let messageText = subheadlineValue;
            if (!formData.subheadline) {
              if (isGeneralBrandMessage) {
                const cityName = branch.city || '';
                messageText = cityName
                  ? `Sujuvampaa suunterveyttä ${cityName}n Suun Terveystalossa.`
                  : 'Sujuvampaa suunterveyttä Suun Terveystaloissa.';
              } else {
                const cityName = branch.city || '';
                messageText = cityName
                  ? `Sujuvampaa suunterveyttä ${cityName}n Suun Terveystalossa.`
                  : 'Sujuvampaa suunterveyttä Suun Terveystaloissa.';
              }
            }

            // Scale badge price font for 3+ digit prices
            const creativePrice = isGeneralBrandMessage ? '' : (service.default_price || formData.offer_text || '49');
            const creativePriceDigits = String(creativePrice).replace(/[^0-9]/g, '').length;
            const creativeBadgePriceSize = creativePriceDigits >= 3 ? '62' : '82';
            const creativeBadgeEuroSize = creativePriceDigits >= 3 ? '40' : '52';

            const variables: Record<string, string> = {
              // Text content
              title: 'Suun Terveystalo',
              headline: headlineValue,
              subheadline: messageText,
              offer_title: isGeneralBrandMessage ? '' : (service.default_offer_fi || serviceName),
              offer_subtitle: isGeneralBrandMessage ? '' : 'uusille asiakkaille',
              price: creativePrice,
              currency: '€',
              cta_text: formData.cta_text || 'Varaa aika',
              branch_address: branchAddress,

              // Scene 3 text lines
              scene3_line1: 'Sujuvampaa',
              scene3_line2: 'terveyttä',
              scene3_line3: branch.city || '',
              scene3_line4: 'Suun Terveystalossa.',
              city_name: branch.city || '',

              // Audio & video
              audio_track: encodeURI(audioTrack),
              background_video: encodeURI(formData.meta_video_url || '/meta/vids/nainen.mp4'),

              // Images
              scene1_image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1080&h=1080&fit=crop&crop=faces',
              scene2_image: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1080&h=1080&fit=crop&crop=faces',
              logo_url: `${baseUrl}/refs/assets/SuunTerveystalo_logo.png`,
              artwork_url: `${baseUrl}/refs/assets/terveystalo-artwork-1200w.png`,
              image_url: `${baseUrl}/refs/assets/nainen-1080w.jpg`,
              image_url_1: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1080&h=1080&fit=crop',
              image_url_2: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1080&h=1080&fit=crop',

              // Styling
              font_url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700;800;900&display=swap',
              font_family: 'Inter',
              bg_color: '#0a1e5c',
              text_color: '#fff',
              wipe_color: '#0a3d91',
              badge_color: '#0a3d91',
              scene3_text_dim: '#6b82b8',
              scene3_text_bright_color: '#ffffff',
              scene4_addr_color: 'rgba(255,255,255,0.6)',

              // SVG badge path
              badge_svg_path: 'M 145,10 C 175,8   205,15  230,35 Q 258,55  270,90 C 280,120  282,155  272,185 Q 260,220  235,248 C 210,272  175,285  140,284 C 105,283  70,270   45,245 Q 20,218   10,180 C 2,148    5,112   18,82 Q 32,48    65,28 C 90,14   118,10  145,10 Z',

              // Animation timing
              animation_duration: '15',
              scene1_end: '44',
              scene1_fade: '48',
              scene1_zoom_duration: '8',
              scene1_zoom_scale: '1.08',
              scene2_start: '42',
              scene2_fade: '47',
              logo_end: '54',
              logo_hide: '57',
              badge_show: '27',
              badge_pop: '30',
              badge_pop_scale: '1.05',
              badge_hold: '32',
              badge_end: '55',
              badge_hide: '57',
              headline_show: '27',
              headline_pop: '30',
              headline_hold: '35',
              headline_move: '38',
              headline_end: '55',
              headline_hide: '57',
              subline_show: '36',
              subline_pop: '40',
              subline_end: '55',
              subline_hide: '57',
              cw1_show: '48',
              cw1_pop: '50',
              cw1_hold: '54',
              cw1_wipe: '57',
              cw2_show: '49',
              cw2_pop: '51',
              cw2_hold: '54',
              cw2_wipe: '57',
              cw3_show: '49',
              cw3_pop: '51.5',
              cw3_hold: '54',
              cw3_wipe: '57',
              cw4_show: '49.5',
              cw4_pop: '52',
              cw4_hold: '54',
              cw4_wipe: '57',
              cw5_show: '50',
              cw5_pop: '52',
              cw5_hold: '54',
              cw5_wipe: '57',
              cw6_show: '50',
              cw6_pop: '52.5',
              cw6_hold: '54',
              cw6_wipe: '57',
              cw7_show: '50.5',
              cw7_pop: '53',
              cw7_hold: '54',
              cw7_wipe: '57',
              cw_big_show: '55',
              cw_big_pop: '56',
              cw_big_hold: '59',
              cw_big_wipe: '8',
              scene3_start: '58',
              scene3_show: '60',
              scene3_end: '82',
              scene3_hide: '85',
              scene3_text_dim_start: '60',
              scene3_text_bright: '67',
              scene3_arc: '72',
              scene3_logo_show: '61',
              scene3_logo_pop: '64',
              scene3_logo_end: '82',
              scene3_logo_hide: '85',
              scene4_start: '83',
              scene4_show: '86',
              scene4_logo_show: '84',
              scene4_logo_pop: '87',
              scene4_addr_show: '89',
              scene4_addr_pop: '94',

              // Layout sizes (1080x1080 defaults)
              logo_bottom: '65',
              logo_height: '52',
              badge_top: '20',
              badge_left: '15',
              badge_size: '290',
              badge_pad_bottom: '5',
              badge_pad_right: '10',
              badge_label_size: '26',
              badge_label_weight: '700',
              badge_price_size: creativeBadgePriceSize,
              badge_price_weight: '900',
              badge_price_lineheight: '0.85',
              badge_euro_size: creativeBadgeEuroSize,
              badge_euro_weight: '700',
              badge_euro_top: '6',
              badge_euro_left: '2',
              headline_top: '50',
              headline_size: '70',
              headline_weight: '800',
              headline_start_y: '30',
              headline_end_y: '90',
              subline_top: '50',
              subline_size: '70',
              subline_weight: '800',
              subline_start_y: '10',
              subline_end_y: '10',
              subline_lineheight: '1.15',
              text_shadow: '2',

              // Circle wipe sizes and positions
              cw1_size: '140',
              cw1_bottom: '-20',
              cw1_left: '-30',
              cw1_scale: '15',
              cw2_size: '100',
              cw2_bottom: '90',
              cw2_left: '60',
              cw2_scale: '15',
              cw3_size: '70',
              cw3_bottom: '50',
              cw3_left: '150',
              cw3_scale: '18',
              cw4_size: '55',
              cw4_bottom: '160',
              cw4_left: '20',
              cw4_scale: '22',
              cw5_size: '90',
              cw5_bottom: '130',
              cw5_left: '130',
              cw5_scale: '15',
              cw6_size: '120',
              cw6_bottom: '30',
              cw6_left: '200',
              cw6_scale: '12',
              cw7_size: '45',
              cw7_bottom: '190',
              cw7_left: '100',
              cw7_scale: '28',
              cw_big_size: '400',
              cw_big_bottom: '-200',
              cw_big_left: '-200',
              cw_big_scale: '8',

              // Scene 3 styling
              scene3_text_size: '78',
              scene3_text_weight: '800',
              scene3_text_lineheight: '1.15',
              scene3_text_pad: '60',
              scene3_text_style: 'italic',
              scene3_arc_angle: '-18',
              scene3_arc_scale: '0.82',
              scene3_logo_bottom: '95',
              scene3_logo_height: '46',

              // Scene 4 styling
              scene4_margin_top: '60',
              scene4_logo_height: '54',
              scene4_addr_top: '18',
              scene4_addr_size: '40',
              scene4_addr_weight: '300',
              scene4_addr_spacing: '0.5',
              scene4_addr_slide: '8',

              // Other
              offer_date: isGeneralBrandMessage ? '' : 'Varaa viimeistään 28.10.',
              click_url: 'https://terveystalo.com/suunterveystalo',
            };

            templateHtml = renderTemplateHtml(template, variables);
          } else {
            // No template found — skip this size
            console.warn(`No Meta template found for size ${sizeStr}, skipping`);
            continue;
          }

          // Apply the same CSS injections as the preview in CampaignCreate.tsx
          // Hide price badge for brand messages
          if (isGeneralBrandMessage) {
            templateHtml = templateHtml.replace('</head>', '<style>.Pricetag, .Price, .HammasTarkast, .HammasTarkastu, .VaronViimcist, .pricetag, .price-bubble, .price-badge-wrap { display: none !important; }</style></head>');
          }
          // Hide legal/disclaimer text for non-PDOOH templates (legal text is only for PDOOH)
          if (template.type !== 'pdooh') {
            templateHtml = templateHtml.replace('</head>', '<style>.disclaimer, .LegalTeksti { display: none !important; }</style></head>');
          }
          // Also hide legal text for brand campaigns on PDOOH
          if (template.type === 'pdooh' && isGeneralBrandMessage) {
            templateHtml = templateHtml.replace('</head>', '<style>.disclaimer, .LegalTeksti { display: none !important; }</style></head>');
          }
          // Hide address if not showing address
          if (!showAddress) {
            templateHtml = templateHtml.replace('</head>', '<style>.address, .Torikatu1Laht, .Torikatu1Lahti, .branch_address, .scene-4-address { display: none !important; }</style></head>');
          }
          // Hide CTA for PDOOH (Meta templates shouldn't hit this, but for safety)
          if (template.type === 'pdooh') {
            templateHtml = templateHtml.replace('</head>', '<style>.cta, .cta-button, .VaraaAika, .cta_text, [class*="cta"] { display: none !important; }</style></head>');
          }

          const result = await generateAndUploadMetaCreative(
            campaignId,
            `${campaignName} - ${adName}`,
            storagePath,
            templateHtml,
            template.id,
            audioTrack,
            size,
            15000 // 15 second animation duration
          );

          if (result) {
            results.push({ ...result, width: size.width, height: size.height });
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
