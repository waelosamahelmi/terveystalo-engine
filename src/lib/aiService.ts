// ============================================================================
// SUUN TERVEYSTALO - AI Service
// Handles OpenRouter AI integration with database access
// ============================================================================

import { supabase } from './supabase';
import type { AIConfig, AIMessage, AIInsight } from '../types';

// Get AI configuration from database
export async function getAIConfig(): Promise<AIConfig | null> {
  const { data, error } = await supabase
    .from('ai_config')
    .select('*')
    .eq('active', true)
    .single();

  if (error) {
    console.error('Failed to fetch AI config:', error);
    return null;
  }

  return data;
}

// Default system prompt
const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant for Suun Terveystalo, a dental health services marketing platform. 
You have access to campaign data, analytics, and branch information.
Help users with:
- Campaign performance analysis
- Budget optimization recommendations
- Marketing strategy suggestions
- Data insights and reporting
- Answering questions about their campaigns

Always be helpful, concise, and data-driven in your responses.
Format numbers nicely (e.g., 1,234 instead of 1234).
Use Finnish language when the user writes in Finnish.`;

/**
 * Send a message to the AI and get a response
 */
export async function sendAIMessage(
  messages: AIMessage[],
  context?: Record<string, any>
): Promise<{ response: string; error?: string }> {
  const config = await getAIConfig();

  if (!config) {
    return { response: '', error: 'AI configuration not found' };
  }

  // Build the messages array for the API
  const apiMessages = [
    {
      role: 'system',
      content: config.system_prompt || DEFAULT_SYSTEM_PROMPT
    },
    ...messages.map(m => ({
      role: m.role,
      content: m.content
    }))
  ];

  // If context is provided, add it to the system message
  if (context) {
    apiMessages[0].content += `\n\nCurrent context:\n${JSON.stringify(context, null, 2)}`;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Suun Terveystalo'
      },
      body: JSON.stringify({
        model: config.model,
        messages: apiMessages,
        max_tokens: config.max_tokens,
        temperature: parseFloat(String(config.temperature)) || 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return { response: '', error: error.message || 'AI request failed' };
    }

    const data = await response.json();
    return { response: data.choices[0]?.message?.content || '' };
  } catch (error) {
    console.error('AI request error:', error);
    return { response: '', error: 'Failed to connect to AI service' };
  }
}

/**
 * Save chat history
 */
export async function saveChatHistory(
  userId: string | undefined,
  sessionId: string,
  messages: AIMessage[],
  context?: Record<string, any>
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const { error } = await supabase
    .from('ai_chat_history')
    .upsert({
      user_id: userId,
      session_id: sessionId,
      messages,
      context
    }, {
      onConflict: 'session_id'
    });

  if (error) {
    // Silently ignore if table doesn't exist
    if (error.code !== '42P01') {
      console.warn('Save chat history:', error.message);
    }
    return false;
  }

  return true;
}

/**
 * Get chat history for a user
 */
export async function getChatHistory(userId: string | undefined, limit = 10): Promise<AIMessage[][]> {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from('ai_chat_history')
    .select('messages')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    // Silently ignore if table doesn't exist
    if (error.code !== '42P01') {
      console.warn('Chat history:', error.message);
    }
    return [];
  }

  return data?.map(d => d.messages) || [];
}

/**
 * Get AI insights
 */
export async function getAIInsights(filters?: {
  type?: string;
  severity?: string;
  campaignId?: string;
  dismissed?: boolean;
}): Promise<AIInsight[]> {
  let query = supabase
    .from('ai_insights')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  
  if (filters?.severity) {
    query = query.eq('severity', filters.severity);
  }
  
  if (filters?.campaignId) {
    query = query.eq('campaign_id', filters.campaignId);
  }
  
  if (filters?.dismissed !== undefined) {
    query = query.eq('dismissed', filters.dismissed);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch AI insights:', error);
    return [];
  }

  return data || [];
}

/**
 * Dismiss an insight
 */
export async function dismissInsight(insightId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ai_insights')
    .update({ dismissed: true })
    .eq('id', insightId);

  if (error) {
    console.error('Failed to dismiss insight:', error);
    return false;
  }

  return true;
}

/**
 * Generate campaign insights using AI
 */
export async function generateCampaignInsights(campaignId: string): Promise<string> {
  // Fetch campaign data
  const { data: campaign } = await supabase
    .from('dental_campaigns')
    .select(`
      *,
      service:services(*),
      branch:branches(*)
    `)
    .eq('id', campaignId)
    .single();

  // Fetch analytics
  const { data: analytics } = await supabase
    .from('campaign_analytics')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('date', { ascending: false })
    .limit(30);

  if (!campaign) {
    return 'Campaign not found';
  }

  const context = {
    campaign,
    analytics,
    totalImpressions: analytics?.reduce((sum, a) => sum + a.impressions, 0) || 0,
    totalClicks: analytics?.reduce((sum, a) => sum + a.clicks, 0) || 0,
    totalSpend: analytics?.reduce((sum, a) => sum + a.spend, 0) || 0
  };

  const messages: AIMessage[] = [{
    id: '1',
    role: 'user',
    content: `Analyze this campaign's performance and provide actionable insights and recommendations:

