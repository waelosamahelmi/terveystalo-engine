// ============================================================================
// VIDEO GENERATION SERVICE
// Converts HTML templates to MP4 videos for Meta advertising
// ============================================================================

import { supabase } from './supabase';
import type { CreativeTemplate } from '../types';

export interface VideoGenerationOptions {
  templateId: string;
  variables: Record<string, string>;
  outputPath?: string;
  format?: 'mp4';
  quality?: 'low' | 'medium' | 'high';
}

export interface GeneratedVideo {
  url: string;
  path: string;
  size: number;
  format: string;
  duration?: number;
}

/**
 * Generate MP4 video from HTML template
 * Note: This is a placeholder implementation. In production, you would use:
 * - Puppeteer/Playwright to capture HTML as video
 * - FFmpeg to convert to MP4
 * - Or a cloud service like Amazon Elastic Transcoder, CloudConvert, etc.
 */
export async function generateVideoFromTemplate(
  options: VideoGenerationOptions
): Promise<GeneratedVideo | null> {
  try {
    // 1. Get the template
    const { data: template, error: templateError } = await supabase
      .from('creative_templates')
      .select('*')
      .eq('id', options.templateId)
      .single();

    if (templateError || !template) {
      console.error('Template not found:', templateError);
      return null;
    }

    // 2. Replace variables in template
    let html = template.html_template || '';
    const mergedVars = { ...template.default_values, ...options.variables };

    Object.entries(mergedVars).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, String(value));
    });

    // Handle conditional display (data-if attributes)
    html = html.replace(/data-if="(\w+)">([\s\S]*?)<\/div>/g, (match, varName, content) => {
      const shouldShow = mergedVars[varName] && mergedVars[varName] !== '';
      return shouldShow ? content : '';
    });

    // 3. For now, return the HTML as a preview URL
    // In production, you would:
    // - Use Puppeteer to render the HTML
    // - Capture as video using FFmpeg
    // - Upload to storage
    // - Return the video URL

    // Placeholder: Store HTML and return a preview URL
    const timestamp = Date.now();
    const filename = `video-preview-${timestamp}.html`;
    const path = `video-previews/${filename}`;

    // Upload to Supabase Storage (you need to create this bucket first)
    // For now, return a mock response
    const mockVideo: GeneratedVideo = {
      url: URL.createObjectURL(new Blob([html], { type: 'text/html' })),
      path: path,
      size: html.length,
      format: 'html', // Will be 'mp4' in production
      duration: 15, // Default video duration in seconds
    };

    return mockVideo;
  } catch (error) {
    console.error('Error generating video:', error);
    return null;
  }
}

/**
 * Batch generate videos for multiple sizes
 */
export async function generateVideosForCampaign(
  campaignId: string,
  size: '1080x1080' | '1080x1920' | 'both'
): Promise<GeneratedVideo[]> {
  try {
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('dental_campaigns')
      .select('*, service:services(*), branch:branches(*)')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign not found:', campaignError);
      return [];
    }

    // Get Meta templates
    const sizes = size === 'both' ? ['1080x1080', '1080x1920'] : [size];
    const { data: templates, error: templatesError } = await supabase
      .from('creative_templates')
      .select('*')
      .eq('type', 'meta')
      .in('size', sizes)
      .eq('active', true);

    if (templatesError || !templates) {
      console.error('Templates not found:', templatesError);
      return [];
    }

    // Build variables from campaign data
    const variables = {
      headline: campaign.headline || 'Hymyile.<br>Olet hyvissä käsissä.',
      subheadline: campaign.subheadline || 'Sujuvampaa suunterveyttä.',
      offer_title: campaign.offer_text ? 'Hammas-<br>tarkastus' : '',
      price: campaign.offer_text || '',
      cta_text: campaign.cta_text || 'Varaa aika',
      branch_address: campaign.branch?.address || '',
      image_url: campaign.background_image_url || 'https://suunterveystalo.netlify.app/refs/assets/nainen.jpg',
      disclaimer_text: '', // Meta ads typically don't show disclaimers
    };

    // Generate videos for each template
    const videoPromises = templates.map(template =>
      generateVideoFromTemplate({
        templateId: template.id,
        variables: variables,
        format: 'mp4',
        quality: 'high',
      })
    );

    const results = await Promise.allSettled(videoPromises);
    return results
      .filter((result): result is PromiseFulfilledResult<GeneratedVideo> => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<GeneratedVideo>).value)
      .filter(Boolean);
  } catch (error) {
    console.error('Error generating videos for campaign:', error);
    return [];
  }
}

/**
 * Export videos to spreadsheet (Google Sheets)
 */
export async function exportVideosToSheet(
  campaignId: string,
  videos: GeneratedVideo[]
): Promise<boolean> {
  try {
    // Get campaign details
    const { data: campaign } = await supabase
      .from('dental_campaigns')
      .select('name, service:services(*)')
      .eq('id', campaignId)
      .single();

    if (!campaign) return false;

    // Prepare data for spreadsheet
    const spreadsheetData = [
      ['Campaign', 'Service', 'Size', 'Video URL', 'Format', 'Duration (s)', 'Created At'],
      ...videos.map(video => [
        campaign.name,
        campaign.service?.name_fi || campaign.service?.name,
        video.path.includes('1080x1920') ? '1080x1920 (Stories)' : '1080x1080 (Square)',
        video.url,
        video.format,
        video.duration || 15,
        new Date().toISOString()
      ]))
    ];

    // TODO: Implement Google Sheets export using the googleSheets service
    // For now, just log the data
    console.log('Spreadsheet data:', spreadsheetData);

    return true;
  } catch (error) {
    console.error('Error exporting videos to sheet:', error);
    return false;
  }
}

/**
 * Get video export URL for sharing
 */
export function getVideoExportUrl(videoPath: string): string {
  // Generate a shareable URL for the video
  // In production, this would use Supabase Storage signed URLs
  return `${window.location.origin}/api/videos/${encodeURIComponent(videoPath)}`;
}
