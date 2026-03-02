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

  // Merge default values with provided variables
  const mergedVars = {
    ...template.default_values,
    ...variables
  };

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

  // Inject CSS to fix text wrapping, alignment and spacing issues
  const fixCss = `
    <style>
      /* Make text elements flexible for better wrapping */
      .HymyileOletHy, .Hymyile, .OletHyvissKS, .SujuvampaaSuunt {
        height: auto !important;
        max-height: unset !important;
        line-height: 1.15 !important;
      }
      /* Make address/city text flexible - allow wrapping for longer addresses */
      .Torikatu1Laht, .Torikatu1Lahti, .branch_address {
        height: auto !important;
        min-height: unset !important;
        max-height: 80px !important;
        line-height: 1.2 !important;
        white-space: normal !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        overflow: visible !important;
      }
      /* 300x300: Move address slightly down from logo (from 267px to 272px) */
      .Torikatu1Laht[style*="top: 267px"] {
        top: 272px !important;
        left: 15px !important;
        text-align: left !important;
        width: 270px !important;
        max-height: 28px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      /* 300x431: Center address horizontally (from 96px to 15px for center) */
      .Torikatu1Laht[style*="top: 384px"] {
        top: 384px !important;
        left: 15px !important;
        text-align: center !important;
        width: 270px !important;
        max-height: 45px !important;
      }
      /* 300x600: Allow two lines, center (note: class is Torikatu1Lahti not Torikatu1Laht) */
      .Torikatu1Lahti[style*="top: 547px"] {
        top: 547px !important;
        left: 15px !important;
        text-align: center !important;
        width: 270px !important;
        max-height: 50px !important;
      }
      /* 620x891: Address under logo, allow two lines (move left from 220px to center) */
      .Torikatu1Laht[style*="top: 800px"] {
        top: 800px !important;
        left: 110px !important;
        text-align: center !important;
        width: 400px !important;
        max-height: 70px !important;
      }
      /* 980x400: Address at bottom, allow two lines (expand width for full address) */
      .Torikatu1Laht[style*="top: 351px"] {
        top: 351px !important;
        left: 37px !important;
        text-align: left !important;
        width: 906px !important;
        max-height: 50px !important;
      }
      /* PDOOH 1080x1920: Center address (note: class is Torikatu1Lahti) */
      .Torikatu1Lahti[style*="top: 1656px"] {
        top: 1656px !important;
        left: 140px !important;
        text-align: center !important;
        width: 800px !important;
        max-height: 100px !important;
      }
      /* Tighter line spacing for multi-line text */
      .HymyileOletHy br, .Hymyile br, .OletHyvissKS br {
        display: block;
        margin-top: -0.15em;
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
