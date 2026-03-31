// ============================================================================
// SUUN TERVEYSTALO - TypeScript Types
// ============================================================================

// ============================================================================
// USER TYPES
// ============================================================================

export type UserRole = 'admin' | 'manager' | 'partner' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  full_name?: string;
  role: UserRole;
  image_url?: string;
  advertiser_id?: number;
  branch_id?: string;
  assigned_branches?: string[];
  permissions?: Record<string, boolean>;
  preferences?: UserPreferences;
  phone?: string;
  title?: string;
  department?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: 'fi' | 'en';
  notifications: boolean;
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

export interface Service {
  id: string;
  code: string;
  name: string;           // Mapped from name_fi for backwards compatibility
  name_fi: string;
  name_en?: string;
  slug?: string;
  description?: string;   // Mapped from description_fi
  description_fi?: string;
  description_en?: string;
  default_offer_fi?: string;
  default_offer_en?: string;
  default_price?: string;  // e.g. "59€"
  price?: number;          // Legacy numeric price
  duration_minutes?: number;
  active: boolean;
  sort_order: number;
  icon?: string;
  color?: string;
  image_url?: string;
  meta_keywords?: string[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// BRANCH TYPES
// ============================================================================

export interface BranchBudget {
  id: string;
  branch_id: string;
  allocated_budget: number;
  used_budget: number;
  available_budget: number;
  period_start: string;
  period_end: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  external_id?: string;
  name: string;
  short_name?: string;
  address: string;
  postal_code: string;
  city: string;
  region?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  // Alternative coordinate format
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  opening_hours?: Record<string, string>;
  services?: string[];
  features?: Record<string, any>;
  manager_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Budget information (joined from branch_budgets)
  budget?: BranchBudget;
  // Creative types supported by this branch
  creative_types?: string[];
}

// ============================================================================
// CAMPAIGN TYPES
// ============================================================================

export type CampaignStatus = 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';
export type CreativeType = 'nationwide' | 'local' | 'both';
export type AdType = 'nationwide' | 'local' | 'both';
export type PricingOption = 'yes' | 'no' | 'both';
export type NationwideAddressMode = 'with_address' | 'without_address';
export type Channel = 'meta' | 'display' | 'pdooh' | 'digital_audio';
export type GenderOption = 'all' | 'male' | 'female' | 'other';

export interface DentalCampaign {
  id: string;
  name: string;
  description?: string;
  
  // Service and branch
  service_id: string;
  service_ids?: string[];
  branch_id: string;
  branch_ids?: string[];
  service?: Service;
  branch?: Branch;
  
  // Location targeting
  campaign_address?: string;
  campaign_postal_code?: string;
  campaign_city?: string;
  campaign_radius: number;
  campaign_coordinates?: {
    lat: number;
    lng: number;
  };
  target_screens_count: number;
  
  // Schedule
  start_date: string;
  end_date?: string;
  campaign_start_date?: string;
  campaign_end_date?: string;
  is_ongoing?: boolean;
  
  // Budget
  total_budget: number;
  budget_meta: number;
  budget_display: number;
  budget_pdooh: number;
  budget_audio: number;
  daily_budget_meta: number;
  daily_budget_display: number;
  daily_budget_pdooh: number;
  daily_budget_audio: number;
  
  // Channels
  channel_meta: boolean;
  channel_display: boolean;
  channel_pdooh: boolean;
  channel_audio: boolean;
  
  // Creative settings
  creative_type: CreativeType;
  creative_weight_nationwide: number;
  creative_weight_local: number;

  // Ad type and pricing options
  ad_type?: AdType;
  nationwide_address_mode?: NationwideAddressMode;
  include_pricing?: PricingOption;

  // Creative content
  headline?: string;
  subheadline?: string;
  offer_text?: string;
  offer_title?: string;
  offer_subtitle?: string;
  offer_date?: string;
  disclaimer_text?: string;
  service_prices?: Record<string, string>;
  cta_text?: string;
  landing_url?: string;
  background_image_url?: string;
  general_brand_message?: string;
  campaign_objective?: 'traffic' | 'reach';

  // Meta ad copy
  meta_primary_text?: string;
  meta_headline?: string;
  meta_description?: string;

  // Excluded branches (toimipisteet)
  excluded_branch_ids?: string[];

  // Meta video/audio creatives
  meta_video_url?: string;
  meta_audio_url?: string;
  meta_story_url?: string;

  // Audience targeting (age and gender)
  target_age_min?: number;
  target_age_max?: number;
  target_genders?: string[];

  // Status
  status: CampaignStatus;
  
  // Computed/aggregated fields
  spent_budget?: number;
  total_impressions?: number;
  total_clicks?: number;
  ctr?: number;
  channels?: string[];
  
  // BidTheatre integration
  bt_campaign_id?: number;
  bt_advertiser_id?: number;
  bt_sync_status?: 'pending' | 'synced' | 'failed';
  bt_last_sync?: string;
  bt_sync_error?: string;
  
  // Per-branch channel budgets (branchId -> channel amounts)
  branch_channel_budgets?: Record<string, { meta: number; display: number; pdooh: number; audio: number }>;

  // Bidding
  bidding_strategy?: string;
  max_cpm_display?: number;
  max_cpm_pdooh?: number;

  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  creator?: { name: string; email: string; image_url?: string };
  creatives?: Creative[];
}

export interface CampaignFormData {
  // Step 1: Service & Ad Type
  service_id: string;
  service_ids: string[];
  ad_type?: AdType;
  nationwide_address_mode?: NationwideAddressMode;
  include_pricing?: PricingOption;

  // Step 2: Branch
  branch_id: string;
  branch_ids: string[];

  // Step 3: Audience (Age, Gender, Location)
  target_age_min?: number;
  target_age_max?: number;
  target_genders?: string[];
  campaign_address: string;
  campaign_postal_code: string;
  campaign_city: string;
  campaign_radius: number;
  campaign_coordinates: {
    lat: number;
    lng: number;
  };

  // Campaign objective
  campaign_objective?: 'traffic' | 'reach';

  // Step 4: Creative Type & Schedule
  creative_type: CreativeType;
  creative_weight_nationwide: number;
  creative_weight_local: number;
  start_date: string;
  end_date: string;
  is_ongoing?: boolean;

  // Step 5: Budget & Channels
  total_budget: number;
  channel_meta: boolean;
  channel_display: boolean;
  channel_pdooh: boolean;
  channel_audio: boolean;
  budget_meta: number;
  budget_display: number;
  budget_pdooh: number;
  budget_audio: number;

  // Per-branch channel budgets (branchId -> channel amounts)
  branch_channel_budgets?: Record<string, { meta: number; display: number; pdooh: number; audio: number }>;

  // Step 6: Creative customization
  headline?: string;
  subheadline?: string;
  offer_text?: string;
  offer_title?: string;
  service_prices?: Record<string, string>;
  cta_text?: string;
  background_image_url?: string;
  landing_url?: string;
  general_brand_message?: string;

  // Meta ad copy
  meta_primary_text?: string;
  meta_headline?: string;
  meta_description?: string;

  // Excluded branches
  excluded_branch_ids?: string[];

  // Display/PDOOH creative config
  offer_subtitle?: string;
  offer_date?: string;
  disclaimer_text?: string;

  // Meta creative config (video/audio selections from UI)
  meta_video_url?: string;       // Selected background video URL
  meta_video_file?: File | null; // Uploaded custom video file
  meta_audio_url?: string;       // Selected audio track URL

  // Step 7: Review (name)
  name: string;
  description?: string;
}

// ============================================================================
// CREATIVE TYPES
// ============================================================================

export type CreativeStatus = 'draft' | 'generating' | 'ready' | 'pending_approval' | 'approved' | 'rejected' | 'archived';
export type CreativeChannel = 'display' | 'pdooh' | 'meta' | 'audio';

export interface Creative {
  id: string;
  campaign_id: string;
  template_id: string;
  
  name: string;
  type?: string;
  channel: CreativeChannel;
  size: string;
  width: number;
  height: number;
  
  // Generated content
  html_content?: string;
  rendered_html?: string;
  image_url?: string;
  preview_url?: string;
  jpg_url?: string;
  
  // Customization
  headline?: string;
  offer_text?: string;
  cta_text?: string;
  branch_address?: string;
  background_image_url?: string;
  custom_data?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  
  // Status
  status: CreativeStatus;
  bt_creative_id?: number;
  
  // Joined data
  template_name?: string;
  service_name?: string;
  
  created_at: string;
  updated_at: string;
}

export interface TemplatePlaceholder {
  key: string;
  label: string;
  type: 'text' | 'image' | 'url' | 'color' | 'number';
  required: boolean;
  maxLength?: number;
  defaultValue?: string;
}

export interface CreativeTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'display' | 'meta' | 'pdooh' | 'audio';
  channel?: CreativeChannel; // Legacy support
  size: string;
  width: number;
  height: number;
  html_template: string;
  html_content?: string;
  css_styles?: string;
  css_template?: string;
  js_scripts?: string;
  placeholders?: TemplatePlaceholder[];
  default_values: Record<string, unknown>;
  preview_url?: string;
  thumbnail_url?: string;
  preview_image_url?: string;
  tags?: string[];
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreativeTemplateSummary {
  id: string;
  name: string;
  type: 'display' | 'meta' | 'pdooh' | 'audio';
  size: string;
  width: number;
  height: number;
  description?: string;
  tags?: string[];
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// BRAND ASSETS
// ============================================================================

export interface BrandAsset {
  id: string;
  type: 'logo' | 'logo_white' | 'favicon' | 'background' | 'icon';
  name: string;
  url: string;
  mime_type: string;
  width?: number;
  height?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface CampaignAnalytics {
  id: string;
  campaign_id: string;
  date: string;
  channel: Channel;
  
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  cpm: number;
  cpc: number;
  
  conversions?: number;
  conversion_rate?: number;
  revenue?: number;
  roas?: number;
  
  viewable_impressions?: number;
  viewable_rate?: number;
  
  device_stats?: DeviceStats[];
  geo_stats?: GeoStats[];
  site_stats?: SiteStats[];
  daily_stats?: DailyStats[];
  
  created_at: string;
  updated_at: string;
}

export interface DeviceStats {
  device_type: string;
  impressions: number;
  clicks: number;
  spend: number;
}

export interface GeoStats {
  region: string;  // Geographic region name
  name?: string;   // Legacy - same as region
  impressions: number;
  clicks: number;
  spend: number;
  ctr?: number;
  latitude?: number;
  longitude?: number;
}

export interface SiteStats {
  site_url: string;
  impressions: number;
  clicks: number;
  spend: number;
  viewable_rate?: number;
}

export interface DailyStats {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
}

export interface CampaignSummary {
  id: string;
  name: string;
  service_name: string;
  branch_name: string;
  status: CampaignStatus;
  total_budget: number;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  avg_ctr: number;
  start_date: string;
  end_date?: string;
  days_remaining?: number;
  budget_utilization: number;
}

export interface DashboardStats {
  activeCampaigns: number;
  totalSpendMTD: number;
  totalImpressionsMTD: number;
  avgCtrMTD: number;
  spendChange: number;
  impressionsChange: number;
  // Additional properties for dashboard
  totalImpressions?: number;
  totalClicks?: number;
  totalSpend?: number;
  clicksChange?: number;
}

export interface BranchPerformance {
  branch_id: string;
  branch_name: string;
  branch_city: string;
  total_campaigns: number;
  active_campaigns: number;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  avg_ctr: number;
}

// ============================================================================
// AI TYPES
// ============================================================================

export interface AIConfig {
  id: string;
  provider: string;
  model: string;
  api_key_encrypted: string;
  max_tokens: number;
  temperature: number;
  system_prompt?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface AIChatHistory {
  id: string;
  user_id: string;
  session_id: string;
  messages: AIMessage[];
  context?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AIInsight {
  id: string;
  type: 'recommendation' | 'alert' | 'optimization' | 'anomaly';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  data?: Record<string, unknown>;
  action_url?: string;
  action_label?: string;
  dismissed: boolean;
  campaign_id?: string;
  branch_id?: string;
  created_at: string;
  expires_at?: string;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  read: boolean;
  created_at: string;
}

// ============================================================================
// REPORT TYPES
// ============================================================================

export interface ScheduledReport {
  id: string;
  name: string;
  description?: string;
  report_type: 'campaign' | 'branch' | 'channel' | 'custom';
  filters: Record<string, any>;
  columns: string[];
  schedule: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'csv' | 'excel' | 'pdf';
  last_sent_at?: string;
  next_run_at?: string;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExportRecord {
  id: string;
  user_id: string;
  export_type: string;
  filters: Record<string, any>;
  file_url?: string;
  file_name?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  row_count?: number;
  created_at: string;
  completed_at?: string;
}

// ============================================================================
// APP SETTINGS
// ============================================================================

export interface AppSetting {
  key: string;
  value: any;
  description?: string;
  category?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BrandColors {
  primary: string;
  primary_dark: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  text_light: string;
  success: string;
  warning: string;
  error: string;
}

// ============================================================================
// MEDIA SCREENS (DOOH)
// ============================================================================

export interface MediaScreen {
  id: string;
  external_id: string;
  site_url: string;
  supplier_name: string;
  site_type: string;
  daily_requests: number;
  floor_cpm?: number;
  avg_cpm?: number;
  dimensions?: string;
  width?: number;
  height?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  postal_code?: string;
  network_id: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ACTIVITY LOG
// ============================================================================

export interface ActivityLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  details?: string;
  entity_type?: string;
  entity_id?: string;
  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ============================================================================
// BIDTHEATRE TYPES
// ============================================================================

export interface BidTheatreCredentials {
  id: string;
  network_id: string;
  username: string;
  password: string;
  advertiser_id?: number;
  advertiser_name?: string;
  active: boolean;
  last_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BidTheatreBidStrategy {
  id: string;
  name: string;
  channel: 'display' | 'pdooh';
  min_cpm: number;
  max_cpm: number;
  target_share?: number;
  filter_target?: number;
  paused: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface CampaignFilters {
  search?: string;
  status?: CampaignStatus[];
  branch_id?: string;
  service_id?: string;
  channel?: Channel;
  date_from?: string;
  date_to?: string;
  created_by?: string;
  // Aliases for UI convenience
  branchId?: string;
  serviceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
}

export interface AnalyticsFilters {
  campaign_id?: string;
  branch_id?: string;
  channel?: Channel;
  date_from: string;
  date_to: string;
  group_by?: 'day' | 'week' | 'month';
}

export interface ReportFilters {
  campaigns?: string[];
  branches?: string[];
  channels?: Channel[];
  date_from: string;
  date_to: string;
  metrics?: string[];
}
