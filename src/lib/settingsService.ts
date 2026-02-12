// ============================================================================
// SUUN TERVEYSTALO - Settings Service
// Handles all app settings from database (SQL-driven, no hardcoding)
// ============================================================================

import { supabase } from './supabase';
import type { AppSetting, BrandColors } from '../types';

// Cache for settings to avoid repeated database calls
const settingsCache: Map<string, { value: any; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get a single app setting by key
 */
// Alias for backwards compatibility
export const getSettings = getAppSetting;
export const updateSetting = updateAppSetting;
export const getAllSettings = async (): Promise<Record<string, unknown>> => {
  const { data } = await supabase.from('app_settings').select('*');
  const result: Record<string, unknown> = {};
  data?.forEach(s => { result[s.key] = s.value; });
  return result;
};

export async function getAppSetting<T = any>(key: string): Promise<T | null> {
  // Check cache first
  const cached = settingsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value as T;
  }

  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error || !data) {
    console.warn(`Setting not found: ${key}`);
    return null;
  }

  // Cache the result
  settingsCache.set(key, { value: data.value, timestamp: Date.now() });
  
  return data.value as T;
}

/**
 * Get multiple settings by keys
 */
export async function getAppSettings(keys: string[]): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', keys);

  if (error || !data) {
    console.error('Failed to fetch settings:', error);
    return {};
  }

  const result: Record<string, any> = {};
  data.forEach(item => {
    result[item.key] = item.value;
    settingsCache.set(item.key, { value: item.value, timestamp: Date.now() });
  });

  return result;
}

/**
 * Get all settings in a category
 */
export async function getSettingsByCategory(category: string): Promise<AppSetting[]> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('category', category)
    .order('key');

  if (error) {
    console.error('Failed to fetch settings by category:', error);
    return [];
  }

  return data || [];
}

/**
 * Update a setting value
 */
export async function updateAppSetting(
  key: string, 
  value: any, 
  userId?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('app_settings')
    .update({ 
      value, 
      updated_by: userId,
      updated_at: new Date().toISOString()
    })
    .eq('key', key);

  if (error) {
    console.error('Failed to update setting:', error);
    return false;
  }

  // Invalidate cache
  settingsCache.delete(key);
  
  return true;
}

/**
 * Create a new setting
 */
export async function createAppSetting(
  key: string,
  value: any,
  category: string,
  description?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('app_settings')
    .insert({
      key,
      value,
      category,
      description
    });

  if (error) {
    console.error('Failed to create setting:', error);
    return false;
  }

  return true;
}

/**
 * Clear settings cache
 */
export function clearSettingsCache(): void {
  settingsCache.clear();
}

// ============================================================================
// BRAND SETTINGS HELPERS
// ============================================================================

/**
 * Get brand name
 */
export async function getBrandName(): Promise<string> {
  const name = await getAppSetting<string>('brand_name');
  return name || 'Suun Terveystalo';
}

/**
 * Get brand colors
 */
export async function getBrandColors(): Promise<BrandColors> {
  const colors = await getAppSetting<BrandColors>('brand_colors');
  return colors || {
    primary: '#00A5B5',
    primary_dark: '#008B99',
    secondary: '#E31E24',
    accent: '#1B365D',
    background: '#F8FAFB',
    text: '#1A1A1A',
    text_light: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444'
  };
}

/**
 * Get logo URLs
 */
export async function getLogoUrls(): Promise<{ logo: string; logoWhite: string }> {
  const settings = await getAppSettings(['brand_logo_url', 'brand_logo_white_url']);
  return {
    logo: settings.brand_logo_url || '',
    logoWhite: settings.brand_logo_white_url || ''
  };
}

/**
 * Get all brand settings at once
 */
export async function getBrandSettings(): Promise<{
  name: string;
  tagline: string;
  colors: BrandColors;
  logoUrl: string;
  logoWhiteUrl: string;
  faviconUrl: string;
}> {
  const settings = await getAppSettings([
    'brand_name',
    'brand_tagline',
    'brand_colors',
    'brand_logo_url',
    'brand_logo_white_url',
    'brand_favicon_url'
  ]);

  return {
    name: settings.brand_name || 'Suun Terveystalo',
    tagline: settings.brand_tagline || 'Hymyile huoletta',
    colors: settings.brand_colors || {
      primary: '#00A5B5',
      primary_dark: '#008B99',
      secondary: '#E31E24',
      accent: '#1B365D',
      background: '#F8FAFB',
      text: '#1A1A1A',
      text_light: '#6B7280',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444'
    },
    logoUrl: settings.brand_logo_url || '',
    logoWhiteUrl: settings.brand_logo_white_url || '',
    faviconUrl: settings.brand_favicon_url || ''
  };
}

// ============================================================================
// CHANNEL SETTINGS
// ============================================================================

/**
 * Get enabled channels
 */
export async function getEnabledChannels(): Promise<string[]> {
  const channels = await getAppSetting<string[]>('enabled_channels');
  return channels || ['meta', 'display', 'pdooh', 'digital_audio'];
}

/**
 * Get default budget splits
 */
export async function getDefaultBudgetSplits(): Promise<Record<string, number>> {
  const splits = await getAppSetting<Record<string, number>>('default_budget_splits');
  return splits || {
    meta: 40,
    display: 25,
    pdooh: 30,
    digital_audio: 5
  };
}

/**
 * Get fixed budget amounts for campaign allocation
 */
export async function getBudgetPresets(): Promise<number[]> {
  const presets = await getAppSetting<number[]>('budget_presets');
  return presets || [84, 168, 337, 505, 672, 842]; // Weekly amounts from user's table
}