Campaign: ${campaign.name}
Service: ${campaign.service?.name}
Branch: ${campaign.branch?.name}, ${campaign.branch?.city}
Status: ${campaign.status}
Budget: €${campaign.total_budget}
Period: ${campaign.start_date} to ${campaign.end_date}

Performance (last 30 days):
- Impressions: ${context.totalImpressions.toLocaleString()}
- Clicks: ${context.totalClicks.toLocaleString()}
- CTR: ${context.totalImpressions > 0 ? ((context.totalClicks / context.totalImpressions) * 100).toFixed(2) : 0}%
- Spend: €${context.totalSpend.toFixed(2)}

Please provide:
1. Performance summary
2. Key observations
3. Recommendations for improvement`,
    timestamp: new Date().toISOString()
  }];

  const result = await sendAIMessage(messages, context);
  return result.response || result.error || 'Unable to generate insights';
}

/**
 * Ask AI a question with context
 */
export async function askAI(
  question: string, 
  additionalContext?: Record<string, any>
): Promise<string> {
  // Fetch relevant data based on the question
  let context: Record<string, any> = { ...additionalContext };

  // If question mentions campaigns, fetch campaign data
  if (question.toLowerCase().includes('campaign') || question.toLowerCase().includes('kampanja')) {
    const { data: campaigns } = await supabase
      .from('dental_campaigns')
      .select('name, status, total_budget, start_date')
      .limit(10);
    context.campaigns = campaigns;
  }

  // If question mentions branches, fetch branch data
  if (question.toLowerCase().includes('branch') || question.toLowerCase().includes('piste') || question.toLowerCase().includes('toimipiste')) {
    const { data: branches } = await supabase
      .from('branches')
      .select('name, city, active')
      .limit(20);
    context.branches = branches;
  }

  // If question mentions analytics or performance
  if (question.toLowerCase().includes('performance') || question.toLowerCase().includes('analytics') || question.toLowerCase().includes('suorituskyky')) {
    const { data: analytics } = await supabase
      .from('campaign_analytics')
      .select('impressions, clicks, spend, channel')
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    context.recentAnalytics = analytics;
  }

  const messages: AIMessage[] = [{
    id: '1',
    role: 'user',
    content: question,
    timestamp: new Date().toISOString()
  }];

  const result = await sendAIMessage(messages, context);
  return result.response || result.error || 'Unable to process your question';
}

// ============================================================================
// AI SUGGESTIONS (Dashboard) - Database-backed with 12h auto-refresh
// ============================================================================

export interface AISuggestion {
  id: string;
  type: 'optimization' | 'opportunity' | 'warning' | 'success';
  title: string;
  description: string;
  action?: string;
  action_url?: string;
  priority?: number;
  generated_at?: string;
  generated_by?: string;
  expires_at?: string;
  is_expired?: boolean;
  hours_until_expiry?: number;
}

export interface AISuggestionsStatus {
  lastGenerated: string | null;
  activeCount: number;
  expiredCount: number;
  nextRefresh: string;
  shouldRefresh: boolean;
  hoursUntilRefresh: number;
}

/**
 * Get the current status of AI suggestions
 */
export async function getAISuggestionsStatus(): Promise<AISuggestionsStatus | null> {
  const { data, error } = await supabase.rpc('get_ai_suggestions_status');
  
  if (error) {
    console.error('Failed to get AI suggestions status:', error);
    return null;
  }
  
  return data as AISuggestionsStatus;
}

/**
 * Check if AI suggestions need to be refreshed
 */
export async function shouldRefreshSuggestions(): Promise<boolean> {
  const { data, error } = await supabase.rpc('should_refresh_ai_suggestions');
  
  if (error) {
    console.error('Failed to check if refresh needed:', error);
    return true; // Default to refresh on error
  }
  
  return data as boolean;
}

/**
 * Get active AI suggestions from database
 */
export async function getAISuggestions(): Promise<AISuggestion[]> {
  const { data, error } = await supabase
    .from('active_ai_suggestions')
    .select('*')
    .order('priority', { ascending: false })
    .order('generated_at', { ascending: false });
  
  if (error) {
    // If view doesn't exist, fallback to regular query
    if (error.code === '42P01') {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('is_active', true)
        .eq('is_dismissed', false)
        .gt('expires_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('generated_at', { ascending: false });
      
      if (fallbackError) {
        console.error('Failed to fetch AI suggestions:', fallbackError);
        return [];
      }
      return fallbackData || [];
    }
    console.error('Failed to fetch AI suggestions:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Save new AI suggestions to database
 */
export async function saveAISuggestions(
  suggestions: Omit<AISuggestion, 'id' | 'generated_at' | 'expires_at'>[],
  generationType: 'auto' | 'manual' = 'manual',
  statsSnapshot?: Record<string, any>
): Promise<boolean> {
  const startTime = Date.now();
  
  try {
    // First, deactivate old suggestions
    await supabase.rpc('deactivate_old_ai_suggestions');
    
    // Deactivate all current active suggestions when manually regenerating
    if (generationType === 'manual') {
      await supabase
        .from('ai_suggestions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('is_active', true);
    }
    
    // Insert new suggestions
    const newSuggestions = suggestions.map((s, index) => ({
      type: s.type,
      title: s.title,
      description: s.description,
      action: s.action,
      action_url: s.action_url,
      priority: suggestions.length - index, // Higher priority for first items
      generated_by: generationType,
      expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
      context_data: statsSnapshot || {}
    }));
    
    const { error: insertError } = await supabase
      .from('ai_suggestions')
      .insert(newSuggestions);
    
    if (insertError) {
      throw insertError;
    }
    
    // Log the generation
    const duration = Date.now() - startTime;
    await supabase.from('ai_suggestions_log').insert({
      generation_type: generationType,
      stats_snapshot: statsSnapshot || {},
      suggestions_count: suggestions.length,
      generation_duration_ms: duration,
      success: true
    });
    
    return true;
  } catch (error) {
    console.error('Failed to save AI suggestions:', error);
    
    // Log the failure
    const duration = Date.now() - startTime;
    await supabase.from('ai_suggestions_log').insert({
      generation_type: generationType,
      stats_snapshot: statsSnapshot || {},
      suggestions_count: 0,
      generation_duration_ms: duration,
      success: false,
      error_message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return false;
  }
}

/**
 * Dismiss an AI suggestion
 */
export async function dismissAISuggestion(suggestionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ai_suggestions')
    .update({ 
      is_dismissed: true, 
      dismissed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', suggestionId);
  
  if (error) {
    console.error('Failed to dismiss suggestion:', error);
    return false;
  }
  
  return true;
}

/**
 * Generate and save new AI suggestions
 * This is the main function that generates suggestions via AI and saves them to the database
 */
export async function generateAndSaveAISuggestions(
  stats: {
    totalImpressions: number;
    totalClicks: number;
    totalSpend: number;
    activeCampaigns: number;
    totalBranches: number;
    impressionsChange?: number;
    clicksChange?: number;
    spendChange?: number;
  },
  generationType: 'auto' | 'manual' = 'manual'
): Promise<{ success: boolean; suggestions: AISuggestion[]; error?: string }> {
  try {
    const ctr = stats.totalImpressions > 0 
      ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2) 
      : '0';

    const messages: AIMessage[] = [{
      id: '1',
      role: 'user',
      content: `Based on this dashboard data, provide 3-4 brief, actionable suggestions for improving marketing performance. Keep each suggestion to 1-2 sentences.

