// ============================================================================
// SUUN TERVEYSTALO - Analytics Page
// Advanced analytics with charts, filters, and insights
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
// Analytics queries are now inline in loadAnalytics for proper filter support
import type { DailyStats, GeoStats } from '../types';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fi } from 'date-fns/locale';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  DollarSign,
  Target,
  Calendar,
  Download,
  RefreshCw,
  ChevronDown,
  MapPin
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
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { isDemoMode, DEMO_ANALYTICS, DEMO_CAMPAIGNS } from '../lib/demoService';
import { DemoBanner } from '../components/DemoTooltip';

// Register Chart.js
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

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const MetricCard = ({ title, value, change, icon: Icon, color, bgColor }: MetricCardProps) => (
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
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${bgColor}`}>
        <Icon size={24} className={color} />
      </div>
    </div>
  </div>
);

// Date Range Selector
interface DateRangeSelectorProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onPresetSelect: (preset: string) => void;
}

const DateRangeSelector = ({ startDate, endDate, onStartDateChange, onEndDateChange, onPresetSelect }: DateRangeSelectorProps) => {
  const [showPresets, setShowPresets] = useState(false);

  const presets = [
    { label: 'Viimeiset 7 päivää', value: '7d' },
    { label: 'Viimeiset 14 päivää', value: '14d' },
    { label: 'Viimeiset 30 päivää', value: '30d' },
    { label: 'Tämä kuukausi', value: 'thisMonth' },
    { label: 'Viime kuukausi', value: 'lastMonth' },
    { label: 'Viimeiset 3 kuukautta', value: '90d' },
  ];

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <Calendar size={18} className="text-gray-400" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="input py-1.5 text-sm w-36"
        />
        <span className="text-gray-400">-</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="input py-1.5 text-sm w-36"
        />
      </div>
      
      <div className="relative">
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="btn-ghost btn-sm"
        >
          Pikavalinnat
          <ChevronDown size={16} className="ml-1" />
        </button>
        
        {showPresets && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowPresets(false)} />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    onPresetSelect(preset.value);
                    setShowPresets(false);
                  }}
                  className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Analytics = () => {
  const isDemo = isDemoMode();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [branches, setBranches] = useState<Array<{ id: string; name: string; city: string }>>([]);
  
  // Analytics data
  const [summary, setSummary] = useState<{
    totalImpressions: number;
    totalClicks: number;
    totalSpend: number;
    avgCtr: number;
    avgCpm: number;
    avgCpc: number;
  } | null>(null);
  const [dailyData, setDailyData] = useState<DailyStats[]>([]);
  const [geoData, setGeoData] = useState<GeoStats[]>([]);
  const [channelData, setChannelData] = useState<Array<{ channel: string; impressions: number; clicks: number; spend: number; ctr: number; share: number }>>([]);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string; status: string; total_impressions?: number; total_clicks?: number; spent_budget?: number; total_budget?: number }>>([]);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // Demo mode - use demo data
      if (isDemo) {
        setSummary({
          totalImpressions: 317000,
          totalClicks: 7780,
          totalSpend: 12450,
          avgCtr: 2.45,
          avgCpm: 39.27,
          avgCpc: 1.60
        });
        setDailyData(DEMO_ANALYTICS.weeklyData);
        setGeoData(DEMO_ANALYTICS.geoData);
        setChannelData(DEMO_ANALYTICS.channelData);
        setBranches([
          { id: 'demo-1', name: 'Helsinki Kamppi', city: 'Helsinki' },
          { id: 'demo-2', name: 'Espoo Leppävaara', city: 'Espoo' },
          { id: 'demo-3', name: 'Tampere Keskusta', city: 'Tampere' }
        ]);
        setCampaigns(DEMO_CAMPAIGNS.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          total_impressions: c.impressions,
          total_clicks: c.clicks,
          spent_budget: c.spent,
          total_budget: c.budget
        })));
        setLoading(false);
        return;
      }

      // Map UI channel filter values to DB channel names
      const channelFilterMap: Record<string, string | undefined> = {
        all: undefined,
        DOOH: 'pdooh',
        Display: 'display',
        Social: 'meta',
      };
      const dbChannel = channelFilterMap[channelFilter] as any;

      // If branch is selected, find campaign_ids via bidtheatre_campaigns (has branch_id per row)
      let branchCampaignIds: string[] | null = null;
      if (branchFilter !== 'all') {
        const { data: btRecs } = await supabase
          .from('bidtheatre_campaigns')
          .select('campaign_id')
          .eq('branch_id', branchFilter);
        branchCampaignIds = [...new Set((btRecs || []).map(r => r.campaign_id))];
      }

      // Build base filters
      const baseFilters: any = { date_from: startDate, date_to: endDate };
      if (dbChannel) baseFilters.channel = dbChannel;

      // Load all campaign_analytics rows for the date range (apply filters client-side for branch)
      let analyticsQuery = supabase
        .from('campaign_analytics')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (dbChannel) {
        analyticsQuery = analyticsQuery.eq('channel', dbChannel);
      }
      if (branchCampaignIds && branchCampaignIds.length > 0) {
        analyticsQuery = analyticsQuery.in('campaign_id', branchCampaignIds);
      }

      const { data: allRows } = await analyticsQuery;
      const rows = allRows || [];

      // Aggregate summary metrics
      const totalImpressions = rows.reduce((s, r) => s + (r.impressions || 0), 0);
      const totalClicks = rows.reduce((s, r) => s + (r.clicks || 0), 0);
      const totalSpend = rows.reduce((s, r) => s + (r.spend || 0), 0);
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
      const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

      setSummary({ totalImpressions, totalClicks, totalSpend, avgCtr, avgCpm, avgCpc });

      // Build daily data (aggregate across campaigns per date)
      const dailyMap = new Map<string, { date: string; impressions: number; clicks: number; spend: number }>();
      rows.forEach(r => {
        const existing = dailyMap.get(r.date) || { date: r.date, impressions: 0, clicks: 0, spend: 0 };
        dailyMap.set(r.date, {
          date: r.date,
          impressions: existing.impressions + (r.impressions || 0),
          clicks: existing.clicks + (r.clicks || 0),
          spend: existing.spend + (r.spend || 0),
        });
      });
      setDailyData(Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)));

      // Build channel breakdown (always from unfiltered-by-channel data for the doughnut)
      let channelRows = rows;
      if (dbChannel) {
        // Re-fetch without channel filter for the doughnut chart
        let chQuery = supabase.from('campaign_analytics').select('channel, impressions, clicks, spend')
          .gte('date', startDate).lte('date', endDate);
        if (branchCampaignIds && branchCampaignIds.length > 0) {
          chQuery = chQuery.in('campaign_id', branchCampaignIds);
        }
        const { data: chRows } = await chQuery;
        channelRows = chRows || [];
      }
      const channelMap = new Map<string, { impressions: number; clicks: number; spend: number }>();
      let chTotalImps = 0;
      channelRows.forEach(r => {
        const ch = r.channel || 'other';
        const existing = channelMap.get(ch) || { impressions: 0, clicks: 0, spend: 0 };
        const imps = r.impressions || 0;
        chTotalImps += imps;
        channelMap.set(ch, {
          impressions: existing.impressions + imps,
          clicks: existing.clicks + (r.clicks || 0),
          spend: existing.spend + (r.spend || 0),
        });
      });
      const channelLabels: Record<string, string> = { display: 'Display', pdooh: 'PDOOH', meta: 'Meta', other: 'Muu' };
      setChannelData(Array.from(channelMap.entries()).map(([ch, stats]) => ({
        channel: channelLabels[ch] || ch,
        ...stats,
        ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0,
        share: chTotalImps > 0 ? (stats.impressions / chTotalImps) * 100 : 0,
      })).sort((a, b) => b.impressions - a.impressions));

      // Build geo data from geo_stats JSON on the latest rows
      const geoMap = new Map<string, { impressions: number; clicks: number; spend: number }>();
      rows.forEach(r => {
        const geoStats = (r as any).geo_stats;
        if (Array.isArray(geoStats) && geoStats.length > 0) {
          for (const geo of geoStats) {
            const region = geo.name || 'Tuntematon';
            const existing = geoMap.get(region) || { impressions: 0, clicks: 0, spend: 0 };
            geoMap.set(region, {
              impressions: existing.impressions + (geo.nrImps || 0),
              clicks: existing.clicks + 0,
              spend: existing.spend + (geo.cost || 0),
            });
          }
        }
      });
      // Fallback if no geo_stats: show total as "Suomi"
      if (geoMap.size === 0 && totalImpressions > 0) {
        geoMap.set('Suomi', { impressions: totalImpressions, clicks: totalClicks, spend: totalSpend });
      }
      setGeoData(Array.from(geoMap.entries()).map(([region, stats]) => ({
        region,
        ...stats,
        ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0,
      })).sort((a, b) => b.impressions - a.impressions));

      // Load branches for filter
      const { data: branchData } = await supabase
        .from('branches')
        .select('id, name, city')
        .eq('active', true)
        .order('city');
      setBranches(branchData || []);

      // Load campaign performance table (filtered by branch if selected)
      let campQuery = supabase
        .from('dental_campaigns')
        .select('id, name, status, total_budget')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (branchCampaignIds && branchCampaignIds.length > 0) {
        campQuery = campQuery.in('id', branchCampaignIds);
      }
      const { data: campaignData } = await campQuery;
      
      // Group analytics by campaign_id for the table
      const byCampaign = new Map<string, { imps: number; clicks: number; spend: number }>();
      rows.forEach(r => {
        const existing = byCampaign.get(r.campaign_id) || { imps: 0, clicks: 0, spend: 0 };
        byCampaign.set(r.campaign_id, {
          imps: existing.imps + (r.impressions || 0),
          clicks: existing.clicks + (r.clicks || 0),
          spend: existing.spend + (r.spend || 0),
        });
      });

      setCampaigns((campaignData || []).map(c => {
        const stats = byCampaign.get(c.id) || { imps: 0, clicks: 0, spend: 0 };
        return {
          ...c,
          spent_budget: stats.spend,
          total_impressions: stats.imps,
          total_clicks: stats.clicks,
        };
      }));

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, branchFilter, channelFilter]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const handlePresetSelect = (preset: string) => {
    const today = new Date();
    
    switch (preset) {
      case '7d':
        setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case '14d':
        setStartDate(format(subDays(today, 14), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case '30d':
        setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'thisMonth':
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'lastMonth': {
        const lastMonth = subMonths(today, 1);
        setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
      }
      case '90d':
        setStartDate(format(subDays(today, 90), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
    }
  };

  const handleExport = () => {
    // Generate CSV
    const csv = [
      ['Päivä', 'Näytöt', 'Klikkaukset', 'CTR', 'Kulutus'].join(','),
      ...dailyData.map(d => [
        d.date,
        d.impressions,
        d.clicks,
        d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) : '0.00',
        d.spend.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_${startDate}_${endDate}.csv`;
    link.click();
  };

  // Chart data
  const impressionsChartData = {
    labels: dailyData.map(d => format(new Date(d.date), 'd.M', { locale: fi })),
    datasets: [
      {
        label: 'Näyttökerrat',
        data: dailyData.map(d => d.impressions),
        fill: true,
        backgroundColor: 'rgba(0, 165, 181, 0.1)',
        borderColor: '#00A5B5',
        tension: 0.4,
      },
      {
        label: 'Klikkaukset',
        data: dailyData.map(d => d.clicks),
        fill: false,
        borderColor: '#E31E24',
        tension: 0.4,
      },
    ],
  };

  const channelChartData = {
    labels: channelData.map(c => c.channel),
    datasets: [{
      data: channelData.map(c => c.impressions),
      backgroundColor: ['#00A5B5', '#1B365D', '#E31E24', '#F59E0B'],
      borderWidth: 0,
    }],
  };

  const spendChartData = {
    labels: dailyData.map(d => format(new Date(d.date), 'd.M', { locale: fi })),
    datasets: [{
      label: 'Kulutus (€)',
      data: dailyData.map(d => d.spend),
      backgroundColor: '#00A5B5',
      borderRadius: 4,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { padding: 20, usePointStyle: true },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#F3F4F6' }, beginAtZero: true },
    },
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner text-[#00A5B5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Demo Banner */}
      {isDemo && <DemoBanner message="Demo-tila: Nämä ovat esimerkkitietoja analytiikasta. Oikeassa tilissä näet omat kampanjatiedot!" />}
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytiikka</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {format(new Date(startDate), 'd.M.yyyy', { locale: fi })} - {format(new Date(endDate), 'd.M.yyyy', { locale: fi })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeSelector
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onPresetSelect={handlePresetSelect}
          />
          <button
            onClick={handleRefresh}
            className="btn-ghost"
            disabled={refreshing || isDemo}
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleExport} className="btn-outline">
            <Download size={18} className="mr-2" />
            Vie CSV
          </button>
        </div>
      </div>

      {/* Channel Filter */}
      <div className="card p-4 dark:bg-slate-800/70 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-4">
          {/* Channel Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Kanava:</span>
            {['all', 'DOOH', 'Display', 'Social'].map((channel) => (
              <button
                key={channel}
                onClick={() => setChannelFilter(channel)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  channelFilter === channel
                    ? 'bg-[#00A5B5] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {channel === 'all' ? 'Kaikki' : channel}
              </button>
            ))}
          </div>
          
          {/* Branch/City Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              <MapPin size={14} className="inline mr-1" />
              Toimipiste:
            </span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00A5B5]"
            >
              <option value="all">Kaikki toimipisteet</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.city})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Näyttökerrat"
          value={summary?.totalImpressions || 0}
          icon={Eye}
          color="text-[#00A5B5]"
          bgColor="bg-[#00A5B5]/10"
        />
        <MetricCard
          title="Klikkaukset"
          value={summary?.totalClicks || 0}
          icon={MousePointer}
          color="text-[#1B365D]"
          bgColor="bg-[#1B365D]/10"
        />
        <MetricCard
          title="CTR"
          value={`${(summary?.avgCtr || 0).toFixed(2)}%`}
          icon={Target}
          color="text-[#E31E24]"
          bgColor="bg-[#E31E24]/10"
        />
        <MetricCard
          title="Kokonaiskulutus"
          value={`€${(summary?.totalSpend || 0).toLocaleString('fi-FI')}`}
          icon={DollarSign}
          color="text-green-600"
          bgColor="bg-green-100"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 card p-6 dark:bg-slate-800/70 dark:border-white/10">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Suorituskyky ajan mukaan</h2>
          <div className="h-80">
            <Line data={impressionsChartData} options={chartOptions} />
          </div>
        </div>

        {/* Channel Distribution */}
        <div className="card p-6 dark:bg-slate-800/70 dark:border-white/10">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Kanavajakauma</h2>
          <div className="h-80">
            <Doughnut 
              data={channelChartData} 
              options={{
                ...chartOptions,
                cutout: '70%',
              }} 
            />
          </div>
        </div>
      </div>

      {/* Spend Chart & Geo Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend Over Time */}
        <div className="card p-6 dark:bg-slate-800/70 dark:border-white/10">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Päiväkohtainen kulutus</h2>
          <div className="h-64">
            <Bar data={spendChartData} options={chartOptions} />
          </div>
        </div>

        {/* Top Regions */}
        <div className="card p-6 dark:bg-slate-800/70 dark:border-white/10">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Top alueet</h2>
          <div className="space-y-3">
            {geoData.slice(0, 6).map((geo, index) => (
              <div key={geo.region || index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                    <MapPin size={14} className="text-gray-600 dark:text-gray-300" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{geo.region || 'Tuntematon'}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">{geo.impressions.toLocaleString('fi-FI')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">näyttöä</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Campaigns */}
      <div className="card p-6 dark:bg-slate-800/70 dark:border-white/10">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Parhaiten suoriutuneet kampanjat</h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Kampanja</th>
                <th>Tila</th>
                <th className="text-right">Näytöt</th>
                <th className="text-right">Klikkaukset</th>
                <th className="text-right">CTR</th>
                <th className="text-right">Kulutus</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    Ei kampanjoita valitulla ajanjaksolla
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="font-medium text-gray-900">{campaign.name}</td>
                    <td>
                      <span className={`badge ${
                        campaign.status === 'active' ? 'badge-success' : 
                        campaign.status === 'paused' ? 'badge-warning' : 'badge-gray'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="text-right">{(campaign.total_impressions || 0).toLocaleString('fi-FI')}</td>
                    <td className="text-right">{(campaign.total_clicks || 0).toLocaleString('fi-FI')}</td>
                    <td className="text-right">
                      {(campaign.total_impressions ?? 0) > 0 
                        ? (((campaign.total_clicks ?? 0) / (campaign.total_impressions ?? 1)) * 100).toFixed(2)
                        : '0.00'}%
                    </td>
                    <td className="text-right">€{(campaign.spent_budget || 0).toLocaleString('fi-FI')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
