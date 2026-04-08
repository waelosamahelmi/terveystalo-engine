import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Line, Bar, Pie } from 'react-chartjs-2';
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
} from 'chart.js';
import { format, parse, parseISO } from 'date-fns';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { syncMetaAnalytics } from '../lib/metaAdsService';

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface CampaignStats {
  CTR: number;
  activeImps: number;
  nrClicks: number;
  nrImps: number;
  cost: number;
  revenue: number;
  engagementRate: number;
}

interface DeviceStats {
  deviceType: { id: number; href: string };
  nrImps: number;
  nrClicks: number;
}

interface AudienceStats {
  audName: string;
  nrUniques: number;
  nrClickUniques: number;
  matchIndexImps: number;
}

interface GeoStats {
  region: string;
  latitude: number;
  longitude: number;
}

interface GeoCityStats {
  city: string;
  latitude: number;
  longitude: number;
  regionName: string;
  cityName: string;
  regionId: number;
  quota: number;
  ctr: number | null;
  quotaClick: number | null;
}

interface SiteStats {
  rtbSiteURL: string;
  nrImps: number;
  cost: number;
  revenue: number;
  viewableRate: number;
}

interface HotspotStats {
  hour?: number;
  weekday?: number;
  day?: number;
  month?: number;
  year?: number;
  nrImps: number;
  timeVisible: number;
  activeImps: number;
  nrClicks: number;
  engagementRate: number;
}

interface DailyStats {
  day: string;
  nrImps: number;
  nrClicks: number;
  CTR: number;
  activeImps: number;
  viewableRate: number;
  engagementRate: number;
  revenue: number;
  cost: number;
}