Current metrics:
- Impressions: ${stats.totalImpressions.toLocaleString()} (${stats.impressionsChange !== undefined ? (stats.impressionsChange >= 0 ? '+' : '') + stats.impressionsChange.toFixed(1) + '%' : 'no change data'})
- Clicks: ${stats.totalClicks.toLocaleString()} (${stats.clicksChange !== undefined ? (stats.clicksChange >= 0 ? '+' : '') + stats.clicksChange.toFixed(1) + '%' : 'no change data'})
- CTR: ${ctr}%
- Spend: €${stats.totalSpend.toLocaleString()}
- Active campaigns: ${stats.activeCampaigns}
- Active branches: ${stats.totalBranches}

Respond in Finnish. Format your response as JSON array with objects containing: type ("optimization", "opportunity", "warning", or "success"), title (short), description (1-2 sentences), action (optional button text), actionUrl (optional, use relative paths like "/campaigns" or "/analytics").`,
      timestamp: new Date().toISOString()
    }];

    const result = await sendAIMessage(messages, stats);
    
    if (result.error) {
      return { success: false, suggestions: [], error: result.error };
    }

    // Parse the AI response
    let jsonStr = result.response;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    const arrayMatch = jsonStr.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }
    
    const parsed = JSON.parse(jsonStr);
    const formattedSuggestions: AISuggestion[] = parsed.map((s: any, i: number) => ({
      id: `suggestion-${Date.now()}-${i}`,
      type: s.type || 'optimization',
      title: s.title,
      description: s.description,
      action: s.action,
      action_url: s.actionUrl || s.action_url
    }));
    
    // Save to database
    const saved = await saveAISuggestions(formattedSuggestions, generationType, stats);
    
    if (!saved) {
      return { 
        success: false, 
        suggestions: formattedSuggestions, 
        error: 'Generated but failed to save to database' 
      };
    }
    
    // Fetch the saved suggestions (with proper IDs from database)
    const savedSuggestions = await getAISuggestions();
    
    return { success: true, suggestions: savedSuggestions };
  } catch (error) {
    console.error('Failed to generate AI suggestions:', error);
    return { 
      success: false, 
      suggestions: [], 
      error: error instanceof Error ? error.message : 'Failed to generate suggestions' 
    };
  }
}

