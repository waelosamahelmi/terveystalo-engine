// ============================================================================
// SUUN TERVEYSTALO - Dashboard Page
// Main overview with stats, charts, and AI insights
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getDashboardStats, getRecentAnalytics } from '../lib/analyticsService';
import { getAIInsights, sendAIMessage, getAISuggestions, generateAndSaveAISuggestions, shouldRefreshSuggestions, getAISuggestionsStatus, dismissAISuggestion } from '../lib/aiService';
import { isDemoMode, DEMO_DASHBOARD_STATS, DEMO_ANALYTICS, DEMO_CAMPAIGNS as DEMO_CAMPAIGNS_DATA } from '../lib/demoService';
import type { AIMessage, AISuggestion as AISuggestionType } from '../types';
import { useStore } from '../lib/store';
import { format } from 'date-fns';
import { fi } from 'date-fns/locale';
import DemoTooltip, { DemoBanner } from '../components/DemoTooltip';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  DollarSign,
  Target,
  MapPin,
  Megaphone,
  Plus,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Calendar,
  BarChart3,
  Lightbulb,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Zap,
  TrendingUp as TrendUp
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import type { DashboardStats, AIInsight } from '../types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: 'primary' | 'secondary' | 'accent' | 'success' | 'warning';
}

const StatCard = ({ title, value, change, icon: Icon, color }: StatCardProps) => {
  const colorClasses = {
    primary: 'bg-[#00A5B5]/10 text-[#00A5B5] dark:bg-[#00A5B5]/20',
    secondary: 'bg-[#E31E24]/10 text-[#E31E24] dark:bg-[#E31E24]/20',
    accent: 'bg-[#1B365D]/10 text-[#1B365D] dark:bg-[#0046AD]/30 dark:text-[#60a5fa]',
    success: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <div className="card p-6 animate-fade-in dark:bg-slate-800/70 dark:border-white/10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {typeof value === 'number' ? value.toLocaleString('fi-FI') : value}
          </p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm font-medium ${change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {change >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
              <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
              <span className="text-gray-400 dark:text-gray-500 ml-1">vs. edellinen</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

// Quick Action Button Component
interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  to: string;
  color: string;
}

const QuickAction = ({ title, description, icon: Icon, to, color }: QuickActionProps) => (
  <Link
    to={to}
    className="card-hover p-4 flex items-center space-x-4 group dark:bg-slate-800/70 dark:border-white/10 dark:hover:bg-slate-700/70"
  >
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 dark:text-white">{title}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{description}</p>
    </div>
    <ArrowRight size={20} className="text-gray-400 dark:text-gray-500 group-hover:text-[#00A5B5] group-hover:translate-x-1 transition-all" />
  </Link>
);

// AI Suggestion type (use imported type from service)
interface AISuggestion {
  id: string;
  type: 'optimization' | 'opportunity' | 'warning' | 'success';
  title: string;
  description: string;
  action?: string;
  action_url?: string;
  generated_at?: string;
  expires_at?: string;
  hours_until_expiry?: number;
}

// AI Suggestions Widget Component - Database-backed with 12h auto-refresh
interface AISuggestionsWidgetProps {
  stats: DashboardStats | null;
  activeCampaignsCount: number;
  branchesCount: number;
}

const AISuggestionsWidget = ({ stats, activeCampaignsCount, branchesCount }: AISuggestionsWidgetProps) => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);
  const [hoursUntilRefresh, setHoursUntilRefresh] = useState<number | null>(null);

  // Load suggestions from database on mount
  useEffect(() => {
    loadSuggestionsFromDatabase();
  }, []);

  // Check for auto-refresh when stats change
  useEffect(() => {
    if (stats && !initialLoading) {
      checkAndAutoRefresh();
    }
  }, [stats]);

  const loadSuggestionsFromDatabase = async () => {
    try {
      setInitialLoading(true);
      
      // Get current suggestions from database
      const dbSuggestions = await getAISuggestions();
      
      if (dbSuggestions.length > 0) {
        setSuggestions(dbSuggestions);
        // Get the latest generation time
        const latestGen = dbSuggestions[0]?.generated_at;
        if (latestGen) {
          setLastRefresh(new Date(latestGen));
        }
      }
      
      // Get status info
      const status = await getAISuggestionsStatus();
      if (status) {
        setHoursUntilRefresh(status.hoursUntilRefresh);
        if (status.nextRefresh) {
          setNextRefresh(new Date(status.nextRefresh));
        }
      }
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const checkAndAutoRefresh = async () => {
    try {
      const needsRefresh = await shouldRefreshSuggestions();
      
      if (needsRefresh && stats) {
        // Auto-generate new suggestions
        await generateSuggestions('auto');
      }
    } catch (err) {
      console.error('Auto-refresh check failed:', err);
    }
  };

  const generateSuggestions = async (generationType: 'auto' | 'manual' = 'manual') => {
    if (!stats) return;
    
    setLoading(true);
    setError(null);

    try {
      // Build context from current dashboard data
      const context = {
        totalImpressions: stats?.totalImpressions ?? stats?.totalImpressionsMTD ?? 0,
        totalClicks: stats?.totalClicks ?? 0,
        totalSpend: stats?.totalSpend ?? stats?.totalSpendMTD ?? 0,
        activeCampaigns: activeCampaignsCount,
        totalBranches: branchesCount,
        impressionsChange: stats?.impressionsChange,
        clicksChange: stats?.clicksChange,
        spendChange: stats?.spendChange,
        ctr: stats?.totalImpressions ? ((stats?.totalClicks ?? 0) / stats.totalImpressions * 100).toFixed(2) : 0
      };

      // Use the new database-backed generation function
      const result = await generateAndSaveAISuggestions(context, generationType);
      
      if (!result.success) {
        setError(result.error || 'Ehdotusten luonti epäonnistui');
        return;
      }

      // Map database format to component format
      const formattedSuggestions: AISuggestion[] = (result.suggestions || []).map((s: any) => ({
        id: s.id,
        type: s.type || 'optimization',
        title: s.title,
        description: s.description,
        action: s.action,
        actionUrl: s.action_url
      }));
      
      setSuggestions(formattedSuggestions);
      setLastRefresh(new Date());
      
      // Update next refresh info
      const status = await getAISuggestionsStatus();
      if (status) {
        setNextRefresh(status.next_refresh_at ? new Date(status.next_refresh_at) : null);
        setHoursUntilRefresh(status.hours_until_refresh);
      }
    } catch (err) {
      setError('AI-palveluun ei saada yhteyttä');
    } finally {
      setLoading(false);
    }
  };

  // Load suggestions on mount - either from database or generate new ones
  useEffect(() => {
    loadSuggestionsFromDatabase();
  }, []);
  
  // Check for auto-refresh when stats become available
  useEffect(() => {
    if (stats && !initialLoading) {
      checkAndAutoRefresh();
    }
  }, [stats, initialLoading]);

  const getTypeIcon = (type: AISuggestion['type']) => {
    switch (type) {
      case 'optimization': return <Zap size={16} className="text-blue-500" />;
      case 'opportunity': return <TrendUp size={16} className="text-green-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'success': return <CheckCircle2 size={16} className="text-emerald-500" />;
    }
  };

  const getTypeBg = (type: AISuggestion['type']) => {
    switch (type) {
      case 'optimization': return 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700';
      case 'opportunity': return 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700';
      case 'warning': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-700';
      case 'success': return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700';
    }
  };

  return (
    <div className="card p-6 dark:bg-slate-800/70 dark:border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#00A5B5] to-[#1B365D]">
            <Lightbulb size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">AI-ehdotukset</h2>
            {lastRefresh && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Päivitetty {format(lastRefresh, 'HH:mm', { locale: fi })}
                {hoursUntilRefresh !== null && hoursUntilRefresh > 0 && (
                  <span className="ml-1">
                    · Seuraava päivitys {Math.round(hoursUntilRefresh)}h päästä
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => generateSuggestions('manual')}
          disabled={loading}
          className="btn-ghost btn-sm"
          title="Päivitä ehdotukset manuaalisesti"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
        </button>
      </div>

      {(loading || initialLoading) && suggestions.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-100 dark:bg-slate-600 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <AlertTriangle size={32} className="mx-auto text-yellow-500 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={() => generateSuggestions('manual')}
            className="text-sm text-[#00A5B5] mt-2 hover:underline"
          >
            Yritä uudelleen
          </button>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-6">
          <Sparkles size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Ei ehdotuksia saatavilla</p>
          <button
            onClick={() => generateSuggestions('manual')}
            className="text-sm text-[#00A5B5] mt-2 hover:underline"
          >
            Luo ehdotukset
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className={`p-3 rounded-lg border ${getTypeBg(suggestion.type)} transition-all hover:shadow-sm`}
            >
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">{getTypeIcon(suggestion.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{suggestion.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{suggestion.description}</p>
                  {suggestion.actionUrl && (
                    <Link
                      to={suggestion.actionUrl}
                      className="text-xs text-[#00A5B5] font-medium mt-1 inline-block hover:underline"
                    >
                      {suggestion.action || 'Toteuta'} →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10">
        <Link
          to="/ai-assistant"
          className="flex items-center justify-center space-x-2 text-sm text-[#00A5B5] hover:text-[#008a97] font-medium"
        >
          <Sparkles size={14} />
          <span>Avaa AI-avustaja</span>
        </Link>
      </div>
    </div>
  );
};

// AI Insight Card Component
interface InsightCardProps {
  insight: AIInsight;
  onDismiss: (id: string) => void;
}

const InsightCard = ({ insight, onDismiss }: InsightCardProps) => {
  const severityColors = {
    high: 'border-l-red-500 bg-red-50 dark:bg-red-900/30',
    medium: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/30',
    low: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/30',
  };

  return (
    <div className={`border-l-4 rounded-r-lg p-4 ${severityColors[insight.severity]}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <Sparkles size={18} className="text-[#00A5B5] mt-0.5" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{insight.title}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{insight.description}</p>
            {insight.action_url && (
              <Link to={insight.action_url} className="text-sm text-[#00A5B5] font-medium mt-2 inline-block hover:underline">
                {insight.action_label || 'Katso lisää'} →
              </Link>
            )}
          </div>
        </div>
        <button
          onClick={() => onDismiss(insight.id)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
        >
          Ohita
        </button>
      </div>
    </div>
  );
};

const Dashboard = () => {
  // Check if in demo mode
  const isDemo = isDemoMode();
  
  // Get data from global store - instant!
  const { campaigns, branches, user } = useStore();
  const canCreateCampaign = user?.role !== 'viewer';
  
  // Computed data from store (use demo data in demo mode)
  const activeCampaigns = useMemo(() => {
    if (isDemo) {
      return DEMO_CAMPAIGNS_DATA.filter(c => c.status === 'active').slice(0, 5);
    }
    return campaigns.filter(c => c.status === 'active').slice(0, 5);
  }, [campaigns, isDemo]);
  
  const topBranches = useMemo(() => 
    branches.filter(b => b.active).slice(0, 5), 
    [branches]
  );

  // Dashboard-specific state (analytics, AI insights - these need separate fetch)
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [recentAnalytics, setRecentAnalytics] = useState<{
    daily: { date: string; impressions: number; clicks: number; spend: number }[];
    byChannel: Record<string, { impressions: number; clicks: number; spend: number }>;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (forceRefresh = false) => {
    try {
      setLoading(true);

      // In demo mode, use demo data
      if (isDemo) {
        setStats({
          totalImpressions: DEMO_DASHBOARD_STATS.totalImpressions,
          totalImpressionsMTD: DEMO_DASHBOARD_STATS.totalImpressions,
          totalClicks: DEMO_DASHBOARD_STATS.totalClicks,
          totalSpend: DEMO_DASHBOARD_STATS.totalSpent,
          totalSpendMTD: DEMO_DASHBOARD_STATS.totalSpent,
          impressionsChange: DEMO_DASHBOARD_STATS.impressionsChange,
          clicksChange: DEMO_DASHBOARD_STATS.clicksChange,
          spendChange: DEMO_DASHBOARD_STATS.spentChange,
          activeCampaigns: DEMO_DASHBOARD_STATS.activeCampaigns,
        } as DashboardStats);
        
        setRecentAnalytics({
          daily: DEMO_ANALYTICS.weeklyData.map(d => ({
            date: d.date,
            impressions: d.impressions,
            clicks: d.clicks,
            spend: d.spent,
          })),
          byChannel: {
            dooh: { impressions: 95000, clicks: 2100, spend: 2200 },
            display: { impressions: 180000, clicks: 4500, spend: 3800 },
            social: { impressions: 42000, clicks: 1180, spend: 890 },
          },
        });
        
        setInsights([
          {
            id: 'demo-insight-1',
            title: 'Hammashoito-kampanja toimii erinomaisesti',
            description: 'CTR on 2.56%, joka on 15% parempi kuin keskiarvo.',
            severity: 'low',
            category: 'performance',
          },
          {
            id: 'demo-insight-2',
            title: 'Budjetti loppumassa pian',
            description: 'Oikomishoito-kampanjan budjetti on käytetty 51%.',
            severity: 'medium',
            category: 'budget',
          },
        ] as AIInsight[]);
        
        setLoading(false);
        return;
      }

      // Load analytics data (not in store)
      const [
        dashboardStats,
        analytics,
        aiInsights,
      ] = await Promise.all([
        getDashboardStats().catch(() => null),
        getRecentAnalytics(30).catch(() => null),
        getAIInsights({ dismissed: false }).catch(() => []),
      ]);

      if (dashboardStats) setStats(dashboardStats);
      if (analytics) setRecentAnalytics(analytics);
      setInsights((aiInsights || []).slice(0, 5));

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData(true);
    setRefreshing(false);
  };

  const handleDismissInsight = async (insightId: string) => {
    setInsights(prev => prev.filter(i => i.id !== insightId));
    // Also update in database
    await supabase
      .from('ai_insights')
      .update({ dismissed: true })
      .eq('id', insightId);
  };

  // Chart data
  const dailyData = recentAnalytics?.daily || [];
  const impressionsChartData = {
    labels: dailyData.slice(-14).map(d => format(new Date(d.date), 'd.M', { locale: fi })),
    datasets: [
      {
        label: 'Näyttökerrat',
        data: dailyData.slice(-14).map(d => d.impressions),
        fill: true,
        backgroundColor: 'rgba(0, 165, 181, 0.1)',
        borderColor: '#00A5B5',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
      },
    ],
  };

  const byChannel = recentAnalytics?.byChannel || {};
  const channelChartData = {
    labels: ['DOOH', 'Display', 'Social'],
    datasets: [
      {
        data: [
          byChannel['pdooh']?.impressions || 0,
          byChannel['display']?.impressions || 0,
          byChannel['meta']?.impressions || 0,
        ],
        backgroundColor: ['#00A5B5', '#1B365D', '#E31E24'],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1F2937',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9CA3AF' },
      },
      y: {
        grid: { color: '#F3F4F6' },
        ticks: { color: '#9CA3AF' },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
    },
    cutout: '70%',
  };

  // Skeleton loader for cards
  const CardSkeleton = () => (
    <div className="card p-6 animate-pulse dark:bg-slate-800/70">
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-3"></div>
      <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Demo Banner */}
      {isDemo && <DemoBanner message="Demo-tila: Tämä on esimerkki-dataa. Voit kokeilla kaikkia toimintoja turvallisesti." />}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {format(new Date(), "EEEE, d. MMMM yyyy", { locale: fi })}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="btn-ghost"
            disabled={refreshing || loading}
          >
            <RefreshCw size={18} className={refreshing || loading ? 'animate-spin' : ''} />
          </button>
          {canCreateCampaign && (
            <DemoTooltip
              id="dashboard-create"
              title="Luo uusi kampanja"
              description="Klikkaa tästä luodaksesi uuden mainoskampanjan. Ohjattu prosessi auttaa sinua valitsemaan palvelun, sijainnin ja budjetin."
              position="left"
            >
              <Link to="/campaigns/create" className="btn-primary" data-demo-tooltip="create-campaign">
                <Plus size={18} className="mr-2" />
                Uusi kampanja
              </Link>
            </DemoTooltip>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <DemoTooltip
        id="dashboard-stats"
        title="Kampanjatilastot"
        description="Nämä kortit näyttävät kampanjoidesi tärkeimmät mittarit: näyttökerrat, klikkaukset, konversiot ja käytetyn budjetin."
        position="bottom"
        delay={1000}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-demo-tooltip="stats">
          {loading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                title="Näyttökerrat"
                value={stats?.totalImpressions ?? stats?.totalImpressionsMTD ?? 0}
                change={stats?.impressionsChange}
              icon={Eye}
              color="primary"
            />
            <StatCard
              title="Klikkaukset"
              value={stats?.totalClicks ?? 0}
              change={stats?.clicksChange}
              icon={MousePointer}
              color="accent"
            />
            <StatCard
              title="Käytetty budjetti"
              value={`€${(stats?.totalSpend ?? stats?.totalSpendMTD ?? 0).toLocaleString('fi-FI')}`}
              change={stats?.spendChange}
              icon={DollarSign}
              color="success"
            />
            <StatCard
              title="Aktiiviset kampanjat"
              value={isDemo ? DEMO_DASHBOARD_STATS.activeCampaigns : (stats?.activeCampaigns || 0)}
              icon={Target}
              color="secondary"
            />
          </>
        )}
        </div>
      </DemoTooltip>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Impressions Chart */}
          <div className="card p-6 dark:bg-slate-800/70 dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Näyttökerrat</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Viimeiset 14 päivää</p>
              </div>
              <div className="flex items-center space-x-2">
                <button className="btn-ghost btn-sm">
                  <BarChart3 size={16} className="mr-1" />
                  Viikko
                </button>
                <button className="btn-ghost btn-sm">
                  <Calendar size={16} className="mr-1" />
                  Kuukausi
                </button>
              </div>
            </div>
            <div className="h-64">
              <Line data={impressionsChartData} options={chartOptions} />
            </div>
          </div>

          {/* Active Campaigns */}
          <div className="card p-6 dark:bg-slate-800/70 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Aktiiviset kampanjat</h2>
              <Link to="/campaigns" className="text-sm text-[#00A5B5] hover:underline">
                Näytä kaikki →
              </Link>
            </div>
            <div className="space-y-3">
              {activeCampaigns.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Ei aktiivisia kampanjoita
                </p>
              ) : (
                activeCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    to={`/campaigns/${campaign.id}`}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-[#00A5B5]/10 dark:bg-[#00A5B5]/20 flex items-center justify-center">
                        <Megaphone size={18} className="text-[#00A5B5]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {campaign.branch?.[0]?.name}, {campaign.branch?.[0]?.city}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">€{campaign.total_budget}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {campaign.end_date ? format(new Date(campaign.end_date), 'd.M.yyyy') : ''} asti
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card p-6 dark:bg-slate-800/70 dark:border-white/10">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Pikatoiminnot</h2>
            <div className="space-y-3">
              {canCreateCampaign && (
                <QuickAction
                  title="Luo kampanja"
                  description="Aloita uusi mainoskampanja"
                  icon={Plus}
                  to="/campaigns/create"
                  color="bg-[#00A5B5]"
                />
              )}
              <QuickAction
                title="Lisää piste"
                description="Rekisteröi uusi toimipiste"
                icon={MapPin}
                to="/branches"
                color="bg-[#1B365D]"
              />
              <QuickAction
                title="Luo raportti"
                description="Generoi suoritusraportti"
                icon={BarChart3}
                to="/reports"
                color="bg-[#E31E24]"
              />
            </div>
          </div>

          {/* AI Suggestions Widget */}
          <AISuggestionsWidget 
            stats={stats}
            activeCampaignsCount={activeCampaigns.length}
            branchesCount={topBranches.length}
          />

          {/* Channel Distribution */}
          <div className="card p-6 dark:bg-slate-800/70 dark:border-white/10">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Kanavajakauma</h2>
            <div className="h-48">
              <Doughnut data={channelChartData} options={doughnutOptions} />
            </div>
          </div>

          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="card p-6 dark:bg-slate-800/70 dark:border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Sparkles size={18} className="text-[#00A5B5]" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">AI Oivallukset</h2>
                </div>
                <Link to="/ai-assistant" className="text-sm text-[#00A5B5] hover:underline">
                  Lisää →
                </Link>
              </div>
              <div className="space-y-3">
                {insights.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onDismiss={handleDismissInsight}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Top Branches */}
          <div className="card p-6 dark:bg-slate-800/70 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Aktiiviset pisteet</h2>
              <Link to="/branches" className="text-sm text-[#00A5B5] hover:underline">
                Kaikki →
              </Link>
            </div>
            <div className="space-y-3">
              {topBranches.map((branch) => (
                <div key={branch.id} className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                    <MapPin size={14} className="text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{branch.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{branch.city}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