const CampaignDetails = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { campaigns, branches: allBranches, services: allServices } = useStore();
  const campaign = campaigns.find(c => c.id === campaignId);

  // Resolve branch_ids and service_ids to full objects
  const campaignBranchIds: string[] = useMemo(() => {
    const raw = (campaign as any)?.branch_ids;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') { try { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } catch {} }
    return campaign?.branch?.id ? [campaign.branch.id] : [];
  }, [campaign]);

  const campaignServiceIds: string[] = useMemo(() => {
    const raw = (campaign as any)?.service_ids;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') { try { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } catch {} }
    return campaign?.service?.id ? [campaign.service.id] : [];
  }, [campaign]);

  const campaignBranches = useMemo(() =>
    allBranches.filter(b => campaignBranchIds.includes(b.id)),
    [allBranches, campaignBranchIds]
  );

  const campaignServices = useMemo(() =>
    allServices.filter(s => campaignServiceIds.includes(s.id)),
    [allServices, campaignServiceIds]
  );

  const branchRadiusSettings: Record<string, { radius: number; enabled: boolean }> = useMemo(() => {
    const raw = (campaign as any)?.branch_radius_settings;
    if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
    return raw || {};
  }, [campaign]);
  const { spendData } = location.state || {};
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [creativesLoading, setCreativesLoading] = useState(false);
  const [displayStats, setDisplayStats] = useState<CampaignStats[]>([]);
  const [pdoohStats, setPdoohStats] = useState<CampaignStats[]>([]);
  const [displayDevices, setDisplayDevices] = useState<DeviceStats[]>([]);
  const [displayAudience, setDisplayAudience] = useState<AudienceStats[]>([]);
  const [pdoohAudience, setPdoohAudience] = useState<AudienceStats[]>([]);
  const [displayGeo, setDisplayGeo] = useState<GeoStats[]>([]);
  const [pdoohGeo, setPdoohGeo] = useState<GeoStats[]>([]);
  const [displayGeoCities, setDisplayGeoCities] = useState<GeoCityStats[]>([]);
  const [pdoohGeoCities, setPdoohGeoCities] = useState<GeoCityStats[]>([]);
  const [displaySites, setDisplaySites] = useState<SiteStats[]>([]);
  const [pdoohSites, setPdoohSites] = useState<SiteStats[]>([]);
  const [displayHotspots, setDisplayHotspots] = useState<HotspotStats[]>([]);
  const [pdoohHotspots, setPdoohHotspots] = useState<HotspotStats[]>([]);
  const [displayDailyStats, setDisplayDailyStats] = useState<DailyStats[]>([]);
  const [pdoohDailyStats, setPdoohDailyStats] = useState<DailyStats[]>([]);
  
  // Meta channel state
  const [metaStats, setMetaStats] = useState<CampaignStats[]>([]);
  const [metaDailyStats, setMetaDailyStats] = useState<DailyStats[]>([]);
  const [metaAudienceData, setMetaAudienceData] = useState<any>(null); // audience_stats JSONB with reach, frequency, etc.
  const [metaVideoViews, setMetaVideoViews] = useState<number>(0);
  const [metaSyncing, setMetaSyncing] = useState(false);

  // Replace two date inputs with a single month input
  const currentDate = new Date();
  const currentYearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);

  console.log('CampaignDetails: Initial render', { campaignId, spendData, selectedMonth });

  // Helper function to filter daily stats by selected month
  const filterDailyStatsByMonth = (dailyStats: any[]) => {
    if (!dailyStats || !Array.isArray(dailyStats)) return [];
    
    const [year, month] = selectedMonth.split('-').map(Number);
    
    return dailyStats.filter(stat => {
      if (!stat.day) return false;
      
      const statDate = parseISO(stat.day.split(' ')[0]);
      return statDate.getFullYear() === year && statDate.getMonth() + 1 === month;
    });
  };

  const fetchCampaignStats = useCallback(async () => {
    try {
      setLoading(true);

      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

      // Fetch all analytics rows for this campaign in the selected month
      const { data: rows, error } = await supabase
        .from('campaign_analytics')
        .select('*')
        .eq('campaign_id', campaignId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      const allRows = rows || [];

      if (allRows.length === 0) {
        // No data — set defaults
        setDisplayStats([{ CTR: 0, activeImps: 0, nrClicks: 0, nrImps: 0, cost: 0, revenue: 0, engagementRate: 0 }]);
        setPdoohStats([{ CTR: 0, activeImps: 0, nrClicks: 0, nrImps: 0, cost: 0, revenue: 0, engagementRate: 0 }]);
        setDisplayDevices([]); setDisplayAudience([]); setPdoohAudience([]);
        setDisplayGeo([]); setPdoohGeo([]); setDisplayGeoCities([]); setPdoohGeoCities([]);
        setDisplaySites([]); setPdoohSites([]); setDisplayHotspots([]); setPdoohHotspots([]);
        setDisplayDailyStats([]); setPdoohDailyStats([]);
        setLoading(false);
        return;
      }

      // Split rows by channel
      const displayRows = allRows.filter(r => r.channel === 'display');
      const pdoohRows = allRows.filter(r => r.channel === 'pdooh');
      const metaRows = allRows.filter(r => r.channel === 'meta');

      // Helper: aggregate basic stats from rows
      const aggregateStats = (channelRows: typeof allRows): CampaignStats => {
        const nrImps = channelRows.reduce((s, r) => s + (r.impressions || 0), 0);
        const nrClicks = channelRows.reduce((s, r) => s + (r.clicks || 0), 0);
        const cost = channelRows.reduce((s, r) => s + (r.spend || 0), 0);
        return {
          CTR: nrImps > 0 ? (nrClicks / nrImps) * 100 : 0,
          activeImps: nrImps,
          nrClicks,
          nrImps,
          cost,
          revenue: cost,
          engagementRate: channelRows.reduce((s, r) => s + (r.engagement_rate || 0), 0) / (channelRows.length || 1),
        };
      };

      setDisplayStats([aggregateStats(displayRows)]);
      setPdoohStats([aggregateStats(pdoohRows)]);
      setMetaStats([aggregateStats(metaRows)]);

      // Meta-specific: aggregate audience_stats JSONB data (reach, frequency, link_clicks, landing_page_views)
      const metaAudience = {
        reach: 0,
        frequency: 0,
        link_clicks: 0,
        landing_page_views: 0,
      };
      let metaVidViews = 0;
      for (const row of metaRows) {
        const as = row.audience_stats;
        if (as && typeof as === 'object' && !Array.isArray(as)) {
          metaAudience.reach += Number(as.reach || 0);
          metaAudience.link_clicks += Number(as.link_clicks || 0);
          metaAudience.landing_page_views += Number(as.landing_page_views || 0);
        }
        metaVidViews += Number(row.video_views || 0);
      }
      // Frequency = impressions / reach (average)
      const totalMetaImps = metaRows.reduce((s, r) => s + (r.impressions || 0), 0);
      metaAudience.frequency = metaAudience.reach > 0 ? totalMetaImps / metaAudience.reach : 0;
      setMetaAudienceData(metaAudience);
      setMetaVideoViews(metaVidViews);

      // Helper: merge JSONB array breakdowns from rows (device_stats, geo_stats, etc.)
      const mergeJsonbArrays = (channelRows: typeof allRows, field: string) => {
        const map = new Map<string | number, any>();
        for (const row of channelRows) {
          const arr = (row as any)[field];
          if (!Array.isArray(arr)) continue;
          for (const item of arr) {
            const key = item.id ?? item.name ?? item.rtbSiteURL ?? item.audName ?? JSON.stringify(item);
            const existing = map.get(key);
            if (existing) {
              existing.nrImps = (existing.nrImps || 0) + (item.nrImps || 0);
              existing.cost = (existing.cost || 0) + (item.cost || 0);
            } else {
              map.set(key, { ...item });
            }
          }
        }
        return Array.from(map.values());
      };

      // Device stats (display only in BT)
      setDisplayDevices(mergeJsonbArrays(displayRows, 'device_stats'));

      // Audience stats
      setDisplayAudience(mergeJsonbArrays(displayRows, 'audience_stats'));
      setPdoohAudience(mergeJsonbArrays(pdoohRows, 'audience_stats'));

      // Geo stats
      setDisplayGeo(mergeJsonbArrays(displayRows, 'geo_stats'));
      setPdoohGeo(mergeJsonbArrays(pdoohRows, 'geo_stats'));

      // Geo city stats (stored inside geo_stats as cities in campaign_analytics)
      setDisplayGeoCities([]);
      setPdoohGeoCities([]);

      // Site stats
      setDisplaySites(mergeJsonbArrays(displayRows, 'site_stats'));
      setPdoohSites(mergeJsonbArrays(pdoohRows, 'site_stats'));

      // Hotspot stats — not stored per-row in campaign_analytics
      setDisplayHotspots([]);
      setPdoohHotspots([]);

      // Daily stats — aggregate from rows grouped by date
      const buildDaily = (channelRows: typeof allRows): DailyStats[] => {
        const map = new Map<string, DailyStats>();
        for (const r of channelRows) {
          const existing = map.get(r.date);
          if (existing) {
            existing.nrImps += r.impressions || 0;
            existing.nrClicks += r.clicks || 0;
            existing.revenue += r.spend || 0;
            existing.cost += r.spend || 0;
          } else {
            map.set(r.date, {
              day: r.date + ' 00:00:00.0',
              nrImps: r.impressions || 0,
              nrClicks: r.clicks || 0,
              CTR: 0,
              activeImps: r.impressions || 0,
              viewableRate: r.viewable_rate || 0,
              engagementRate: r.engagement_rate || 0,
              revenue: r.spend || 0,
              cost: r.spend || 0,
            });
          }
        }
        // Recalculate CTR
        for (const d of map.values()) {
          d.CTR = d.nrImps > 0 ? (d.nrClicks / d.nrImps) * 100 : 0;
        }
        return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
      };

      setDisplayDailyStats(buildDaily(displayRows));
      setPdoohDailyStats(buildDaily(pdoohRows));
      setMetaDailyStats(buildDaily(metaRows));

    } catch (error) {
      console.error('fetchCampaignStats: Error fetching campaign stats', error);
      toast.error('Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  }, [campaignId, selectedMonth]);

  useEffect(() => {
    console.log('useEffect: Fetching campaign stats', { campaignId, selectedMonth });
    fetchCampaignStats();
  }, [fetchCampaignStats, campaignId, selectedMonth]);

  // Fetch creatives for this campaign
  useEffect(() => {
    if (!campaignId) return;
    setCreativesLoading(true);
    supabase
      .from('creatives')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('name')
      .then(({ data }) => {
        setCreatives(data || []);
        setCreativesLoading(false);
      });
  }, [campaignId]);

  const deviceChartData = useMemo(() => (devices: DeviceStats[], channel: string) => {
    const deviceNames: { [key: number]: string } = {
      1: 'Desktop',
      2: 'Mobile',
      3: 'Tablet',
    };
    const data = {
      labels: devices.map(device => {
        // Add null check for deviceType
        const deviceId = device.deviceType?.id;
        return deviceId !== undefined ? (deviceNames[deviceId] || `Device ${deviceId}`) : 'Unknown';
      }),
      datasets: [
        {
          label: `${channel} Clicks`,
          data: devices.map(device => device.nrClicks),
          backgroundColor: channel === 'Display' ? '#A855F7' : '#C084FC',
          borderColor: channel === 'Display' ? '#6B21A8' : '#4C1D95',
          borderWidth: 1,
        },
      ],
    };
    console.log(`deviceChartData: ${channel}`, data);
    return data;
  }, []);

  const devicePieChartData = useMemo(() => (devices: DeviceStats[], channel: string) => {
    const deviceNames: { [key: number]: string } = {
      1: 'Desktop',
      2: 'Mobile',
      3: 'Tablet',
    };
    const data = {
      labels: devices.map(device => {
        // Add null check for deviceType
        const deviceId = device.deviceType?.id;
        return deviceId !== undefined ? (deviceNames[deviceId] || `Device ${deviceId}`) : 'Unknown';
      }),
      datasets: [
        {
          label: `${channel} Impressions`,
          data: devices.map(device => device.nrImps),
          backgroundColor: ['#6B21A8', '#A855F7', '#D8B4FE'], // Deep purple, light purple, very light purple
          borderColor: ['#4C1D95', '#6B21A8', '#A855F7'], // Dark purple, deep purple, light purple
          borderWidth: 1,
        },
      ],
    };
    console.log(`devicePieChartData: ${channel}`, data);
    return data;
  }, []);

  const audienceChartData = useMemo(() => (audience: AudienceStats[], channel: string) => {
    const data = {
      labels: audience.map(item => item.audName),
      datasets: [
        {
          label: `${channel} Uniques`,
          data: audience.map(item => item.nrUniques),
          backgroundColor: channel === 'Display' ? '#A855F7' : '#C084FC', // Light purple and medium purple
          borderColor: channel === 'Display' ? '#6B21A8' : '#4C1D95', // Deep purple and dark purple
          borderWidth: 1,
        },
        {
          label: `${channel} Click Uniques`,
          data: audience.map(item => item.nrClickUniques),
          backgroundColor: channel === 'Display' ? '#D8B4FE' : '#D8B4FE', // Very light purple
          borderColor: channel === 'Display' ? '#A855F7' : '#A855F7', // Light purple
          borderWidth: 1,
        },
      ],
    };
    console.log(`audienceChartData: ${channel}`, data);
    return data;
  }, []);

  const sitesChartData = useMemo(() => (sites: SiteStats[], channel: string) => {
    const topSites = sites.slice(0, 5); // Top 5 sites by impressions
    const data = {
      labels: topSites.map(site => site.rtbSiteURL),
      datasets: [
        {
          label: `${channel} Impressions`,
          data: topSites.map(site => site.nrImps),
          backgroundColor: channel === 'Display' ? '#A855F7' : '#C084FC', // Light purple and medium purple
          borderColor: channel === 'Display' ? '#6B21A8' : '#4C1D95', // Deep purple and dark purple
          borderWidth: 1,
        },
      ],
    };
    console.log(`sitesChartData: ${channel}`, data);
    return data;
  }, []);

  const hourlyChartData = useMemo(() => (hotspots: HotspotStats[], channel: string) => {
    const hourlyDataImps = Array(24).fill(0).map((_, index) => {
      const hourData = hotspots.filter(h => h.hour === index);
      return hourData.reduce((sum, h) => sum + h.nrImps, 0);
    });
    const hourlyDataClicks = Array(24).fill(0).map((_, index) => {
      const hourData = hotspots.filter(h => h.hour === index);
      return hourData.reduce((sum, h) => sum + h.nrClicks, 0);
    });

    const data = {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [
        {
          label: `${channel} Impressions`,
          data: hourlyDataImps,
          fill: false,
          borderColor: channel === 'Display' ? '#A855F7' : '#C084FC', // Light purple and medium purple
          tension: 0.1,
        },
        {
          label: `${channel} Clicks`,
          data: hourlyDataClicks,
          fill: false,
          borderColor: channel === 'Display' ? '#D8B4FE' : '#D8B4FE', // Very light purple
          tension: 0.1,
        },
      ],
    };
    console.log(`hourlyChartData: ${channel}`, data);
    return data;
  }, []);

  const dailyImpressionsChartData = useMemo(() => (dailyStats: DailyStats[], channel: string) => {
    const data = {
      labels: dailyStats.map(stat => format(parseISO(stat.day.split(' ')[0]), 'yyyy-MM-dd')),
      datasets: [
        {
          label: `${channel} Impressions`,
          data: dailyStats.map(stat => stat.nrImps),
          borderColor: channel === 'Display' ? '#A855F7' : '#C084FC', // Light purple and medium purple
          backgroundColor: channel === 'Display' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(192, 132, 252, 0.2)',
          tension: 0.1,
          fill: true
        },
      ],
    };
    console.log(`dailyImpressionsChartData: ${channel}`, data);
    return data;
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${context.raw.toFixed(2)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Value',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
    },
  };

  if (loading) {
    console.log('CampaignDetails: Rendering loading state');
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-900"></div>
      </div>
    );
  }

  console.log('CampaignDetails: Rendering main content', {
    spendData,
    displayStats,
    pdoohStats,
    displayDevices,
    displayAudience,
    pdoohAudience,
    displayGeo,
    pdoohGeo,
    displayGeoCities,
    pdoohGeoCities,
    displaySites,
    pdoohSites,
    displayHotspots,
    pdoohHotspots,
    displayDailyStats,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 text-purple-600 hover:text-purple-800 flex items-center transition-colors duration-200"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Media Costs
        </button>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-800">{campaign?.name || `Campaign Details: ${campaignId}`}</h1>
          {campaign?.channel_meta && (
            <button
              onClick={async () => {
                setMetaSyncing(true);
                try {
                  const result = await syncMetaAnalytics(campaignId);
                  if (result.success) {
                    toast.success(`Meta synced: ${result.synced_rows || 0} rows`);
                    fetchCampaignStats();
                  } else {
                    toast.error(result.error || 'Meta sync failed');
                  }
                } catch (e: any) {
                  toast.error(e.message || 'Meta sync failed');
                } finally {
                  setMetaSyncing(false);
                }
              }}
              disabled={metaSyncing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {metaSyncing ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              )}
              Sync Meta
            </button>
          )}
        </div>
        {campaign?.creator?.name && (
          <p className="text-sm text-gray-500 mb-2">Luonut: {campaign.creator.name}</p>
        )}

        {/* Campaign Information */}
        {campaign && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Kampanjan tiedot</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
                <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                  campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                  campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                  campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>{campaign.status}</span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Palvelut ({campaignServices.length})</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {campaignServices.map(s => s.name).join(', ') || campaign.service?.name || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Toimipisteet ({campaignBranches.length})</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {campaignBranches.length <= 3
                    ? campaignBranches.map(b => b.name).join(', ') || campaign.branch?.name || '-'
                    : `${campaignBranches.length} toimipistettä`}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Kaupunki</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{campaign.campaign_city || campaign.branch?.city || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Alkaa</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{campaign.campaign_start_date || campaign.start_date || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Päättyy</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{campaign.is_ongoing ? 'Jatkuva' : (campaign.campaign_end_date || campaign.end_date || '-')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Kokonaisbudjetti</p>
                <p className="text-sm font-medium text-gray-900 mt-1">€{Number(campaign.total_budget || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Säde</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{campaign.campaign_radius || 10} km</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Kanavat</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {campaign.channel_meta && <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Meta</span>}
                  {campaign.channel_display && <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">Display</span>}
                  {campaign.channel_pdooh && <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">PDOOH</span>}
                  {campaign.channel_audio && <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Audio</span>}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Budjettijako</p>
                <div className="text-xs text-gray-700 mt-1 space-y-0.5">
                  {campaign.channel_meta && <p>Meta: €{Number(campaign.budget_meta || 0).toFixed(0)}</p>}
                  {campaign.channel_display && <p>Display: €{Number(campaign.budget_display || 0).toFixed(0)}</p>}
                  {campaign.channel_pdooh && <p>PDOOH: €{Number(campaign.budget_pdooh || 0).toFixed(0)}</p>}
                  {campaign.channel_audio && <p>Audio: €{Number(campaign.budget_audio || 0).toFixed(0)}</p>}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Kohderyhmä</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{campaign.target_age_min || 18}–{campaign.target_age_max || 65} v.</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Osoite</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{campaign.campaign_address || '-'}</p>
              </div>
            </div>
            {campaign.headline && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Otsikko</p>
                <p className="text-sm text-gray-900 mt-1">{campaign.headline.replace(/\|/g, ' ')}</p>
              </div>
            )}
            {campaign.landing_url && (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Landing URL</p>
                <a href={campaign.landing_url} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:underline mt-1 block truncate">{campaign.landing_url}</a>
              </div>
            )}

            {/* Per-branch breakdown */}
            {campaignBranches.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Toimipisteet — säde & budjetti</p>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">Toimipiste</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">Kaupunki</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-500">Säde (km)</th>
                        {campaign.channel_meta && <th className="text-right px-3 py-2 font-medium text-gray-500">Meta</th>}
                        {campaign.channel_display && <th className="text-right px-3 py-2 font-medium text-gray-500">Display</th>}
                        {campaign.channel_pdooh && <th className="text-right px-3 py-2 font-medium text-gray-500">PDOOH</th>}
                        {campaign.channel_audio && <th className="text-right px-3 py-2 font-medium text-gray-500">Audio</th>}
                        <th className="text-right px-3 py-2 font-medium text-gray-500">Yhteensä</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {campaignBranches.map(b => {
                        const settings = branchRadiusSettings[b.id];
                        const radius = settings?.radius || campaign.campaign_radius || 10;
                        const enabled = settings?.enabled !== false;
                        const branchCount = campaignBranches.length;
                        const metaPerBranch = Number(campaign.budget_meta || 0) / branchCount;
                        const displayPerBranch = Number(campaign.budget_display || 0) / branchCount;
                        const pdoohPerBranch = Number(campaign.budget_pdooh || 0) / branchCount;
                        const audioPerBranch = Number(campaign.budget_audio || 0) / branchCount;
                        const totalPerBranch = metaPerBranch + displayPerBranch + pdoohPerBranch + audioPerBranch;
                        return (
                          <tr key={b.id} className={!enabled ? 'opacity-40' : 'hover:bg-gray-50'}>
                            <td className="px-3 py-1.5 font-medium text-gray-900">{b.name}{!enabled && ' (pois)'}</td>
                            <td className="px-3 py-1.5 text-gray-600">{b.city}</td>
                            <td className="px-3 py-1.5 text-right text-gray-700">{radius}</td>
                            {campaign.channel_meta && <td className="px-3 py-1.5 text-right text-gray-700">€{metaPerBranch.toFixed(0)}</td>}
                            {campaign.channel_display && <td className="px-3 py-1.5 text-right text-gray-700">€{displayPerBranch.toFixed(0)}</td>}
                            {campaign.channel_pdooh && <td className="px-3 py-1.5 text-right text-gray-700">€{pdoohPerBranch.toFixed(0)}</td>}
                            {campaign.channel_audio && <td className="px-3 py-1.5 text-right text-gray-700">€{audioPerBranch.toFixed(0)}</td>}
                            <td className="px-3 py-1.5 text-right font-medium text-gray-900">€{totalPerBranch.toFixed(0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 font-medium">
                      <tr>
                        <td className="px-3 py-2 text-gray-900" colSpan={3}>Yhteensä</td>
                        {campaign.channel_meta && <td className="px-3 py-2 text-right text-gray-900">€{Number(campaign.budget_meta || 0).toFixed(0)}</td>}
                        {campaign.channel_display && <td className="px-3 py-2 text-right text-gray-900">€{Number(campaign.budget_display || 0).toFixed(0)}</td>}
                        {campaign.channel_pdooh && <td className="px-3 py-2 text-right text-gray-900">€{Number(campaign.budget_pdooh || 0).toFixed(0)}</td>}
                        {campaign.channel_audio && <td className="px-3 py-2 text-right text-gray-900">€{Number(campaign.budget_audio || 0).toFixed(0)}</td>}
                        <td className="px-3 py-2 text-right text-gray-900">€{Number(campaign.total_budget || 0).toFixed(0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-6 rounded-lg shadow-sm border border-blue-100 transform hover:scale-105 transition-transform duration-200">
            <h3 className="text-lg font-medium text-blue-800">Meta Spend</h3>
            <p className="text-2xl font-semibold text-blue-900">
              €{metaStats.length > 0 ? metaStats.reduce((sum, stat) => sum + stat.cost, 0).toFixed(2) : '0.00'}
            </p>
            <p className="text-sm text-blue-700">Impressions: {metaStats.length > 0 ? metaStats.reduce((sum, stat) => sum + stat.nrImps, 0).toLocaleString('fi-FI') : 0}</p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg shadow-sm border border-green-100 transform hover:scale-105 transition-transform duration-200">
            <h3 className="text-lg font-medium text-green-800">Display Spend</h3>
            <p className="text-2xl font-semibold text-green-900">
              €{displayStats.length > 0 ? displayStats.reduce((sum, stat) => sum + stat.cost, 0).toFixed(2) : '0.00'}
            </p>
            <p className="text-sm text-green-700">Impressions: {displayStats.length > 0 ? displayStats.reduce((sum, stat) => sum + stat.nrImps, 0).toLocaleString('fi-FI') : 0}</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-lg shadow-sm border border-purple-100 transform hover:scale-105 transition-transform duration-200">
            <h3 className="text-lg font-medium text-purple-800">PDOOH Spend</h3>
            <p className="text-2xl font-semibold text-purple-900">
              €{pdoohStats.length > 0 ? pdoohStats.reduce((sum, stat) => sum + stat.cost, 0).toFixed(2) : '0.00'}
            </p>
            <p className="text-sm text-purple-700">Impressions: {pdoohStats.length > 0 ? pdoohStats.reduce((sum, stat) => sum + stat.nrImps, 0).toLocaleString('fi-FI') : 0}</p>
          </div>
        </div>

        {/* Month/Year Selector */}
        <div className="mb-6">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs selectedIndex={tabIndex} onSelect={(index) => setTabIndex(index)}>
          <TabList className="flex border-b border-gray-200">
            <Tab className={`px-4 py-2 text-sm font-medium cursor-pointer ${tabIndex === 0 ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>
              Summary
            </Tab>
            <Tab className={`px-4 py-2 text-sm font-medium cursor-pointer ${tabIndex === 1 ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>
              Devices
            </Tab>
            <Tab className={`px-4 py-2 text-sm font-medium cursor-pointer ${tabIndex === 2 ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>
              Audience
            </Tab>
            <Tab className={`px-4 py-2 text-sm font-medium cursor-pointer ${tabIndex === 3 ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>
              Geo
            </Tab>
            <Tab className={`px-4 py-2 text-sm font-medium cursor-pointer ${tabIndex === 4 ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>
              Sites
            </Tab>
            <Tab className={`px-4 py-2 text-sm font-medium cursor-pointer ${tabIndex === 5 ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>
              Hotspots
            </Tab>
            <Tab className={`px-4 py-2 text-sm font-medium cursor-pointer ${tabIndex === 6 ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>
              Creatives ({creatives.length})
            </Tab>
          </TabList>

          {/* Summary Tab */}
          <TabPanel>
            <div className="mt-4 space-y-6">
              {/* Meta Summary */}
              {metaStats.length > 0 && metaStats[0].nrImps > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-100">
                  <h2 className="text-lg font-semibold text-blue-800 mb-4">Meta Ads Summary</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-500">Impressions</p>
                      <p className="text-xl font-semibold text-gray-900">{metaStats.reduce((sum, s) => sum + s.nrImps, 0).toLocaleString('fi-FI')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Clicks</p>
                      <p className="text-xl font-semibold text-gray-900">{metaStats.reduce((sum, s) => sum + s.nrClicks, 0).toLocaleString('fi-FI')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Spend</p>
                      <p className="text-xl font-semibold text-gray-900">€{metaStats.reduce((sum, s) => sum + s.cost, 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">CTR</p>
                      <p className="text-xl font-semibold text-gray-900">{(metaStats.reduce((sum, s) => sum + s.CTR, 0) / metaStats.length).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">CPM</p>
                      <p className="text-xl font-semibold text-gray-900">
                        €{(() => { const imps = metaStats.reduce((s, st) => s + st.nrImps, 0); const cost = metaStats.reduce((s, st) => s + st.cost, 0); return imps > 0 ? (cost / imps * 1000).toFixed(2) : '0.00'; })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">CPC</p>
                      <p className="text-xl font-semibold text-gray-900">
                        €{(() => { const clicks = metaStats.reduce((s, st) => s + st.nrClicks, 0); const cost = metaStats.reduce((s, st) => s + st.cost, 0); return clicks > 0 ? (cost / clicks).toFixed(2) : '0.00'; })()}
                      </p>
                    </div>
                    {metaAudienceData && metaAudienceData.reach > 0 && (
                      <div>
                        <p className="text-sm text-gray-500">Reach</p>
                        <p className="text-xl font-semibold text-gray-900">{metaAudienceData.reach.toLocaleString('fi-FI')}</p>
                      </div>
                    )}
                    {metaAudienceData && metaAudienceData.frequency > 0 && (
                      <div>
                        <p className="text-sm text-gray-500">Frequency</p>
                        <p className="text-xl font-semibold text-gray-900">{metaAudienceData.frequency.toFixed(2)}</p>
                      </div>
                    )}
                    {metaAudienceData && metaAudienceData.link_clicks > 0 && (
                      <div>
                        <p className="text-sm text-gray-500">Link Clicks</p>
                        <p className="text-xl font-semibold text-gray-900">{metaAudienceData.link_clicks.toLocaleString('fi-FI')}</p>
                      </div>
                    )}
                    {metaAudienceData && metaAudienceData.landing_page_views > 0 && (
                      <div>
                        <p className="text-sm text-gray-500">Landing Page Views</p>
                        <p className="text-xl font-semibold text-gray-900">{metaAudienceData.landing_page_views.toLocaleString('fi-FI')}</p>
                      </div>
                    )}
                    {metaVideoViews > 0 && (
                      <div>
                        <p className="text-sm text-gray-500">Video Views</p>
                        <p className="text-xl font-semibold text-gray-900">{metaVideoViews.toLocaleString('fi-FI')}</p>
                      </div>
                    )}
                  </div>
                  <div className="h-64">
                    <Line
                      data={dailyImpressionsChartData(metaDailyStats, 'Meta')}
                      options={chartOptions}
                    />
                  </div>
                </div>
              ) : campaign?.channel_meta ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-100">
                  <h2 className="text-lg font-semibold text-blue-800 mb-4">Meta Ads Summary</h2>
                  <p className="text-sm text-gray-500">No Meta data available for the selected period. Try syncing using the button above.</p>
                </div>
              ) : null}

              {displayStats.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Summary</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-500">Total Impressions</p>
                      <p className="text-xl font-semibold text-gray-900">{displayStats.reduce((sum, stat) => sum + stat.nrImps, 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Clicks</p>
                      <p className="text-xl font-semibold text-gray-900">{displayStats.reduce((sum, stat) => sum + stat.nrClicks, 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Average CTR</p>
                      <p className="text-xl font-semibold text-gray-900">{(displayStats.reduce((sum, stat) => sum + stat.CTR, 0) / displayStats.length).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Cost</p>
                      <p className="text-xl font-semibold text-gray-900">€{displayStats.reduce((sum, stat) => sum + stat.cost, 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <Line
                      data={dailyImpressionsChartData(displayDailyStats, 'Display')}
                      options={chartOptions}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Summary</h2>
                  <p className="text-sm text-gray-500">No data available for Display channel.</p>
                </div>
              )}
              {pdoohStats.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Summary</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-500">Total Impressions</p>
                      <p className="text-xl font-semibold text-gray-900">{pdoohStats.reduce((sum, stat) => sum + stat.nrImps, 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Average CTR</p>
                      <p className="text-xl font-semibold text-gray-900">{(pdoohStats.reduce((sum, stat) => sum + stat.CTR, 0) / pdoohStats.length).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Cost</p>
                      <p className="text-xl font-semibold text-gray-900">€{pdoohStats.reduce((sum, stat) => sum + stat.cost, 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <Line
                      data={dailyImpressionsChartData(pdoohDailyStats, 'PDOOH')}
                      options={chartOptions}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Summary</h2>
                  <p className="text-sm text-gray-500">No data available for PDOOH channel in the selected period.</p>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Devices Tab - Removed PDOOH Devices section */}
          <TabPanel>
            <div className="mt-4 space-y-6">
              {displayDevices.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Devices</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-64">
                      <Pie data={devicePieChartData(displayDevices, 'Display')} options={chartOptions} />
                    </div>
                    <div className="h-64">
                      <Bar data={deviceChartData(displayDevices, 'Display')} options={chartOptions} />
                    </div>
                  </div>
                  <div className="overflow-x-auto mt-6">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {displayDevices.map((device, index) => {
                          const deviceNames: { [key: number]: string } = {
                            1: 'Desktop',
                            2: 'Mobile',
                            3: 'Tablet',
                          };
                          return (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {device.deviceType?.id !== undefined 
                                  ? (deviceNames[device.deviceType.id] || `Device ${device.deviceType.id}`) 
                                  : 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{device.nrImps}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{device.nrClicks}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Devices</h2>
                  <p className="text-sm text-gray-500">No device data available for Display channel.</p>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Audience Tab */}
          <TabPanel>
            <div className="mt-4 space-y-6">
              {displayAudience.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Audience</h2>
                  <div className="h-64 mb-6">
                    <Bar data={audienceChartData(displayAudience, 'Display')} options={chartOptions} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Audience Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uniques</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Click Uniques</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match Index Imps</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {displayAudience.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.audName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.nrUniques}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.nrClickUniques}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.matchIndexImps.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Audience</h2>
                  <p className="text-sm text-gray-500">No audience data available for Display channel.</p>
                </div>
              )}
              {pdoohAudience.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Audience</h2>
                  <div className="h-64 mb-6">
                    <Bar data={audienceChartData(pdoohAudience, 'PDOOH')} options={chartOptions} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Audience Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uniques</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Click Uniques</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match Index Imps</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pdoohAudience.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.audName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.nrUniques}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.nrClickUniques}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.matchIndexImps.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Audience</h2>
                  <p className="text-sm text-gray-500">No audience data available for PDOOH channel.</p>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Geo Tab */}
          <TabPanel>
            <div className="mt-4 space-y-6">
              {displayGeoCities.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Geo</h2>
                  <div className="flex space-x-6">
                    <div className="w-2/3 h-96">
                      <MapContainer
                        center={[displayGeoCities[0].latitude, displayGeoCities[0].longitude]}
                        zoom={6}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        {displayGeoCities.map((geo, index) => (
                          <Marker key={index} position={[geo.latitude, geo.longitude]}>
                            <Popup>
                              <div>
                                <h3 className="font-semibold">{geo.cityName}</h3>
                                <p>Region: {geo.regionName}</p>
                                <p>Quota: {geo.quota.toFixed(2)}</p>
                                <p>CTR: {geo.ctr ? geo.ctr.toFixed(2) : 'N/A'}%</p>
                                <p>Quota Click: {geo.quotaClick ? geo.quotaClick.toFixed(2) : 'N/A'}</p>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                    </div>
                    <div className="w-1/3">
                      <h3 className="text-md font-semibold text-gray-800 mb-2">Geo Details</h3>
                      <div className="space-y-4">
                        {displayGeoCities.map((geo, index) => (
                          <div key={index} className="p-4 bg-gray-100 rounded-lg shadow-sm">
                            <h4 className="font-semibold text-gray-700">{geo.cityName}</h4>
                            <p className="text-sm text-gray-500">Region: {geo.regionName}</p>
                            <p className="text-sm text-gray-500">Quota: {geo.quota.toFixed(2)}</p>
                            <p className="text-sm text-gray-500">CTR: {geo.ctr ? geo.ctr.toFixed(2) : 'N/A'}%</p>
                            <p className="text-sm text-gray-500">Quota Click: {geo.quotaClick ? geo.quotaClick.toFixed(2) : 'N/A'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Geo</h2>
                  <p className="text-sm text-gray-500">No geo data available for Display channel.</p>
                </div>
              )}
              {pdoohGeoCities.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Geo</h2>
                  <div className="flex space-x-6">
                    <div className="w-2/3 h-96">
                      <MapContainer
                        center={[pdoohGeoCities[0].latitude, pdoohGeoCities[0].longitude]}
                        zoom={6}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        {pdoohGeoCities.map((geo, index) => (
                          <Marker key={index} position={[geo.latitude, geo.longitude]}>
                            <Popup>
                              <div>
                                <h3 className="font-semibold">{geo.cityName}</h3>
                                <p>Region: {geo.regionName}</p>
                                <p>Quota: {geo.quota.toFixed(2)}</p>
                                <p>CTR: {geo.ctr ? geo.ctr.toFixed(2) : 'N/A'}%</p>
                                <p>Quota Click: {geo.quotaClick ? geo.quotaClick.toFixed(2) : 'N/A'}</p>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                    </div>
                    <div className="w-1/3">
                      <h3 className="text-md font-semibold text-gray-800 mb-2">Geo Details</h3>
                      <div className="space-y-4">
                        {pdoohGeoCities.map((geo, index) => (
                          <div key={index} className="p-4 bg-gray-100 rounded-lg shadow-sm">
                            <h4 className="font-semibold text-gray-700">{geo.cityName}</h4>
                            <p className="text-sm text-gray-500">Region: {geo.regionName}</p>
                            <p className="text-sm text-gray-500">Quota: {geo.quota.toFixed(2)}</p>
                            <p className="text-sm text-gray-500">CTR: {geo.ctr ? geo.ctr.toFixed(2) : 'N/A'}%</p>
                            <p className="text-sm text-gray-500">Quota Click: {geo.quotaClick ? geo.quotaClick.toFixed(2) : 'N/A'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Geo</h2>
                  <p className="text-sm text-gray-500">No geo data available for PDOOH channel.</p>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Sites Tab */}
          <TabPanel>
            <div className="mt-4 space-y-6">
              {displaySites.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Sites</h2>
                  <div className="h-64 mb-6">
                    <Bar data={sitesChartData(displaySites, 'Display')} options={chartOptions} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site URL</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Viewable Rate</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {displaySites.map((site, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{site.rtbSiteURL}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{site.nrImps}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{site.cost.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{site.revenue.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{site.viewableRate.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Sites</h2>
                  <p className="text-sm text-gray-500">No site data available for Display channel.</p>
                </div>
              )}
              {pdoohSites.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Sites</h2>
                  <div className="h-64 mb-6">
                    <Bar data={sitesChartData(pdoohSites, 'PDOOH')} options={chartOptions} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site URL</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Viewable Rate</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pdoohSites.map((site, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{site.rtbSiteURL}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{site.nrImps}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{site.cost.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{site.revenue.toFixed(2)}</td>
<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  {site.viewableRate != null ? `${site.viewableRate.toFixed(2)}%` : 'N/A'}
</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Sites</h2>
                  <p className="text-sm text-gray-500">No site data available for PDOOH channel.</p>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Hotspots Tab */}
          <TabPanel>
            <div className="mt-4 space-y-6">
              {displayHotspots.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Hourly Impressions</h2>
                  <div className="h-64">
                    <Line data={hourlyChartData(displayHotspots, 'Display')} options={chartOptions} />
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Hourly Impressions</h2>
                  <p className="text-sm text-gray-500">No hourly data available for Display channel.</p>
                </div>
              )}
              {pdoohHotspots.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Hourly Impressions</h2>
                  <div className="h-64">
                    <Line data={hourlyChartData(pdoohHotspots, 'PDOOH')} options={chartOptions} />
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Hourly Impressions</h2>
                  <p className="text-sm text-gray-500">No hourly data available for PDOOH channel.</p>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Creatives Tab */}
          <TabPanel>
            <div className="mt-4">
              {creativesLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-900"></div>
                </div>
              ) : creatives.length === 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Ei luovia tälle kampanjalle.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group creatives by type/channel */}
                  {['display', 'pdooh', 'meta'].filter(ch => creatives.some(c => (c.type || c.channel) === ch)).map(channel => (
                    <div key={channel} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                      <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        {channel.toUpperCase()} ({creatives.filter(c => (c.type || c.channel) === channel).length})
                      </h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {creatives.filter(c => (c.type || c.channel) === channel).map(creative => {
                          const rawUrl = creative.image_url || creative.preview_url;
                          const proxyUrl = rawUrl ? `/.netlify/functions/serve-creative?url=${encodeURIComponent(rawUrl)}` : '';
                          const w = creative.width || 300;
                          const h = creative.height || 300;
                          const thumbW = 200;
                          const scale = thumbW / w;
                          const thumbH = h * scale;
                          return (
                            <div key={creative.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                              {proxyUrl ? (
                                <a href={proxyUrl} target="_blank" rel="noopener noreferrer" className="block">
                                  <div className="bg-gray-50 overflow-hidden" style={{ width: thumbW, height: Math.min(thumbH, 250) }}>
                                    <iframe
                                      src={proxyUrl}
                                      title={creative.name}
                                      className="pointer-events-none"
                                      sandbox="allow-same-origin"
                                      style={{
                                        width: w,
                                        height: h,
                                        transform: `scale(${scale})`,
                                        transformOrigin: 'top left',
                                        border: 'none',
                                      }}
                                    />
                                  </div>
                                </a>
                              ) : (
                                <div className="bg-gray-100 flex items-center justify-center h-28">
                                  <span className="text-xs text-gray-400">Ei esikatselua</span>
                                </div>
                              )}
                              <div className="p-2">
                                <p className="text-xs font-medium text-gray-900 truncate" title={creative.name}>{creative.name}</p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-gray-500">{creative.size || `${w}x${h}`}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                    creative.status === 'ready' ? 'bg-green-100 text-green-700' :
                                    creative.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>{creative.status}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
};

export default CampaignDetails;